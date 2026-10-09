import { createHmac, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

if (!url || !publishableKey || !secretKey) {
  throw new Error("RLS tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY (see .env.example)");
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  throw new Error(`RLS tests only run against local Supabase, not ${url}`);
}

const noPersist = { auth: { autoRefreshToken: false, persistSession: false } };

export const service = createClient(url, secretKey, noPersist);

export function anon(): SupabaseClient {
  return createClient(url, publishableKey, noPersist);
}

// Throws on error. For writes without .select() the returned value is null and unused.
export function must<R extends { data: unknown; error: { message: string } | null }>(result: R, what = "query"): NonNullable<R["data"]> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as NonNullable<R["data"]>;
}

export async function createUser(label: string): Promise<{ id: string; email: string }> {
  const email = `${label}-${randomUUID().slice(0, 8)}@rls.test`;
  const { data, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return { id: data.user.id, email };
}

// Logs in the same way the app does (email OTP), without sending email or using a password.
export async function signIn(email: string): Promise<SupabaseClient> {
  const link = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Error(`generateLink ${email}: ${link.error.message}`);

  const client = anon();
  const { error } = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
  if (error) throw new Error(`verifyOtp ${email}: ${error.message}`);
  return client;
}

// RFC 6238 TOTP, so tests can reach aal2 like a real admin.
export function totp(base32Secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export async function signInAdmin(email: string): Promise<SupabaseClient> {
  const client = await signIn(email);
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `test-${randomUUID()}` });
  if (enrolled.error) throw new Error(`mfa.enroll: ${enrolled.error.message}`);
  const verified = await client.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: totp(enrolled.data.totp.secret),
  });
  if (verified.error) throw new Error(`mfa.verify: ${verified.error.message}`);
  return client;
}

export type Fixture = Awaited<ReturnType<typeof createFixture>>;

// Two client organisations (A with two users, B with one) plus an admin, each with a project
// and a spread of visible and hidden content.
export async function createFixture() {
  const admin = await createUser("admin");
  const a1 = await createUser("a1");
  const a2 = await createUser("a2");
  const b1 = await createUser("b1");
  must(await service.from("admins").insert({ user_id: admin.id }), "admins");

  const [clientA, clientB] = must(
    await service.from("clients").insert([{ name: "Klient A" }, { name: "Klient B" }]).select("id, name").order("name"),
    "clients",
  );
  must(
    await service.from("client_private").insert([
      { client_id: clientA.id, internal_notes: "hemmelig A" },
      { client_id: clientB.id, internal_notes: "hemmelig B" },
    ]),
    "client_private",
  );
  must(
    await service.from("client_members").insert([
      { client_id: clientA.id, user_id: a1.id },
      { client_id: clientA.id, user_id: a2.id },
      { client_id: clientB.id, user_id: b1.id },
    ]),
    "members",
  );

  const template = must(await service.from("process_templates").select("id").eq("key", "website").single(), "template");
  const projectA = must(
    await service.rpc("create_project_from_template", { p_client_id: clientA.id, p_template_id: template.id, p_name: "Prosjekt A" }),
    "project A",
  ) as string;
  const projectB = must(
    await service.rpc("create_project_from_template", { p_client_id: clientB.id, p_template_id: template.id, p_name: "Prosjekt B" }),
    "project B",
  ) as string;

  const stepsA = must(
    await service.from("project_steps").select("id, title, visible_to_client, type, status").eq("project_id", projectA).order("position"),
    "steps A",
  );
  const visibleStepA = stepsA.find((s) => s.visible_to_client && s.title === "Godta tilbudet")!;
  const hiddenStepA = stepsA.find((s) => !s.visible_to_client)!;
  const formStepA = stepsA.find((s) => s.type === "form" && s.title === "Fyll ut oppstartsskjemaet")!;
  const stepsB = must(await service.from("project_steps").select("id, title").eq("project_id", projectB), "steps B");
  const visibleStepB = stepsB.find((s) => s.title === "Godta tilbudet")!;

  must(
    await service.from("comments").insert([
      { project_id: projectA, step_id: visibleStepA.id, author_id: a1.id, body: "offentlig A" },
      { project_id: projectA, step_id: visibleStepA.id, author_id: admin.id, body: "intern A", internal: true },
      { project_id: projectA, step_id: hiddenStepA.id, author_id: admin.id, body: "på skjult steg A" },
      { project_id: projectB, step_id: visibleStepB.id, author_id: b1.id, body: "offentlig B" },
    ]),
    "comments",
  );

  must(
    await service.from("documents").insert([
      { project_id: projectA, type: "proposal", title: "synlig A", external_url: "https://example.com/a.pdf" },
      { project_id: projectA, type: "other", title: "skjult A", external_url: "https://example.com/a2.pdf", visible_to_client: false },
      { project_id: projectB, type: "proposal", title: "synlig B", external_url: "https://example.com/b.pdf" },
    ]),
    "documents",
  );

  const visiblePathA = `${clientA.id}/${projectA}/${randomUUID()}-logo.png`;
  const hiddenPathA = `${clientA.id}/${projectA}/${randomUUID()}-intern.png`;
  const pathB = `${clientB.id}/${projectB}/${randomUUID()}-logo.png`;
  const png = new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
  for (const path of [visiblePathA, hiddenPathA, pathB]) {
    must(await service.storage.from("project-files").upload(path, png, { contentType: "image/png" }), `upload ${path}`);
  }
  must(
    await service.from("files").insert([
      { client_id: clientA.id, project_id: projectA, storage_path: visiblePathA, name: "logo.png", size_bytes: 8, mime_type: "image/png" },
      { client_id: clientA.id, project_id: projectA, storage_path: hiddenPathA, name: "intern.png", size_bytes: 8, mime_type: "image/png", visible_to_client: false },
      { client_id: clientB.id, project_id: projectB, storage_path: pathB, name: "logo.png", size_bytes: 8, mime_type: "image/png" },
    ]),
    "files",
  );

  const plan = must(await service.from("maintenance_plans").select("id, included_minutes_per_month").limit(1).single(), "plan");
  const agreement = async (clientId: string, projectId: string) =>
    must(
      await service
        .from("maintenance_agreements")
        .insert({ client_id: clientId, project_id: projectId, plan_id: plan.id, start_date: "2020-01-01", status: "active" })
        .select("id")
        .single(),
      "agreement",
    );
  const agreementA = await agreement(clientA.id, projectA);
  const agreementB = await agreement(clientB.id, projectB);

  const logA = must(
    await service.from("maintenance_log").insert({ client_id: clientA.id, project_id: projectA, title: "Oppdateringer" }).select("id").single(),
    "log",
  );
  must(
    await service.from("time_entries").insert({ maintenance_log_id: logA.id, minutes: 25, description: "intern detalj" }),
    "time",
  );

  const crB = must(
    await service
      .from("change_requests")
      .insert({ client_id: clientB.id, project_id: projectB, created_by: b1.id, title: "Endring B" })
      .select("id")
      .single(),
    "change request B",
  );

  const roundA = must(
    await service.from("approval_rounds").insert({ step_id: visibleStepA.id, round: 1 }).select("id").single(),
    "round",
  );
  const approvalA = must(
    await service
      .from("approvals")
      .insert({ step_id: visibleStepA.id, round_id: roundA.id, round: 1, user_id: a1.id, decision: "approved" })
      .select("id")
      .single(),
    "approval",
  );

  return {
    users: { admin, a1, a2, b1 },
    clientA: clientA.id,
    clientB: clientB.id,
    projectA,
    projectB,
    visibleStepA: visibleStepA.id,
    hiddenStepA: hiddenStepA.id,
    formStepA: formStepA.id,
    visibleStepB: visibleStepB.id,
    paths: { visiblePathA, hiddenPathA, pathB },
    agreementA: agreementA.id,
    agreementB: agreementB.id,
    crB: crB.id,
    approvalA: approvalA.id,
    includedMinutes: plan.included_minutes_per_month,
  };
}
