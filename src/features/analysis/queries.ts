import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/forms";
import { buildBundle, type BundlePage, type TechnicalReport } from "./bundle";
import { resultSchema, type AnalysisResult } from "./result";
import { STALE_AFTER_MS, WORKING } from "./run";

export type RunStatus = "queued" | "crawling" | "checking" | "awaiting_result" | "analysing" | "done" | "failed";

// A run that stopped moving shows as failed; the next run starts clean.
function effectiveStatus(status: string, changedAt: string): { status: RunStatus; stale: boolean } {
  const stale = (WORKING as readonly string[]).includes(status) && Date.now() - new Date(changedAt).getTime() > STALE_AFTER_MS;
  return { status: stale ? "failed" : (status as RunStatus), stale };
}

export async function listAnalyses() {
  await requireAdmin("/studio/analyses");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_analyses")
    .select("id, business_name, url, clients(name), analysis_runs(status, started_at, status_changed_at)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map((a) => {
    const latest = [...a.analysis_runs].sort((x, y) => y.started_at.localeCompare(x.started_at))[0] ?? null;
    return {
      id: a.id,
      businessName: a.business_name,
      url: a.url,
      clientName: a.clients?.name ?? null,
      latest: latest ? { startedAt: latest.started_at, ...effectiveStatus(latest.status, latest.status_changed_at) } : null,
    };
  });
}

export async function getAnalysis(id: string) {
  await requireAdmin(`/studio/analyses/${id}`);
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const [analysis, runs] = await Promise.all([
    supabase.from("site_analyses").select("*, clients(id, name), projects(id, name)").eq("id", id).maybeSingle(),
    supabase
      .from("analysis_runs")
      .select("id, mode, status, error, started_at, status_changed_at, finished_at, pages_read, page_limit, technical, result, notes_snapshot, prompt_templates(version)")
      .eq("analysis_id", id)
      .order("started_at", { ascending: false }),
  ]);
  if (analysis.error) throw analysis.error;
  if (runs.error) throw runs.error;
  if (!analysis.data) notFound();

  return {
    analysis: analysis.data,
    runs: runs.data.map((r) => {
      const { status, stale } = effectiveStatus(r.status, r.status_changed_at);
      const parsed = r.result ? resultSchema.safeParse(r.result) : null;
      return {
        id: r.id,
        mode: r.mode as "manual" | "auto",
        status,
        error: stale ? "timeout" : r.error,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        pagesRead: r.pages_read,
        pageLimit: r.page_limit,
        promptVersion: r.prompt_templates?.version ?? null,
        technical: (r.technical as unknown as TechnicalReport | null) ?? null,
        result: parsed?.success ? (parsed.data as AnalysisResult) : null,
      };
    }),
  };
}

export async function getRunPages(runId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_pages")
    .select("url, title, meta_description, headings, main_text, images, ctas, contacts")
    .eq("run_id", runId)
    .order("position");
  if (error) throw error;
  return data as unknown as BundlePage[];
}

// The bundle for one run. Read through RLS, so only an admin gets anything back.
export async function getBundle(runId: string): Promise<{ text: string; businessName: string } | null> {
  if (!uuid.safeParse(runId).success) return null;
  const supabase = await createClient();
  const run = await supabase
    .from("analysis_runs")
    .select("technical, notes_snapshot, prompt_templates(body), site_analyses(business_name, url)")
    .eq("id", runId)
    .maybeSingle();
  if (run.error || !run.data?.technical || !run.data.site_analyses || !run.data.prompt_templates) return null;
  const notes = run.data.notes_snapshot as { stated_problems?: string | null; goals?: string | null };
  const pages = await getRunPages(runId);
  return {
    businessName: run.data.site_analyses.business_name,
    text: buildBundle({
      instructions: run.data.prompt_templates.body,
      businessName: run.data.site_analyses.business_name,
      url: run.data.site_analyses.url,
      statedProblems: notes.stated_problems ?? null,
      goals: notes.goals ?? null,
      technical: run.data.technical as unknown as TechnicalReport,
      pages,
    }),
  };
}

export async function getLinkOptions() {
  const supabase = await createClient();
  const [clients, projects] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name, clients(name)").neq("status", "archived").order("name"),
  ]);
  if (clients.error) throw clients.error;
  if (projects.error) throw projects.error;
  return { clients: clients.data, projects: projects.data };
}

export async function getPromptVersions() {
  await requireAdmin("/studio/settings");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_templates")
    .select("id, version, body, created_at")
    .eq("key", "site_analysis")
    .order("version", { ascending: false });
  if (error) throw error;
  return data;
}

// Analyses for an admin page. For a project: those linked to the project, and those linked to
// its client without a project (they belong to every project of that client).
export async function getLinkedAnalyses(filter: { clientId: string; projectId?: string }) {
  const supabase = await createClient();
  let query = supabase.from("site_analyses").select("id, business_name, url, project_id").order("updated_at", { ascending: false });
  query = filter.projectId
    ? query.or(`project_id.eq.${filter.projectId},and(client_id.eq.${filter.clientId},project_id.is.null)`)
    : query.eq("client_id", filter.clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type BriefAnalysis =
  | {
      included: true;
      id: string;
      businessName: string;
      url: string;
      ranAt: string;
      result: AnalysisResult;
      technical: TechnicalReport | null;
      via: "project" | "client";
    }
  | { included: false; id: string; businessName: string; reason: "not_done" }
  | null;

// The analysis that goes into a project's brief: the newest finished run, preferring analyses
// linked to the project over those linked only to the client. Shared by the brief and the
// project page, so what the page says is what the brief contains.
export async function getBriefAnalysis(projectId: string, clientId: string): Promise<BriefAnalysis> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_analyses")
    .select("id, business_name, url, project_id, analysis_runs(status, started_at, result, technical)")
    .or(`project_id.eq.${projectId},and(client_id.eq.${clientId},project_id.is.null)`);
  if (error) throw error;
  if (data.length === 0) return null;

  const candidates = data
    .flatMap((a) =>
      a.analysis_runs
        .filter((r) => r.status === "done")
        .map((r) => ({ a, r, parsed: resultSchema.safeParse(r.result) }))
        .filter((x) => x.parsed.success),
    )
    .sort((x, y) => Number(y.a.project_id === projectId) - Number(x.a.project_id === projectId) || y.r.started_at.localeCompare(x.r.started_at));
  const best = candidates[0];
  if (!best) {
    const first = [...data].sort((x, y) => Number(y.project_id === projectId) - Number(x.project_id === projectId))[0];
    return { included: false, id: first.id, businessName: first.business_name, reason: "not_done" };
  }
  return {
    included: true,
    id: best.a.id,
    businessName: best.a.business_name,
    url: best.a.url,
    ranAt: best.r.started_at,
    result: best.parsed.data as AnalysisResult,
    technical: (best.r.technical as unknown as TechnicalReport | null) ?? null,
    via: best.a.project_id === projectId ? "project" : "client",
  };
}
