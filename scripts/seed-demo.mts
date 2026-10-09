// Demo data for local development (docs/PLAN.md §8). Never run against production.
//
//   pnpm db:reset && pnpm seed
//
// Creates: you as admin (SEED_ADMIN_EMAIL), demo client "Fjordlys Rør AS" with two users and a
// project in the Content phase, and a second client "Nordvik Regnskap AS" to show isolation.
// Log in at http://localhost:3000/logg-inn; the email arrives in Mailpit (http://127.0.0.1:54324).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;

if (!url || !secretKey || !adminEmail) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY or SEED_ADMIN_EMAIL in .env.local");
  process.exit(1);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error(`Refusing to seed demo data into a non-local database: ${url}`);
  process.exit(1);
}

const db = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Throws on error. For writes without .select() the returned value is null and unused.
function check<R extends { data: unknown; error: { message: string } | null }>(result: R, what: string): NonNullable<R["data"]> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as NonNullable<R["data"]>;
}

async function ensureUser(email: string, fullName: string): Promise<string> {
  const created = await db.auth.admin.createUser({ email, email_confirm: true });
  let id = created.data.user?.id;
  if (!id) {
    for (let page = 1; !id; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(`listUsers: ${error.message}`);
      id = data.users.find((u) => u.email === email)?.id;
      if (data.users.length < 200) break;
    }
  }
  if (!id) throw new Error(`Could not create or find user ${email}`);
  check(await db.from("profiles").upsert({ user_id: id, full_name: fullName }), "profile");
  return id;
}

async function stepId(projectId: string, title: string): Promise<string> {
  const row = check(
    await db.from("project_steps").select("id").eq("project_id", projectId).eq("title", title).single(),
    `step ${title}`,
  );
  return row.id;
}

async function completeStep(projectId: string, title: string) {
  check(await db.rpc("complete_step", { p_step_id: await stepId(projectId, title) }), `complete ${title}`);
}

async function main() {
  const existing = check(await db.from("clients").select("id").eq("name", "Fjordlys Rør AS"), "clients");
  if (existing.length > 0) {
    console.log("Demo data already present. Run `pnpm db:reset` first for a clean slate.");
    return;
  }

  const adminId = await ensureUser(adminEmail!, "Studio");
  check(await db.from("admins").upsert({ user_id: adminId }), "admin");

  const ola = await ensureUser("ola@fjordlys.example", "Ola Fjordlys");
  const kari = await ensureUser("kari@fjordlys.example", "Kari Fjordlys");
  const nina = await ensureUser("nina@nordvik.example", "Nina Nordvik");

  const fjordlys = check(
    await db
      .from("clients")
      .insert({
        name: "Fjordlys Rør AS",
        org_number: "999 999 999",
        contact_email: "post@fjordlys.example",
        contact_phone: "+47 400 00 000",
        address: "Strandgata 1, 5013 Bergen",
      })
      .select("id")
      .single(),
    "client Fjordlys",
  ).id;
  check(await db.from("client_private").insert({ client_id: fjordlys, internal_notes: "Kom via anbefaling. Ønsker lansering før vårsesongen." }), "notes");

  const nordvik = check(
    await db.from("clients").insert({ name: "Nordvik Regnskap AS", contact_email: "post@nordvik.example" }).select("id").single(),
    "client Nordvik",
  ).id;

  check(
    await db.from("client_members").insert([
      { client_id: fjordlys, user_id: ola },
      { client_id: fjordlys, user_id: kari },
      { client_id: nordvik, user_id: nina },
    ], { defaultToNull: false }),
    "members",
  );

  const template = check(await db.from("process_templates").select("id").eq("key", "website").single(), "template");

  const project = check(
    await db.rpc("create_project_from_template", {
      p_client_id: fjordlys,
      p_template_id: template.id,
      p_name: "Ny nettside",
      p_start_date: "2026-09-21",
      p_target_launch_date: "2027-02-15",
    }),
    "project Fjordlys",
  ) as string;

  check(
    await db.rpc("create_project_from_template", {
      p_client_id: nordvik,
      p_template_id: template.id,
      p_name: "Nettside",
      p_start_date: "2026-10-05",
    }),
    "project Nordvik",
  );

  check(
    await db.from("projects").update({ staging_url: "https://fjordlys-staging.vercel.app" }).eq("id", project),
    "staging url",
  );

  // Phase 1: proposal accepted, contract signed, deposit invoiced.
  check(
    await db.from("documents").insert([
      { project_id: project, type: "proposal", title: "Tilbud – ny nettside", external_url: "https://example.com/tilbud.pdf", status: "accepted", document_date: "2026-09-14" },
      { project_id: project, type: "contract", title: "Avtale om utvikling av nettside", external_url: "https://example.com/avtale.pdf", status: "signed", document_date: "2026-09-18" },
      { project_id: project, type: "invoice", title: "Faktura – depositum", external_url: "https://example.com/faktura-1.pdf", status: "paid", document_date: "2026-09-19" },
    ], { defaultToNull: false }),
    "documents",
  );

  const acceptStep = await stepId(project, "Godta tilbudet");
  const round = check(
    await db.from("approval_rounds").insert({ step_id: acceptStep, round: 1, note: "Tilbudet ligger under Dokumenter.", opened_by: adminId }).select("id").single(),
    "round",
  );
  check(
    await db.from("approvals").insert({ step_id: acceptStep, round_id: round.id, round: 1, user_id: ola, decision: "approved", comment: "Ser bra ut!" }),
    "approval",
  );
  await completeStep(project, "Godta tilbudet");
  await completeStep(project, "Signer avtalen");
  await completeStep(project, "Velg vedlikeholdsavtale (valgfritt)");
  await completeStep(project, "Faktura for depositum");

  // Phase 2: kickoff meeting held, questionnaire submitted.
  await completeStep(project, "Oppstartsmøte");
  const kickoffStep = await stepId(project, "Fyll ut oppstartsskjemaet");
  const kickoffDef = check(await db.from("form_definitions").select("schema").eq("key", "kickoff-service-business").single(), "kickoff def");
  check(
    await db.from("form_responses").insert({
      step_id: kickoffStep,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: kari,
      definition_snapshot: kickoffDef.schema,
      answers: {
        what_you_do: "Rørleggertjenester for privatkunder og borettslag i Bergen.",
        how_long: "Siden 2009",
        difference: "Fast pris på de vanligste jobbene, og vi rydder alltid etter oss.",
        services: "Baderom\nVarmepumper\nLekkasjer og akutt\nService på varmtvannsbereder",
        show_prices: "Bare «fra»-priser",
        goals: "Flere forespørsler på baderom, færre telefoner om ting som står på nettsiden.",
      },
    }),
    "kickoff response",
  );
  await completeStep(project, "Fyll ut oppstartsskjemaet");

  // Phase 3 (Content) is now active. One upload done, a public and an internal comment.
  await completeStep(project, "Last opp logo");
  const textsStep = await stepId(project, "Last opp tekster");
  check(
    await db.from("comments").insert([
      { step_id: textsStep, project_id: project, author_id: ola, body: "Er det greit om vi sender tekstene for tjenestene først, og resten neste uke?" },
      { step_id: textsStep, project_id: project, author_id: adminId, body: "Helt greit, vi starter med tjenestesidene." },
      { step_id: textsStep, project_id: project, author_id: adminId, body: "Intern: purre på Om oss-teksten hvis den ikke er kommet innen fredag.", internal: true },
    ], { defaultToNull: false }),
    "comments",
  );

  const plan = check(await db.from("maintenance_plans").select("id").limit(1).single(), "plan");
  check(
    await db.from("maintenance_agreements").insert({ client_id: fjordlys, project_id: project, plan_id: plan.id, start_date: "2027-03-01", status: "proposed" }),
    "agreement",
  );

  console.log("Demo data created.");
  console.log(`  Admin:  ${adminEmail}`);
  console.log("  Client: ola@fjordlys.example, kari@fjordlys.example (Fjordlys Rør AS)");
  console.log("  Client: nina@nordvik.example (Nordvik Regnskap AS)");
  console.log("  Emails: http://127.0.0.1:54324");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
