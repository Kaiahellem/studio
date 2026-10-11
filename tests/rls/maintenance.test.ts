// Change requests, time and the maintenance log (milestone 6).
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createFixture, must, service, signIn, signInAdmin, type Db, type Fixture } from "./helpers";

let f: Fixture;
let a1: Db;
let a2: Db;
let b1: Db;
let admin: Db;
let requestId: string;

beforeAll(async () => {
  f = await createFixture();
  [a1, a2, b1] = await Promise.all([signIn(f.users.a1.email), signIn(f.users.a2.email), signIn(f.users.b1.email)]);
  admin = await signInAdmin(f.users.admin.email);
});

describe("change requests", () => {
  it("a client sends one; their colleague sees it, other clients don't", async () => {
    requestId = must(
      await a1
        .from("change_requests")
        .insert({ client_id: f.clientA, project_id: f.projectA, created_by: f.users.a1.id, title: "Nye åpningstider", urgency: "urgent" })
        .select("id")
        .single(),
    ).id;
    expect(must(await a2.from("change_requests").select("id")).map((r) => r.id)).toContain(requestId);
    expect(must(await b1.from("change_requests").select("id")).map((r) => r.id)).not.toContain(requestId);

    const log = must(await service.from("activity_log").select("event, actor_id").eq("entity_id", requestId));
    expect(log).toEqual([{ event: "change_request.created", actor_id: f.users.a1.id }]);
  });

  it("clients cannot triage their own request", async () => {
    await a1.from("change_requests").update({ status: "done", billing: "included", estimate_minutes: 1 }).eq("id", requestId);
    const row = must(await service.from("change_requests").select("status, estimate_minutes").eq("id", requestId).single());
    expect(row).toEqual({ status: "new", estimate_minutes: null });
  });

  it("status changes set timestamps and are logged", async () => {
    must(await admin.from("change_requests").update({ status: "accepted", billing: "included", estimate_minutes: 60 }).eq("id", requestId));
    must(await admin.from("change_requests").update({ status: "done" }).eq("id", requestId));
    const row = must(await service.from("change_requests").select("accepted_at, done_at").eq("id", requestId).single());
    expect(row.accepted_at).not.toBeNull();
    expect(row.done_at).not.toBeNull();
    const events = must(await service.from("activity_log").select("data").eq("entity_id", requestId).eq("event", "change_request.status").order("id"));
    expect(events.map((e) => (e.data as { to: string }).to)).toEqual(["accepted", "done"]);
    must(await admin.from("change_requests").update({ status: "in_progress" }).eq("id", requestId));
  });

  it("attachments must be in the request folder, for an open request of your own client", async () => {
    const path = `${f.clientA}/${f.projectA}/requests/${randomUUID()}-skjerm.png`;
    must(await a1.storage.from("project-files").upload(path, new Blob([Buffer.from("89504e47", "hex")], { type: "image/png" })));
    const register = (client: Db, p: string) =>
      client.rpc("register_request_upload", { p_change_request_id: requestId, p_storage_path: p, p_name: "skjerm.png", p_size_bytes: 4, p_mime_type: "image/png" });

    expect((await register(b1, path)).error).not.toBeNull();
    expect((await register(a1, f.paths.visiblePathA)).error).not.toBeNull(); // not in requests/
    must(await register(a1, path));
    expect(must(await a2.from("files").select("name").eq("change_request_id", requestId)).map((x) => x.name)).toEqual(["skjerm.png"]);

    must(await admin.from("change_requests").update({ status: "declined" }).eq("id", requestId));
    const again = `${f.clientA}/${f.projectA}/requests/${randomUUID()}-x.png`;
    must(await a1.storage.from("project-files").upload(again, new Blob([Buffer.from("89504e47", "hex")], { type: "image/png" })));
    expect((await register(a1, again)).error).not.toBeNull();
    must(await admin.from("change_requests").update({ status: "in_progress" }).eq("id", requestId));
  });
});

describe("time and hours", () => {
  it("only included work counts against the allowance, and clients see totals only", async () => {
    const before = must(await a1.rpc("agreement_usage", { p_agreement_id: f.agreementA }))[0].used_minutes;

    must(await admin.from("time_entries").insert({ change_request_id: requestId, minutes: 30, description: "intern detalj" }));
    const extra = must(
      await admin.from("change_requests").insert({ client_id: f.clientA, project_id: f.projectA, title: "Ekstra", billing: "extra", status: "accepted" }).select("id").single(),
    );
    must(await admin.from("time_entries").insert({ change_request_id: extra.id, minutes: 120 }));

    const after = must(await a1.rpc("agreement_usage", { p_agreement_id: f.agreementA }))[0].used_minutes;
    expect(after - before).toBe(30);

    expect(must(await a1.from("time_entries").select("*"))).toEqual([]);
    const totals = must(await a1.rpc("change_request_minutes", { p_project_id: f.projectA }));
    expect(totals.find((t) => t.change_request_id === requestId)?.minutes).toBe(30);
    expect(must(await b1.rpc("change_request_minutes", { p_project_id: f.projectA }))).toEqual([]);
  });

  it("the maintenance log is admin-written; hidden entries and their time stay hidden", async () => {
    expect((await a1.rpc("add_maintenance_log", { p_project_id: f.projectA, p_entry_date: "2026-10-01", p_title: "x" })).error).not.toBeNull();

    const visible = must(await admin.rpc("add_maintenance_log", { p_project_id: f.projectA, p_entry_date: "2026-10-02", p_title: "Oppdateringer", p_minutes: 20 }));
    const hidden = must(
      await admin.rpc("add_maintenance_log", { p_project_id: f.projectA, p_entry_date: "2026-10-03", p_title: "Intern feilsøking", p_visible_to_client: false, p_minutes: 40 }),
    );

    const seen = must(await a1.from("maintenance_log").select("id")).map((e) => e.id);
    expect(seen).toContain(visible);
    expect(seen).not.toContain(hidden);

    const minutes = must(await a1.rpc("maintenance_log_minutes", { p_project_id: f.projectA }));
    expect(minutes.map((m) => m.maintenance_log_id)).toContain(visible);
    expect(minutes.map((m) => m.maintenance_log_id)).not.toContain(hidden);
  });
});
