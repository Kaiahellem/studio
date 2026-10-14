// `pnpm db:clean`: removes what the RLS and E2E tests leave in the LOCAL database, keeping real
// and demo data. Test users are recognised by their address (@e2e.test, @rls.test).
//
// Removed: test users (and with them their admin rows, profiles and memberships), every client
// with a test user as member or named "Testbedrift …" (with projects, files, approvals and logs,
// the same way purge_client does), analyses created by test users, instruction versions created
// by test users and not used by a remaining analysis, and the Mailpit inbox.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dbUrl = process.env.LOCAL_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) || !/@(127\.0\.0\.1|localhost):/.test(dbUrl)) {
  console.error(`Only for the local database, not ${url}`);
  process.exit(1);
}

const TEST_USER = `(u.email like '%@e2e.test' or u.email like '%@rls.test')`;
const TEST_CLIENTS = `
  select c.id from public.clients c
  where exists (select 1 from public.client_members m join auth.users u on u.id = m.user_id where m.client_id = c.id and ${TEST_USER})
     or (c.name like 'Testbedrift %' and not exists (select 1 from public.client_members m where m.client_id = c.id))`;

// Through stdin, so every statement's output is printed (with -c only the last one is).
const psql = (sql: string) => execFileSync("psql", [dbUrl, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8" }).trim();

// 1. Files first, through the Storage API so they leave the disk too: those of test clients, and
// any left behind by earlier runs whose client no longer exists (paths start with the client id).
const paths = psql(`
  select f.storage_path from public.files f where f.client_id in (${TEST_CLIENTS})
  union
  select d.storage_path from public.documents d join public.projects p on p.id = d.project_id
  where p.client_id in (${TEST_CLIENTS}) and d.storage_path is not null
  union
  select o.name from storage.objects o
  where o.bucket_id = 'project-files' and not exists (select 1 from public.clients c where c.id::text = split_part(o.name, '/', 1))`)
  .split("\n")
  .filter(Boolean);
const storage = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } }).storage.from("project-files");
for (let i = 0; i < paths.length; i += 500) {
  const { error } = await storage.remove(paths.slice(i, i + 500));
  if (error) throw error;
}

// 2. Everything else in one transaction. app.purge_client lets the append-only triggers allow
// the deletes, exactly as purge_client does.
const summary = psql(`
begin;
select set_config('app.purge_client', 'clean-test-data', true);
create temp table gone_clients on commit drop as ${TEST_CLIENTS};
create temp table gone_users on commit drop as select u.id, u.email from auth.users u where ${TEST_USER};

delete from public.approvals a using public.project_steps s, public.projects p
  where a.step_id = s.id and s.project_id = p.id and p.client_id in (select id from gone_clients);
delete from public.activity_log where client_id in (select id from gone_clients);
delete from public.email_log where recipient in (select email from gone_users);
delete from public.clients where id in (select id from gone_clients);

delete from public.site_analyses a where a.created_by in (select id from gone_users);
delete from public.prompt_templates p where p.created_by in (select id from gone_users)
  and not exists (select 1 from public.analysis_runs r where r.prompt_version_id = p.id);

delete from auth.users where id in (select id from gone_users);
select (select count(*) from gone_clients) || ' kunder, ' || (select count(*) from gone_users) || ' brukere';
commit;`)
  .split("\n")
  .find((l) => l.includes("kunder,"))!;

await fetch("http://127.0.0.1:54324/api/v1/messages", { method: "DELETE" }).catch(() => undefined);
console.log(`Slettet testdata: ${summary}, ${paths.length} filer. Mailpit er tømt.`);
