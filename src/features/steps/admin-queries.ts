import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withDownloadUrls } from "@/features/hub/queries";
import { t } from "@/i18n/nb";

// Names for any users, as seen by the admin. Users without a profile name show as "Ukjent".
export async function adminNames(ids: (string | null | undefined)[]) {
  const supabase = await createClient();
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const [profiles, admins] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name").in("user_id", unique),
    supabase.from("admins").select("user_id").in("user_id", unique),
  ]);
  const adminIds = new Set((admins.data ?? []).map((a) => a.user_id));
  return (id: string | null | undefined) => ({
    name: profiles.data?.find((p) => p.user_id === id)?.full_name ?? (id && adminIds.has(id) ? t.client.comments.studio : t.studio.activity.someone),
    isStudio: Boolean(id && adminIds.has(id)),
  });
}

export async function getStepForAdmin(projectId: string, stepId: string) {
  const user = await requireAdmin(`/studio/projects/${projectId}/steps/${stepId}`);
  const supabase = await createClient();
  const [step, files, comments] = await Promise.all([
    supabase
      .from("project_steps")
      .select(
        "*, project_phases(name, projects(name, clients(name))), form_definitions(title, schema), form_responses(answers, status, submitted_at, definition_snapshot), approval_rounds(id, round, note, link, opened_at, approvals(decision, comment, created_at, user_id))",
      )
      .eq("id", stepId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase.from("files").select("id, name, size_bytes, storage_path, uploaded_by, created_at").eq("step_id", stepId).order("created_at"),
    supabase.from("comments").select("id, body, author_id, created_at, internal").eq("step_id", stepId).order("created_at"),
  ]);
  if (step.error) throw step.error;
  if (!step.data) notFound();
  if (files.error) throw files.error;
  if (comments.error) throw comments.error;

  const names = await adminNames([
    ...comments.data.map((c) => c.author_id),
    ...files.data.map((f) => f.uploaded_by),
    ...step.data.approval_rounds.map((r) => r.approvals?.user_id),
  ]);

  return {
    step: step.data,
    files: (await withDownloadUrls(files.data)).map((f) => ({ ...f, uploader: names(f.uploaded_by).name })),
    comments: comments.data.map((c) => ({
      ...c,
      author: { ...names(c.author_id), isYou: c.author_id === user.id },
    })),
    names,
  };
}

export async function getDocumentsForAdmin(projectId: string) {
  await requireAdmin(`/studio/projects/${projectId}/documents`);
  const supabase = await createClient();
  const [project, documents, steps] = await Promise.all([
    supabase.from("projects").select("id, name, clients(name)").eq("id", projectId).maybeSingle(),
    supabase.from("documents").select("*").eq("project_id", projectId).order("document_date", { ascending: false }),
    supabase.from("project_steps").select("id, title, project_phases(position)").eq("project_id", projectId),
  ]);
  if (documents.error) throw documents.error;
  if (!project.data) notFound();
  const stored = await withDownloadUrls(documents.data.filter((d): d is typeof d & { storage_path: string } => d.storage_path !== null));
  return {
    project: project.data,
    documents: documents.data.map((d) => ({ ...d, href: d.external_url ?? stored.find((s) => s.id === d.id)?.url ?? null })),
    steps: (steps.data ?? []).sort((a, b) => (a.project_phases?.position ?? 0) - (b.project_phases?.position ?? 0)),
  };
}

export async function getActivity(projectId: string) {
  await requireAdmin(`/studio/projects/${projectId}/activity`);
  const supabase = await createClient();
  const [project, events, steps] = await Promise.all([
    supabase.from("projects").select("id, name, clients(name)").eq("id", projectId).maybeSingle(),
    supabase.from("activity_log").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(300),
    supabase.from("project_steps").select("id, title").eq("project_id", projectId),
  ]);
  if (events.error) throw events.error;
  if (!project.data) notFound();
  const names = await adminNames(events.data.map((e) => e.actor_id));
  const stepTitle = new Map((steps.data ?? []).map((s) => [s.id, s.title]));

  return {
    project: project.data,
    events: events.data.map((e) => {
      const data = (e.data ?? {}) as { title?: string; name?: string; round?: number; step_id?: string };
      return {
        id: e.id,
        at: e.created_at,
        actor: e.actor_id ? names(e.actor_id).name : null,
        event: e.event,
        subject:
          (e.entity_type === "project_step" && e.entity_id && stepTitle.get(e.entity_id)) ||
          data.title ||
          data.name ||
          (data.step_id && stepTitle.get(data.step_id)) ||
          null,
        round: data.round ?? null,
      };
    }),
  };
}
