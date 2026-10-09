// Handover page visibility (milestone 5).
import { beforeAll, describe, expect, it } from "vitest";
import { anon, createFixture, must, service, signIn, signInAdmin, type Db, type Fixture } from "./helpers";

let f: Fixture;
let a1: Db;
let b1: Db;
let admin: Db;
let pageId: string;

beforeAll(async () => {
  f = await createFixture();
  [a1, b1] = await Promise.all([signIn(f.users.a1.email), signIn(f.users.b1.email)]);
  admin = await signInAdmin(f.users.admin.email);
});

describe("handover", () => {
  it("only the admin creates the page, with default sections", async () => {
    expect((await a1.rpc("create_handover_page", { p_project_id: f.projectA })).error).not.toBeNull();
    pageId = must(await admin.rpc("create_handover_page", { p_project_id: f.projectA }));
    // Calling again returns the same page.
    expect(must(await admin.rpc("create_handover_page", { p_project_id: f.projectA }))).toBe(pageId);
    const kinds = must(await service.from("handover_sections").select("kind").eq("page_id", pageId).order("position")).map((s) => s.kind);
    expect(kinds).toEqual(["logos", "colours", "fonts", "website_guide", "domain_hosting", "links_contacts", "access_notes"]);
  });

  it("clients don't see it until it is published", async () => {
    expect(must(await a1.from("handover_pages").select("id"))).toEqual([]);
    expect(must(await a1.from("handover_sections").select("id"))).toEqual([]);

    must(await admin.from("handover_pages").update({ published_at: new Date().toISOString() }).eq("id", pageId));
    expect(must(await a1.from("handover_pages").select("id")).map((p) => p.id)).toEqual([pageId]);
    expect(must(await a1.from("handover_sections").select("id"))).toHaveLength(7);
  });

  it("hidden sections and other clients stay out", async () => {
    must(await admin.from("handover_sections").update({ visible: false }).eq("page_id", pageId).eq("kind", "access_notes"));
    const kinds = must(await a1.from("handover_sections").select("kind")).map((s) => s.kind);
    expect(kinds).not.toContain("access_notes");
    expect(must(await b1.from("handover_pages").select("id"))).toEqual([]);
  });

  it("clients cannot change the page or its sections", async () => {
    await a1.from("handover_pages").update({ public_enabled: true }).eq("id", pageId);
    await a1.from("handover_sections").update({ title: "Kapret" }).eq("page_id", pageId);
    const page = must(await service.from("handover_pages").select("public_enabled").eq("id", pageId).single());
    expect(page.public_enabled).toBe(false);
    const titles = must(await service.from("handover_sections").select("title").eq("page_id", pageId)).map((s) => s.title);
    expect(titles).not.toContain("Kapret");
  });

  it("the public link only lists files the page shows, and dies when regenerated", async () => {
    const files = must(await service.from("files").select("id, name").eq("project_id", f.projectA));
    const logo = files.find((x) => x.name === "logo.png")!;
    must(await admin.from("handover_sections").update({ content: { file_ids: [logo.id] } }).eq("page_id", pageId).eq("kind", "logos"));
    must(await admin.from("handover_pages").update({ public_enabled: true }).eq("id", pageId));

    const { public_token } = must(await service.from("handover_pages").select("public_token").eq("id", pageId).single());
    const result = must(await anon().rpc("get_public_handover", { p_token: public_token })) as { files: { name: string }[]; sections: { kind: string }[] };
    expect(result.files.map((x) => x.name)).toEqual(["logo.png"]);
    expect(result.sections.map((s) => s.kind)).not.toContain("access_notes");

    expect((await a1.rpc("regenerate_handover_token", { p_page_id: pageId })).error).not.toBeNull();
    must(await admin.rpc("regenerate_handover_token", { p_page_id: pageId }));
    expect(must(await anon().rpc("get_public_handover", { p_token: public_token }))).toBeNull();
  });

  it("setting the live URL marks the project launched", async () => {
    must(await admin.from("projects").update({ live_url: "https://klient-a.no" }).eq("id", f.projectA));
    const project = must(await service.from("projects").select("launched_at").eq("id", f.projectA).single());
    expect(project.launched_at).not.toBeNull();
  });
});
