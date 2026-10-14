// Website analysis (milestone 9, part A): admin only, invisible to clients even when linked.
import { beforeAll, describe, expect, it } from "vitest";
import { createFixture, must, service, signIn, signInAdmin, type Db, type Fixture } from "./helpers";

let f: Fixture;
let a1: Db;
let admin: Db;
let analysisId: string;
let runId: string;

beforeAll(async () => {
  f = await createFixture();
  [a1, admin] = await Promise.all([signIn(f.users.a1.email), signInAdmin(f.users.admin.email)]);

  // Linked to client A's own project, the case most likely to leak.
  analysisId = must(
    await admin
      .from("site_analyses")
      .insert({ url: "https://example.no", business_name: "Klient A", client_id: f.clientA, project_id: f.projectA, stated_problems: "for få henvendelser" })
      .select("id")
      .single(),
  ).id;
  runId = must(await admin.from("analysis_runs").insert({ analysis_id: analysisId, page_limit: 15 }).select("id").single()).id;
  must(await admin.from("analysis_pages").insert({ run_id: runId, position: 0, url: "https://example.no/" }));
});

describe("site analysis", () => {
  it("the admin reads and writes everything", async () => {
    expect(must(await admin.from("site_analyses").select("id").eq("id", analysisId))).toHaveLength(1);
    expect(must(await admin.from("analysis_runs").select("id").eq("analysis_id", analysisId))).toHaveLength(1);
    expect(must(await admin.from("analysis_pages").select("id").eq("run_id", runId))).toHaveLength(1);
    expect(must(await admin.from("prompt_templates").select("version").eq("key", "site_analysis")).length).toBeGreaterThan(0);
  });

  it("a client sees none of it, even linked to their own project", async () => {
    expect(must(await a1.from("site_analyses").select("id"))).toEqual([]);
    expect(must(await a1.from("analysis_runs").select("id"))).toEqual([]);
    expect(must(await a1.from("analysis_pages").select("id"))).toEqual([]);
    expect(must(await a1.from("prompt_templates").select("id"))).toEqual([]);
  });

  it("a client cannot create, change or delete anything", async () => {
    const insert = await a1.from("site_analyses").insert({ url: "https://x.no", business_name: "X" });
    expect(insert.error).not.toBeNull();
    const prompt = await a1.from("prompt_templates").insert({ key: "site_analysis", version: 999, body: "x" });
    expect(prompt.error).not.toBeNull();
    await a1.from("site_analyses").update({ business_name: "endret" }).eq("id", analysisId);
    await a1.from("analysis_runs").delete().eq("id", runId);
    const row = must(await service.from("site_analyses").select("business_name").eq("id", analysisId).single());
    expect(row.business_name).toBe("Klient A");
    expect(must(await service.from("analysis_runs").select("id").eq("id", runId))).toHaveLength(1);
  });

  it("instruction versions are never edited or deleted, only added", async () => {
    const v1 = must(await admin.from("prompt_templates").select("id, body").eq("key", "site_analysis").eq("version", 1).single());
    await admin.from("prompt_templates").update({ body: "endret" }).eq("id", v1.id);
    await admin.from("prompt_templates").delete().eq("id", v1.id);
    expect(must(await service.from("prompt_templates").select("body").eq("id", v1.id).single()).body).toBe(v1.body);
  });

  it("goes with the client when the client is deleted", async () => {
    must(await admin.rpc("purge_client", { p_client_id: f.clientA }));
    expect(must(await service.from("site_analyses").select("id").eq("id", analysisId))).toEqual([]);
    expect(must(await service.from("analysis_runs").select("id").eq("id", runId))).toEqual([]);
  });
});
