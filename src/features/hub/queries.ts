import "server-only";
import { notFound, redirect } from "next/navigation";
import { isAdminAccount, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toTurnStep } from "@/features/projects/turn";
import { t } from "@/i18n/nb";
import type { HubPhase, HubStep } from "./next-action";

// Client-side reads. Everything goes through RLS as the logged-in client, so hidden steps,
// internal comments and other clients' data are never returned.

async function requireClient(next: string) {
  const user = await requireUser(next);
  // Admins see hidden content through RLS, so the client view would be misleading for them.
  if (await isAdminAccount()) redirect("/studio");
  return user;
}

export async function getMyProjects() {
  const user = await requireClient("/");
  const supabase = await createClient();
  const [projects, profile] = await Promise.all([
    supabase.from("projects").select("id, name, status, clients(name)").neq("status", "archived").order("created_at"),
    supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
  ]);
  if (projects.error) throw projects.error;
  return { projects: projects.data, firstName: firstName(profile.data?.full_name) };
}

function firstName(full: string | null | undefined): string | null {
  return full?.trim().split(/\s+/)[0] || null;
}

export async function getProjectOverview(projectId: string) {
  const user = await requireClient(`/p/${projectId}`);
  const supabase = await createClient();

  const [project, phases, profile] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, staging_url, live_url, cms_url, target_launch_date, clients(name)")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_phases")
      .select(
        "id, name, description, position, status, project_steps(id, title, description, position, status, owner, type, due_date, config, approval_rounds(round, approvals(id)))",
      )
      .eq("project_id", projectId)
      .order("position")
      .order("position", { referencedTable: "project_steps" }),
    supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
  ]);
  if (project.error) throw project.error;
  if (phases.error) throw phases.error;
  if (!project.data) notFound();

  const hubPhases: HubPhase[] = phases.data.map((phase) => ({
    id: phase.id,
    name: phase.name,
    description: phase.description,
    position: phase.position,
    status: phase.status,
    steps: phase.project_steps.map(
      (s): HubStep => ({
        ...toTurnStep(s),
        id: s.id,
        title: s.title,
        description: s.description,
        position: s.position,
        due_date: s.due_date,
        config: (s.config ?? null) as HubStep["config"],
      }),
    ),
  }));

  return { project: project.data, phases: hubPhases, firstName: firstName(profile.data?.full_name) };
}

export async function getStepForClient(projectId: string, stepId: string) {
  const user = await requireClient(`/p/${projectId}/steg/${stepId}`);
  const supabase = await createClient();
  const [step, files, comments] = await Promise.all([
    supabase
      .from("project_steps")
      .select(
        "id, title, description, status, owner, type, due_date, config, max_revision_rounds, completed_at, project_phases(name), form_definitions(schema), form_responses(answers, status, submitted_at), approval_rounds(id, round, note, link, opened_at, approvals(decision, comment, created_at, user_id))",
      )
      .eq("id", stepId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("files")
      .select("id, name, size_bytes, mime_type, storage_path, uploaded_by, created_at")
      .eq("step_id", stepId)
      .order("created_at"),
    supabase
      .from("comments")
      .select("id, body, author_id, created_at")
      .eq("step_id", stepId)
      .order("created_at"),
  ]);
  if (step.error) throw step.error;
  if (!step.data) notFound();
  if (files.error) throw files.error;
  if (comments.error) throw comments.error;

  const people = await peopleNames(
    projectId,
    [
      ...comments.data.map((c) => c.author_id),
      ...files.data.map((f) => f.uploaded_by),
      ...step.data.approval_rounds.map((r) => r.approvals?.user_id),
    ],
    user.id,
  );

  return {
    step: step.data,
    files: await withDownloadUrls(files.data),
    comments: comments.data.map((c) => ({ ...c, author: people(c.author_id) })),
    people,
  };
}

export type Person = { name: string; isYou: boolean; isStudio: boolean };

// Display names for the people around a project. Anyone who isn't a member of the client is
// the studio, as far as the client is concerned.
export async function peopleNames(projectId: string, ids: (string | null | undefined)[], me: string) {
  const supabase = await createClient();
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const [profiles, project] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name").in("user_id", unique),
    supabase.from("projects").select("client_id").eq("id", projectId).single(),
  ]);
  const members = project.data
    ? await supabase.from("client_members").select("user_id").eq("client_id", project.data.client_id)
    : { data: [] };
  const memberIds = new Set((members.data ?? []).map((m) => m.user_id));

  return (id: string | null | undefined): Person => {
    const isStudio = !id || !memberIds.has(id);
    const name = profiles.data?.find((p) => p.user_id === id)?.full_name;
    return {
      isYou: id === me,
      isStudio,
      name: id === me ? t.client.comments.you : (name ?? (isStudio ? t.client.comments.studio : t.client.comments.colleague)),
    };
  };
}

// Short-lived download links, created as the user so the storage policy decides.
export async function withDownloadUrls<T extends { storage_path: string }>(files: T[]): Promise<(T & { url: string | null })[]> {
  if (files.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("project-files").createSignedUrls(
    files.map((f) => f.storage_path),
    60 * 10,
  );
  return files.map((f) => ({ ...f, url: data?.find((d) => d.path === f.storage_path)?.signedUrl ?? null }));
}

export async function getDocumentsForClient(projectId: string) {
  await requireClient(`/p/${projectId}/dokumenter`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, type, title, status, document_date, external_url, storage_path")
    .eq("project_id", projectId)
    .order("document_date", { ascending: false });
  if (error) throw error;

  const stored = await withDownloadUrls(data.filter((d): d is typeof d & { storage_path: string } => d.storage_path !== null));
  return data.map((d) => ({
    ...d,
    href: d.external_url ?? stored.find((s) => s.id === d.id)?.url ?? null,
  }));
}

export async function getFilesForClient(projectId: string) {
  const user = await requireClient(`/p/${projectId}/filer`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("files")
    .select("id, name, size_bytes, storage_path, uploaded_by, created_at, project_steps(title)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const people = await peopleNames(projectId, data.map((f) => f.uploaded_by), user.id);
  return (await withDownloadUrls(data)).map((f) => ({ ...f, uploader: people(f.uploaded_by).name }));
}
