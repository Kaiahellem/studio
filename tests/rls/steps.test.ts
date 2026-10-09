// Client step transitions (milestone 4). Each RPC checks membership, visibility, status and type.
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { advanceTo, createFixture, must, service, signIn, signInAdmin, stepId, type Db, type Fixture } from "./helpers";

let f: Fixture;
let a1: Db;
let a2: Db;
let b1: Db;
let admin: Db;

beforeAll(async () => {
  f = await createFixture();
  [a1, a2, b1] = await Promise.all([signIn(f.users.a1.email), signIn(f.users.a2.email), signIn(f.users.b1.email)]);
  admin = await signInAdmin(f.users.admin.email);
});

const status = async (id: string) => must(await service.from("project_steps").select("status").eq("id", id).single()).status;

describe("completing client steps", () => {
  it("refuses steps the studio completes, and steps owned by the studio", async () => {
    const sign = await stepId(f.projectA, "Signer avtalen");
    await service.from("project_steps").update({ status: "active" }).eq("id", sign);
    expect((await a1.rpc("complete_client_step", { p_step_id: sign })).error).not.toBeNull();

    const deposit = await stepId(f.projectA, "Faktura for depositum");
    await service.from("project_steps").update({ status: "active" }).eq("id", deposit);
    expect((await a1.rpc("complete_client_step", { p_step_id: deposit })).error).not.toBeNull();

    // Reset phase 1 to its normal state for the following tests.
    await service.from("project_steps").update({ status: "pending" }).in("id", [sign, deposit]);
  });
});

describe("forms", () => {
  it("submits the kickoff form only while active, and snapshots the questions", async () => {
    await advanceTo(f.projectA, 2);
    const kickoff = await stepId(f.projectA, "Fyll ut oppstartsskjemaet");
    expect((await a1.rpc("submit_form", { p_step_id: kickoff, p_answers: { what_you_do: "Rør" } })).error).not.toBeNull();

    must(await service.rpc("complete_step", { p_step_id: await stepId(f.projectA, "Oppstartsmøte") }));
    expect(await status(kickoff)).toBe("active");

    expect((await b1.rpc("submit_form", { p_step_id: kickoff, p_answers: { what_you_do: "Inntrenger" } })).error).not.toBeNull();
    must(await a1.rpc("submit_form", { p_step_id: kickoff, p_answers: { what_you_do: "Rør" } }));

    expect(await status(kickoff)).toBe("done");
    const response = must(await service.from("form_responses").select("status, definition_snapshot, submitted_by").eq("step_id", kickoff).single());
    expect(response.status).toBe("submitted");
    expect(response.submitted_by).toBe(f.users.a1.id);
    expect(response.definition_snapshot).toHaveProperty("sections");
  });

  it("the domain form fills site details, ignoring unsafe values", async () => {
    const domain = await stepId(f.projectA, "Domene og tilganger");
    expect(await status(domain)).toBe("active");
    must(
      await a1.rpc("submit_form", {
        p_step_id: domain,
        p_answers: {
          domain_name: "fjordlysror.no",
          registrar: "Domeneshop",
          domain_owner: "client",
          email_provider: "Google Workspace",
          google_business_profile_url: "javascript:alert(1)",
        },
      }),
    );
    const site = must(await service.from("site_details").select("*").eq("project_id", f.projectA).single());
    expect(site).toMatchObject({
      domain_name: "fjordlysror.no",
      registrar: "Domeneshop",
      domain_owner: "client",
      email_provider: "Google Workspace",
      google_business_profile_url: null,
    });
  });
});

describe("uploads", () => {
  const png = () => new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
  let logo: string;
  let path: string;

  beforeAll(async () => {
    logo = await stepId(f.projectA, "Last opp logo");
    path = `${f.clientA}/${f.projectA}/${randomUUID()}-logo.png`;
    must(await a1.storage.from("project-files").upload(path, png(), { contentType: "image/png" }));
  });

  it("registers a file in the client's own project folder", async () => {
    const id = must(
      await a1.rpc("register_upload", { p_step_id: logo, p_storage_path: path, p_name: "logo.png", p_size_bytes: 8, p_mime_type: "image/png" }),
    );
    expect(id).toBeTruthy();
    const names = must(await a2.from("files").select("name").eq("step_id", logo)).map((x) => x.name);
    expect(names).toContain("logo.png");
  });

  it("refuses paths outside the project, missing objects, wrong types and other clients", async () => {
    const register = (client: Db, storagePath: string, mime = "image/png") =>
      client.rpc("register_upload", { p_step_id: logo, p_storage_path: storagePath, p_name: "x.png", p_size_bytes: 8, p_mime_type: mime });

    expect((await register(a1, f.paths.pathB)).error).not.toBeNull();
    expect((await register(a1, `${f.clientA}/${f.projectA}/finnes-ikke.png`)).error).not.toBeNull();
    expect((await register(a1, path, "application/x-msdownload")).error).not.toBeNull();
    expect((await register(b1, path)).error).not.toBeNull();
  });

  it("only the uploader can remove a file, while the step is open", async () => {
    const file = must(await service.from("files").select("id").eq("storage_path", path).single());
    expect((await a2.rpc("remove_own_upload", { p_file_id: file.id })).error).not.toBeNull();
    expect(must(await a1.rpc("remove_own_upload", { p_file_id: file.id }))).toBe(path);
  });

  it("the client marks the upload step done", async () => {
    must(await a1.rpc("complete_client_step", { p_step_id: logo }));
    expect(await status(logo)).toBe("done");
  });
});

describe("approvals with revision rounds", () => {
  let structure: string;

  beforeAll(async () => {
    await advanceTo(f.projectA, 4);
    structure = await stepId(f.projectA, "Godkjenn struktur");
  });

  it("cannot be answered before the studio opens a round", async () => {
    expect((await a1.rpc("submit_approval", { p_step_id: structure, p_decision: "approved" })).error).not.toBeNull();
  });

  it("only the admin opens rounds, one at a time", async () => {
    expect((await a1.rpc("open_approval_round", { p_step_id: structure })).error).not.toBeNull();
    expect(must(await admin.rpc("open_approval_round", { p_step_id: structure, p_note: "Skisser klare" }))).toBe(1);
    expect((await admin.rpc("open_approval_round", { p_step_id: structure })).error).not.toBeNull();
  });

  it("asking for changes needs a comment and keeps the step active", async () => {
    expect((await a1.rpc("submit_approval", { p_step_id: structure, p_decision: "changes_requested" })).error).not.toBeNull();
    expect((await b1.rpc("submit_approval", { p_step_id: structure, p_decision: "approved" })).error).not.toBeNull();

    const result = must(await a1.rpc("submit_approval", { p_step_id: structure, p_decision: "changes_requested", p_comment: "Større logo" }));
    expect(result).toEqual({ round: 1, rounds_used_up: false });
    expect(await status(structure)).toBe("active");
  });

  it("flags when the included rounds are used up", async () => {
    must(await admin.rpc("open_approval_round", { p_step_id: structure }));
    const result = must(await a2.rpc("submit_approval", { p_step_id: structure, p_decision: "changes_requested", p_comment: "Én ting til" }));
    expect(result).toEqual({ round: 2, rounds_used_up: true });
    const events = must(await service.from("activity_log").select("event").eq("entity_id", structure)).map((e) => e.event);
    expect(events).toContain("approval.rounds_used_up");
  });

  it("approving completes the step and starts the next phase", async () => {
    must(await admin.rpc("open_approval_round", { p_step_id: structure }));
    must(await a1.rpc("submit_approval", { p_step_id: structure, p_decision: "approved" }));
    expect(await status(structure)).toBe("done");
    expect(await status(await stepId(f.projectA, "Godkjenn design"))).toBe("active");

    const approvals = must(await service.from("approvals").select("round, decision, user_id").eq("step_id", structure).order("round"));
    expect(approvals.map((a) => [a.round, a.decision])).toEqual([
      [1, "changes_requested"],
      [2, "changes_requested"],
      [3, "approved"],
    ]);
  });
});

describe("comments are logged", () => {
  it("a client comment appears in the activity log", async () => {
    const design = await stepId(f.projectA, "Godkjenn design");
    const comment = must(
      await a1.from("comments").insert({ project_id: f.projectA, step_id: design, author_id: f.users.a1.id, body: "Spørsmål" }).select("id").single(),
    );
    const log = must(await service.from("activity_log").select("event, actor_id").eq("entity_id", comment.id).single());
    expect(log).toEqual({ event: "comment.added", actor_id: f.users.a1.id });
  });
});
