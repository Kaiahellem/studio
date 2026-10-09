// Proves the isolation rules in docs/PLAN.md §3. Runs against local Supabase:
//   pnpm db:start && pnpm test:rls
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { anon, createFixture, must, service, signIn, signInAdmin, type Fixture } from "./helpers";

let f: Fixture;
let a1: SupabaseClient;
let a2: SupabaseClient;
let adminAal1: SupabaseClient;
let admin: SupabaseClient;

beforeAll(async () => {
  f = await createFixture();
  [a1, a2, adminAal1] = await Promise.all([
    signIn(f.users.a1.email),
    signIn(f.users.a2.email),
    signIn(f.users.admin.email),
  ]);
  admin = await signInAdmin(f.users.admin.email);
});

// Same token with the last character changed.
const almost = (token: string) => token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");

async function ids(client: SupabaseClient, table: string, column = "id"): Promise<string[]> {
  const rows = must(await client.from(table).select(column), table) as unknown as Record<string, string>[];
  return rows.map((r) => r[column]);
}

describe("client A cannot see client B", () => {
  it.each([
    ["clients", "id", () => f.clientB],
    ["projects", "id", () => f.projectB],
    ["project_steps", "id", () => f.visibleStepB],
    ["maintenance_agreements", "id", () => f.agreementB],
    ["change_requests", "id", () => f.crB],
  ])("%s", async (table, column, other) => {
    expect(await ids(a1, table, column)).not.toContain(other());
  });

  it("sees only own clients, projects and memberships", async () => {
    expect(await ids(a1, "clients")).toEqual([f.clientA]);
    expect(await ids(a1, "projects")).toEqual([f.projectA]);
    const members = must(await a1.from("client_members").select("client_id"));
    expect(new Set(members.map((m) => m.client_id))).toEqual(new Set([f.clientA]));
  });

  it("phases, comments, documents, files and site details", async () => {
    const phases = must(await a1.from("project_phases").select("project_id"));
    expect(phases.every((p) => p.project_id === f.projectA)).toBe(true);

    const comments = must(await a1.from("comments").select("body"));
    expect(comments.map((c) => c.body)).not.toContain("offentlig B");

    const documents = must(await a1.from("documents").select("title"));
    expect(documents.map((d) => d.title)).not.toContain("synlig B");

    const files = must(await a1.from("files").select("project_id"));
    expect(files.every((x) => x.project_id === f.projectA)).toBe(true);

    expect(await ids(a1, "site_details", "project_id")).toEqual([f.projectA]);
  });

  it("storage objects", async () => {
    const own = await a1.storage.from("project-files").download(f.paths.visiblePathA);
    expect(own.error).toBeNull();

    const other = await a1.storage.from("project-files").download(f.paths.pathB);
    expect(other.data).toBeNull();
    expect(other.error).not.toBeNull();
  });

  it("cannot upload into another client's folder", async () => {
    const blob = new Blob(["x"], { type: "text/plain" });
    const { error } = await a1.storage.from("project-files").upload(`${f.clientB}/${f.projectB}/inntrenger.txt`, blob);
    expect(error).not.toBeNull();

    // Own client id with someone else's project is rejected too.
    const mixed = await a1.storage.from("project-files").upload(`${f.clientA}/${f.projectB}/inntrenger.txt`, blob);
    expect(mixed.error).not.toBeNull();
  });

  it("cannot create a change request for another client", async () => {
    const { error } = await a1
      .from("change_requests")
      .insert({ client_id: f.clientB, project_id: f.projectB, created_by: f.users.a1.id, title: "Feil klient" });
    expect(error).not.toBeNull();
  });

  it("cannot comment on another client's step", async () => {
    const { error } = await a1
      .from("comments")
      .insert({ project_id: f.projectB, step_id: f.visibleStepB, author_id: f.users.a1.id, body: "hei" });
    expect(error).not.toBeNull();
  });

  it("cannot read hours for another client's agreement", async () => {
    const usage = must(await a1.rpc("agreement_usage", { p_agreement_id: f.agreementB }));
    expect(usage).toEqual([]);
  });
});

describe("hidden and internal content", () => {
  it("hides studio-only steps", async () => {
    const steps = must(await a1.from("project_steps").select("id, visible_to_client").eq("project_id", f.projectA));
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((s) => s.visible_to_client)).toBe(true);
    expect(steps.map((s) => s.id)).not.toContain(f.hiddenStepA);
  });

  it("hides internal comments and comments on hidden steps", async () => {
    const bodies = must(await a1.from("comments").select("body")).map((c) => c.body);
    expect(bodies).toContain("offentlig A");
    expect(bodies).not.toContain("intern A");
    expect(bodies).not.toContain("på skjult steg A");
  });

  it("hides documents and files not marked visible", async () => {
    const titles = must(await a1.from("documents").select("title")).map((d) => d.title);
    expect(titles).toEqual(["synlig A"]);

    const names = must(await a1.from("files").select("name")).map((x) => x.name);
    expect(names).toEqual(["logo.png"]);

    const hidden = await a1.storage.from("project-files").download(f.paths.hiddenPathA);
    expect(hidden.data).toBeNull();
  });

  it.each(["client_private", "time_entries", "activity_log", "admins", "email_log", "app_settings", "process_templates", "template_steps"])(
    "cannot read %s",
    async (table) => {
      const { data, error } = await a1.from(table).select("*");
      // Either an empty result (RLS) or a permission error; never rows.
      expect(error ? [] : data).toEqual([]);
    },
  );

  it("sees hour totals for own agreement, not the entries", async () => {
    const usage = must(await a1.rpc("agreement_usage", { p_agreement_id: f.agreementA }));
    expect(usage).toHaveLength(1);
    expect(usage[0].used_minutes).toBe(25);
    expect(usage[0].included_minutes).toBe(f.includedMinutes);
  });

  it("cannot post an internal comment", async () => {
    const { error } = await a1
      .from("comments")
      .insert({ project_id: f.projectA, step_id: f.visibleStepA, author_id: f.users.a1.id, body: "x", internal: true });
    expect(error).not.toBeNull();
  });

  it("cannot comment on a hidden step", async () => {
    const { error } = await a1
      .from("comments")
      .insert({ project_id: f.projectA, step_id: f.hiddenStepA, author_id: f.users.a1.id, body: "x" });
    expect(error).not.toBeNull();
  });

  it("cannot comment as someone else", async () => {
    const { error } = await a1
      .from("comments")
      .insert({ project_id: f.projectA, step_id: f.visibleStepA, author_id: f.users.a2.id, body: "x" });
    expect(error).not.toBeNull();
  });

  it("can post a normal comment, visible to a co-member", async () => {
    must(
      await a1.from("comments").insert({ project_id: f.projectA, step_id: f.visibleStepA, author_id: f.users.a1.id, body: "fra a1" }),
    );
    const bodies = must(await a2.from("comments").select("body")).map((c) => c.body);
    expect(bodies).toContain("fra a1");
  });
});

describe("client writes are narrow", () => {
  it("cannot update steps, projects or documents directly", async () => {
    const step = await a1.from("project_steps").update({ status: "done" }).eq("id", f.visibleStepA).select();
    expect(step.data ?? []).toEqual([]);

    const project = await a1.from("projects").update({ name: "kapret" }).eq("id", f.projectA).select();
    expect(project.data ?? []).toEqual([]);

    const unchanged = must(await service.from("project_steps").select("status").eq("id", f.visibleStepA).single());
    expect(unchanged.status).toBe("active");
  });

  it("change requests from clients get studio fields set by the database", async () => {
    const created = must(
      await a1
        .from("change_requests")
        .insert({ client_id: f.clientA, project_id: f.projectA, created_by: f.users.a1.id, title: "Ny tekst", billing: "extra" })
        .select("status, billing, estimate_minutes")
        .single(),
    );
    // Client A has an active agreement, so the default is `included`, regardless of what was sent.
    expect(created).toEqual({ status: "new", billing: "included", estimate_minutes: null });
  });

  it("cannot write a form draft on a step that is not active", async () => {
    const { error } = await a1.from("form_responses").insert({ step_id: f.formStepA, answers: { a: 1 } });
    expect(error).not.toBeNull();
  });

  it("can save a form draft on an active step, but not submit it directly", async () => {
    must(await service.from("project_steps").update({ status: "active" }).eq("id", f.formStepA));
    must(await a1.from("form_responses").insert({ step_id: f.formStepA, answers: { what_you_do: "rør" } }));

    const submit = await a1
      .from("form_responses")
      .update({ status: "submitted" })
      .eq("step_id", f.formStepA)
      .select();
    expect(submit.error !== null || (submit.data ?? []).length === 0).toBe(true);

    const row = must(await service.from("form_responses").select("status").eq("step_id", f.formStepA).single());
    expect(row.status).toBe("draft");
  });
});

describe("approvals and activity log are append-only", () => {
  it("clients cannot change or delete approvals", async () => {
    await a1.from("approvals").update({ decision: "changes_requested" }).eq("id", f.approvalA);
    await a1.from("approvals").delete().eq("id", f.approvalA);
    const row = must(await service.from("approvals").select("decision").eq("id", f.approvalA).single());
    expect(row.decision).toBe("approved");
  });

  it("not even the service role can change an approval", async () => {
    const update = await service.from("approvals").update({ decision: "changes_requested" }).eq("id", f.approvalA);
    expect(update.error).not.toBeNull();
    const del = await service.from("approvals").delete().eq("id", f.approvalA);
    expect(del.error).not.toBeNull();
  });

  it("activity log rows cannot be changed", async () => {
    const row = must(await service.from("activity_log").select("id").eq("project_id", f.projectA).limit(1).single());
    const update = await service.from("activity_log").update({ event: "x" }).eq("id", row.id);
    expect(update.error).not.toBeNull();
  });
});

describe("admin", () => {
  it("with TOTP (aal2) sees everything", async () => {
    const clients = await ids(admin, "clients");
    expect(clients).toEqual(expect.arrayContaining([f.clientA, f.clientB]));
    const notes = must(await admin.from("client_private").select("internal_notes").eq("client_id", f.clientA).single());
    expect(notes.internal_notes).toBe("hemmelig A");
    const comments = must(await admin.from("comments").select("body").eq("project_id", f.projectA)).map((c) => c.body);
    expect(comments).toContain("intern A");
  });

  it("without TOTP (aal1) gets no admin access", async () => {
    expect(await ids(adminAal1, "clients")).toEqual([]);
    expect(await ids(adminAal1, "client_private", "client_id")).toEqual([]);
    const create = await adminAal1.from("clients").insert({ name: "skal ikke gå" });
    expect(create.error).not.toBeNull();
  });

  it("is_admin_account answers for the caller only", async () => {
    expect(must(await adminAal1.rpc("is_admin_account"))).toBe(true);
    expect(must(await a1.rpc("is_admin_account"))).toBe(false);
  });
});

describe("anonymous and public handover", () => {
  it("anon gets nothing from any table", async () => {
    const client = anon();
    for (const table of ["clients", "projects", "project_steps", "comments", "documents", "files", "change_requests"] as const) {
      const { data, error } = await client.from(table).select("*");
      expect(error ? [] : data).toEqual([]);
    }
  });

  it("public handover needs an enabled, published page and the exact token", async () => {
    const page = must(
      await service.from("handover_pages").insert({ project_id: f.projectA }).select("id, public_token").single(),
    );
    const client = anon();

    expect(must(await client.rpc("get_public_handover", { p_token: page.public_token }))).toBeNull();

    must(await service.from("handover_pages").update({ public_enabled: true, published_at: new Date().toISOString() }).eq("id", page.id));
    const result = must(await client.rpc("get_public_handover", { p_token: page.public_token })) as { project: { name: string } };
    expect(result.project.name).toBe("Prosjekt A");

    expect(must(await client.rpc("get_public_handover", { p_token: almost(page.public_token) }))).toBeNull();
    expect(must(await client.rpc("get_public_handover", { p_token: "kort" }))).toBeNull();

    must(await service.from("handover_pages").update({ public_enabled: false }).eq("id", page.id));
    expect(must(await client.rpc("get_public_handover", { p_token: page.public_token }))).toBeNull();
  });
});
