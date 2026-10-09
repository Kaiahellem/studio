import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/forms";
import { peopleNames, requireClientAccess, withDownloadUrls } from "@/features/hub/queries";
import { adminNames } from "@/features/steps/admin-queries";

// The agreement that matters right now: active first, then proposed or paused; ended ones last.
const statusRank = { active: 0, proposed: 1, paused: 2, ended: 3 } as const;

async function currentAgreement(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_agreements")
    .select("*, maintenance_plans(*)")
    .eq("project_id", projectId);
  if (error) throw error;
  const agreement = [...data].sort((a, b) => statusRank[a.status] - statusRank[b.status])[0] ?? null;
  if (!agreement) return null;

  const usage = agreement.status === "active" ? await supabase.rpc("agreement_usage", { p_agreement_id: agreement.id }) : null;
  return { agreement, usage: usage?.data?.[0] ?? null };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export async function getMaintenanceForClient(projectId: string) {
  await requireClientAccess(`/p/${projectId}/vedlikehold`);
  const supabase = await createClient();
  const [current, log, minutes] = await Promise.all([
    currentAgreement(projectId),
    supabase.from("maintenance_log").select("id, entry_date, title, description").eq("project_id", projectId).order("entry_date", { ascending: false }),
    supabase.rpc("maintenance_log_minutes", { p_project_id: projectId }),
  ]);
  if (log.error) throw log.error;
  const perEntry = new Map((minutes.data ?? []).map((m) => [m.maintenance_log_id, m.minutes]));
  return { ...current, log: log.data.map((e) => ({ ...e, minutes: perEntry.get(e.id) ?? null })) };
}

// Small summary for the client's overview page after launch.
export async function getMaintenanceSummary(projectId: string) {
  const supabase = await createClient();
  const [current, requests] = await Promise.all([
    currentAgreement(projectId),
    supabase
      .from("change_requests")
      .select("id, title, status, created_at")
      .eq("project_id", projectId)
      .not("status", "in", "(done,declined)")
      .order("created_at", { ascending: false }),
  ]);
  return { ...current, openRequests: requests.data ?? [] };
}

export async function getRequestsForClient(projectId: string) {
  await requireClientAccess(`/p/${projectId}/endringer`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select("id, title, status, urgency, billing, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRequestForClient(projectId: string, requestId: string) {
  const user = await requireClientAccess(`/p/${projectId}/endringer/${requestId}`);
  const supabase = await createClient();
  const [request, files, comments, minutes] = await Promise.all([
    supabase.from("change_requests").select("*").eq("id", requestId).eq("project_id", projectId).maybeSingle(),
    supabase.from("files").select("id, name, size_bytes, storage_path, uploaded_by, created_at").eq("change_request_id", requestId).order("created_at"),
    supabase.from("comments").select("id, body, author_id, created_at").eq("change_request_id", requestId).order("created_at"),
    supabase.rpc("change_request_minutes", { p_project_id: projectId }),
  ]);
  if (request.error) throw request.error;
  if (!request.data) notFound();
  const people = await peopleNames(projectId, [request.data.created_by, ...(files.data ?? []).map((f) => f.uploaded_by), ...(comments.data ?? []).map((c) => c.author_id)], user.id);
  return {
    request: request.data,
    createdBy: people(request.data.created_by).name,
    files: (await withDownloadUrls(files.data ?? [])).map((f) => ({ ...f, uploader: people(f.uploaded_by).name })),
    comments: (comments.data ?? []).map((c) => ({ ...c, author: people(c.author_id) })),
    minutes: minutes.data?.find((m) => m.change_request_id === requestId)?.minutes ?? 0,
  };
}

// Used by the project layout: every page under /p/[projectId] is "not found" unless RLS lets
// the user see the project, so another client's URLs never render even an empty shell.
export async function projectAccess(projectId: string) {
  await requireUser(`/p/${projectId}`);
  if (!uuid.safeParse(projectId).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, live_url").eq("id", projectId).maybeSingle();
  if (!data) notFound();
  return { launched: Boolean(data.live_url) };
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

export async function listPlans() {
  await requireAdmin("/studio/plans");
  const supabase = await createClient();
  const { data, error } = await supabase.from("maintenance_plans").select("*").order("monthly_price_ore");
  if (error) throw error;
  return data;
}

export async function getRequestsForAdmin() {
  await requireAdmin("/studio/change-requests");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select("id, title, status, urgency, billing, created_at, project_id, clients(name), projects(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const open = data.filter((r) => r.status !== "done" && r.status !== "declined");
  // Urgent first, then oldest first: that's the order to work in.
  open.sort((a, b) => (a.urgency === b.urgency ? a.created_at.localeCompare(b.created_at) : a.urgency === "urgent" ? -1 : 1));
  return { open, closed: data.filter((r) => r.status === "done" || r.status === "declined") };
}

export async function getRequestForAdmin(requestId: string) {
  const user = await requireAdmin(`/studio/change-requests/${requestId}`);
  const supabase = await createClient();
  const [request, files, comments, time] = await Promise.all([
    supabase.from("change_requests").select("*, clients(id, name), projects(id, name)").eq("id", requestId).maybeSingle(),
    supabase.from("files").select("id, name, size_bytes, storage_path, uploaded_by, created_at").eq("change_request_id", requestId).order("created_at"),
    supabase.from("comments").select("id, body, author_id, created_at, internal").eq("change_request_id", requestId).order("created_at"),
    supabase.from("time_entries").select("*").eq("change_request_id", requestId).order("entry_date"),
  ]);
  if (request.error) throw request.error;
  if (!request.data) notFound();
  const names = await adminNames([request.data.created_by, ...(comments.data ?? []).map((c) => c.author_id)]);
  const agreement = await supabase
    .from("maintenance_agreements")
    .select("id, status, maintenance_plans(name)")
    .eq("project_id", request.data.project_id)
    .eq("status", "active")
    .maybeSingle();
  return {
    request: request.data,
    createdBy: names(request.data.created_by).name,
    agreement: agreement.data,
    files: await withDownloadUrls(files.data ?? []),
    comments: (comments.data ?? []).map((c) => ({ ...c, author: { ...names(c.author_id), isYou: c.author_id === user.id } })),
    time: time.data ?? [],
  };
}

export async function getMaintenanceForAdmin(projectId: string) {
  await requireAdmin(`/studio/projects/${projectId}/maintenance`);
  const supabase = await createClient();
  const [project, current, log, time] = await Promise.all([
    supabase.from("projects").select("id, name, clients(id, name)").eq("id", projectId).maybeSingle(),
    currentAgreement(projectId),
    supabase.from("maintenance_log").select("*").eq("project_id", projectId).order("entry_date", { ascending: false }),
    supabase.rpc("maintenance_log_minutes", { p_project_id: projectId }),
  ]);
  if (!project.data) notFound();
  const perEntry = new Map((time.data ?? []).map((m) => [m.maintenance_log_id, m.minutes]));
  return { project: project.data, ...current, log: (log.data ?? []).map((e) => ({ ...e, minutes: perEntry.get(e.id) ?? null })) };
}

export async function getAgreementsForClient(clientId: string) {
  await requireAdmin(`/studio/clients/${clientId}`);
  const supabase = await createClient();
  const [agreements, plans, projects] = await Promise.all([
    supabase.from("maintenance_agreements").select("*, maintenance_plans(name, included_minutes_per_month), projects(name)").eq("client_id", clientId).order("start_date"),
    supabase.from("maintenance_plans").select("id, name, is_active").order("monthly_price_ore"),
    supabase.from("projects").select("id, name").eq("client_id", clientId).order("created_at"),
  ]);
  const usage = await Promise.all(
    (agreements.data ?? []).filter((a) => a.status === "active").map(async (a) => {
      const { data } = await supabase.rpc("agreement_usage", { p_agreement_id: a.id });
      return [a.id, data?.[0] ?? null] as const;
    }),
  );
  return { agreements: agreements.data ?? [], plans: plans.data ?? [], projects: projects.data ?? [], usage: new Map(usage) };
}
