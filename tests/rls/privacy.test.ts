// GDPR delete and settings (milestone 8).
import { beforeAll, describe, expect, it } from "vitest";
import { createFixture, must, service, signIn, signInAdmin, type Db, type Fixture } from "./helpers";

let f: Fixture;
let a1: Db;
let adminAal1: Db;
let admin: Db;

beforeAll(async () => {
  f = await createFixture();
  [a1, adminAal1] = await Promise.all([signIn(f.users.a1.email), signIn(f.users.admin.email)]);
  admin = await signInAdmin(f.users.admin.email);
});

describe("purge_client", () => {
  it("is refused for clients and for an admin without TOTP", async () => {
    expect((await a1.rpc("purge_client", { p_client_id: f.clientA })).error).not.toBeNull();
    expect((await adminAal1.rpc("purge_client", { p_client_id: f.clientA })).error).not.toBeNull();
    must(await service.from("clients").select("id").eq("id", f.clientA).single());
  });

  it("removes the client and everything belonging to it, including the permanent records", async () => {
    const before = must(await service.from("approvals").select("id").eq("id", f.approvalA));
    expect(before).toHaveLength(1);

    const [result] = must(await admin.rpc("purge_client", { p_client_id: f.clientA }));
    expect(result.storage_paths).toEqual(expect.arrayContaining([f.paths.visiblePathA, f.paths.hiddenPathA]));
    expect(result.member_ids.sort()).toEqual([f.users.a1.id, f.users.a2.id].sort());

    for (const [table, column, value] of [
      ["clients", "id", f.clientA],
      ["projects", "client_id", f.clientA],
      ["files", "client_id", f.clientA],
      ["change_requests", "client_id", f.clientA],
      ["maintenance_log", "client_id", f.clientA],
      ["activity_log", "client_id", f.clientA],
      ["approvals", "id", f.approvalA],
    ] as const) {
      // The loop mixes tables, so the column name can't be typed per table.
      const rows = await service.from(table as "clients").select("*").eq(column as "id", value);
      expect(must(rows), table).toEqual([]);
    }
  });

  it("leaves other clients alone, and append-only still holds afterwards", async () => {
    must(await service.from("clients").select("id").eq("id", f.clientB).single());
    expect(must(await service.from("projects").select("id").eq("client_id", f.clientB))).toHaveLength(1);
    const row = must(await service.from("activity_log").select("id").eq("client_id", f.clientB).limit(1).single());
    expect((await service.from("activity_log").delete().eq("id", row.id)).error).not.toBeNull();
  });
});

describe("update_app_settings", () => {
  it("is admin only, and updates the storage bucket too", async () => {
    const args = { p_reminder_after_days: 4, p_reminder_interval_days: 7, p_max_upload_bytes: 20 * 1024 * 1024, p_allowed_mime_types: ["image/png", "application/pdf"] };
    expect((await a1.rpc("update_app_settings", args)).error).not.toBeNull();
    must(await admin.rpc("update_app_settings", args));
    const { data: bucket } = await service.storage.getBucket("project-files");
    expect(bucket?.file_size_limit).toBe(20 * 1024 * 1024);
    expect(bucket?.allowed_mime_types).toEqual(["image/png", "application/pdf"]);

    // Restore defaults for the other tests.
    must(
      await admin.rpc("update_app_settings", {
        p_reminder_after_days: 5,
        p_reminder_interval_days: 7,
        p_max_upload_bytes: 50 * 1024 * 1024,
        p_allowed_mime_types: [
          "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/heic", "application/pdf",
          "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain", "application/zip", "application/postscript", "application/illustrator",
        ],
      }),
    );
  });
});
