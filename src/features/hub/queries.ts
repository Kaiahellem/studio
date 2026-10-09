import "server-only";
import { notFound, redirect } from "next/navigation";
import { isAdminAccount, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toTurnStep } from "@/features/projects/turn";
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
  await requireClient(`/p/${projectId}/steg/${stepId}`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_steps")
    .select(
      "id, title, description, status, owner, type, due_date, config, max_revision_rounds, project_phases(name), approval_rounds(round, note, link, opened_at, approvals(id, decision, comment, created_at))",
    )
    .eq("id", stepId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}
