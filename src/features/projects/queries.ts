import "server-only";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { todayInOslo } from "@/lib/format/nb";
import { projectGroup, stepTurn, toTurnStep, type ProjectGroup, type TurnStep } from "./turn";

type StepRow = {
  id: string;
  project_id: string;
  title: string;
  status: TurnStep["status"];
  owner: TurnStep["owner"];
  type: TurnStep["type"];
  activated_at: string | null;
  approval_rounds: { round: number; approvals: { id: string } | null }[];
};

export type DashboardProject = {
  id: string;
  name: string;
  clientName: string;
  group: ProjectGroup;
  // Active steps in the group's direction, oldest first.
  current: { id: string; title: string; activatedAt: string | null }[];
};

// Admin queries check access themselves: pages render in parallel with the layout guard,
// so the guard alone would not stop the query from running.
export async function getDashboard() {
  await requireAdmin("/studio");
  const supabase = await createClient();
  const today = todayInOslo();
  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 60);
  const until = horizon.toISOString().slice(0, 10);

  const [projects, steps, changeRequests, usage, renewals] = await Promise.all([
    supabase.from("projects").select("id, name, status, clients(name)").neq("status", "archived").order("created_at"),
    supabase
      .from("project_steps")
      .select("id, project_id, title, status, owner, type, activated_at, position, approval_rounds(round, approvals(id))")
      .order("activated_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("change_requests")
      .select("id, title, urgency, status, created_at, project_id, clients(name)")
      .not("status", "in", "(done,declined)")
      .order("urgency", { ascending: false })
      .order("created_at"),
    supabase.rpc("agreements_usage_overview"),
    supabase
      .from("site_details")
      .select("project_id, domain_name, domain_renewal_date, hosting_provider, hosting_renewal_date, projects(name, clients(name))")
      .or(`and(domain_renewal_date.gte.${today},domain_renewal_date.lte.${until}),and(hosting_renewal_date.gte.${today},hosting_renewal_date.lte.${until})`),
  ]);

  for (const r of [projects, steps, changeRequests, usage, renewals]) if (r.error) throw r.error;

  const stepsByProject = new Map<string, StepRow[]>();
  for (const step of steps.data ?? []) {
    const list = stepsByProject.get(step.project_id) ?? [];
    list.push(step);
    stepsByProject.set(step.project_id, list);
  }

  const grouped: Record<ProjectGroup, DashboardProject[]> = { studio: [], client: [], paused: [], done: [] };
  for (const project of projects.data ?? []) {
    const projectSteps = stepsByProject.get(project.id) ?? [];
    const group = projectGroup(project, projectSteps.map(toTurnStep));
    const direction = group === "client" ? "client" : "studio";
    grouped[group].push({
      id: project.id,
      name: project.name,
      clientName: project.clients?.name ?? "",
      group,
      current: projectSteps
        .filter((s) => stepTurn(toTurnStep(s)) === direction)
        .map((s) => ({ id: s.id, title: s.title, activatedAt: s.activated_at })),
    });
  }

  const renewalItems = (renewals.data ?? [])
    .flatMap((r) => [
      r.domain_renewal_date && r.domain_renewal_date >= today && r.domain_renewal_date <= until
        ? { kind: "domain" as const, date: r.domain_renewal_date, what: r.domain_name, projectId: r.project_id, project: r.projects }
        : null,
      r.hosting_renewal_date && r.hosting_renewal_date >= today && r.hosting_renewal_date <= until
        ? { kind: "hosting" as const, date: r.hosting_renewal_date, what: r.hosting_provider, projectId: r.project_id, project: r.projects }
        : null,
    ])
    .filter((x) => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    grouped,
    changeRequests: changeRequests.data ?? [],
    usage: usage.data ?? [],
    renewals: renewalItems,
  };
}

export async function getProjectForEditing(projectId: string) {
  await requireAdmin(`/studio/projects/${projectId}`);
  const supabase = await createClient();
  const [project, phases, forms] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients(id, name), process_templates(name)")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_phases")
      .select(
        "*, project_steps(*, approval_rounds(round, approvals(id)), form_definitions(title))",
      )
      .eq("project_id", projectId)
      .order("position")
      .order("position", { referencedTable: "project_steps" }),
    supabase.from("form_definitions").select("id, title").order("title"),
  ]);
  for (const r of [project, phases, forms]) if (r.error) throw r.error;
  if (!project.data) return null;
  return { project: project.data, phases: phases.data ?? [], forms: forms.data ?? [] };
}

export async function getNewProjectOptions() {
  await requireAdmin("/studio/projects/new");
  const supabase = await createClient();
  const [clients, templates] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("process_templates").select("id, name").eq("is_active", true).order("name"),
  ]);
  if (clients.error) throw clients.error;
  if (templates.error) throw templates.error;
  return { clients: clients.data, templates: templates.data };
}
