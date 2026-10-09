import "server-only";
import { strToU8, zipSync, type Zippable } from "fflate";
import { safeFileName } from "@/lib/format/file";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Everything stored about one client (BRIEF.md, Privacy): every table that belongs to it, as
// JSON, plus every file. Read as the admin through RLS; only auth emails need the service role.
export async function buildClientExport(clientId: string): Promise<{ zip: Uint8Array; clientName: string }> {
  const db = await createClient();
  const client = await db.from("clients").select("*").eq("id", clientId).single();
  if (client.error) throw client.error;

  const projects = (await db.from("projects").select("*").eq("client_id", clientId)).data ?? [];
  const projectIds = projects.map((p) => p.id);

  const steps = (await db.from("project_steps").select("*").in("project_id", projectIds)).data ?? [];
  const stepIds = steps.map((s) => s.id);
  const requests = (await db.from("change_requests").select("*").eq("client_id", clientId)).data ?? [];
  const logEntries = (await db.from("maintenance_log").select("*").eq("client_id", clientId)).data ?? [];
  const pages = (await db.from("handover_pages").select("*").in("project_id", projectIds)).data ?? [];

  const [privateNotes, members, phases, rounds, approvals, responses, comments, documents, files, site, sections, agreements, time, activity] =
    await Promise.all([
      db.from("client_private").select("*").eq("client_id", clientId),
      db.from("client_members").select("*").eq("client_id", clientId),
      db.from("project_phases").select("*").in("project_id", projectIds),
      db.from("approval_rounds").select("*").in("step_id", stepIds),
      db.from("approvals").select("*").in("step_id", stepIds),
      db.from("form_responses").select("*").in("step_id", stepIds),
      db.from("comments").select("*").in("project_id", projectIds),
      db.from("documents").select("*").in("project_id", projectIds),
      db.from("files").select("*").eq("client_id", clientId),
      db.from("site_details").select("*").in("project_id", projectIds),
      db.from("handover_sections").select("*").in("page_id", pages.map((p) => p.id)),
      db.from("maintenance_agreements").select("*").eq("client_id", clientId),
      db.from("time_entries").select("*").or(
        [
          requests.length ? `change_request_id.in.(${requests.map((r) => r.id).join(",")})` : null,
          logEntries.length ? `maintenance_log_id.in.(${logEntries.map((l) => l.id).join(",")})` : null,
        ]
          .filter(Boolean)
          .join(",") || "id.is.null",
      ),
      db.from("activity_log").select("*").eq("client_id", clientId),
    ]);

  const memberIds = (members.data ?? []).map((m) => m.user_id);
  const admin = createAdminClient();
  const [profiles, users] = await Promise.all([
    db.from("profiles").select("*").in("user_id", memberIds),
    Promise.all(memberIds.map((id) => admin.auth.admin.getUserById(id))),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    client: client.data,
    client_private: privateNotes.data,
    members: (members.data ?? []).map((m, i) => ({
      ...m,
      email: users[i].data.user?.email ?? null,
      profile: profiles.data?.find((p) => p.user_id === m.user_id) ?? null,
    })),
    projects,
    project_phases: phases.data,
    project_steps: steps,
    approval_rounds: rounds.data,
    approvals: approvals.data,
    form_responses: responses.data,
    comments: comments.data,
    documents: documents.data,
    files: files.data,
    site_details: site.data,
    handover_pages: pages,
    handover_sections: sections.data,
    maintenance_agreements: agreements.data,
    change_requests: requests,
    time_entries: time.data,
    maintenance_log: logEntries,
    activity_log: activity.data,
  };

  // Files go in as stored, uncompressed (images and PDFs are compressed already).
  const zippable: Zippable = { "data.json": strToU8(JSON.stringify(data, null, 2)) };
  const storedPaths = [
    ...(files.data ?? []).map((f) => ({ path: f.storage_path, name: f.name, folder: "filer" })),
    ...(documents.data ?? [])
      .filter((d) => d.storage_path)
      .map((d) => ({ path: d.storage_path!, name: d.storage_path!.split("/").pop()!, folder: "dokumenter" })),
  ];
  for (const [i, f] of storedPaths.entries()) {
    const { data: blob } = await db.storage.from("project-files").download(f.path);
    if (!blob) continue;
    zippable[`${f.folder}/${String(i + 1).padStart(3, "0")}-${safeFileName(f.name)}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  }

  return { zip: zipSync(zippable, { level: 6 }), clientName: client.data.name };
}
