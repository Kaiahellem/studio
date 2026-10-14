"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { firstError, formObject, optionalText, requiredText, uuid } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { schedule } from "@/features/notifications/notify";
import { t } from "@/i18n/nb";
import { parsePastedAnswer } from "./result";
import { runAnalysis } from "./run";

const a = t.studio.analysis;

const notesSchema = z.object({
  stated_problems: optionalText(5000),
  goals: optionalText(5000),
});

const createSchema = notesSchema.extend({
  url: z
    .string()
    .trim()
    // A bare domain is what people usually type; assume https.
    .transform((v) => (v && !/^[a-z]+:\/\//i.test(v) ? `https://${v}` : v))
    .refine((v) => {
      try {
        const u = new URL(v);
        return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
      } catch {
        return false;
      }
    }, a.form.invalidUrl),
  business_name: requiredText(t.forms.required, 200),
});

// Starts a run for an analysis, snapshotting the notes and the newest instructions.
async function startRun(analysisId: string) {
  const supabase = await createClient();
  const [analysis, prompt, settings] = await Promise.all([
    supabase.from("site_analyses").select("stated_problems, goals").eq("id", analysisId).single(),
    supabase.from("prompt_templates").select("id").eq("key", "site_analysis").order("version", { ascending: false }).limit(1).single(),
    supabase.from("app_settings").select("analysis_page_limit").single(),
  ]);
  if (analysis.error) throw analysis.error;
  if (prompt.error) throw prompt.error;
  if (settings.error) throw settings.error;

  const run = await supabase
    .from("analysis_runs")
    .insert({
      analysis_id: analysisId,
      mode: "manual",
      page_limit: settings.data.analysis_page_limit,
      prompt_version_id: prompt.data.id,
      notes_snapshot: { stated_problems: analysis.data.stated_problems, goals: analysis.data.goals },
    })
    .select("id")
    .single();
  if (run.error) throw run.error;
  await supabase.from("site_analyses").update({ updated_at: new Date().toISOString() }).eq("id", analysisId);
  schedule(() => runAnalysis(run.data.id));
}

export async function createAnalysisAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin("/studio/analyses/new");
  const parsed = createSchema.safeParse(formObject(formData, ["url", "business_name", "stated_problems", "goals"]));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const created = await supabase
    .from("site_analyses")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (created.error) return { error: a.errors.unknown };
  await startRun(created.data.id);
  redirect(`/studio/analyses/${created.data.id}`);
}

export async function rerunAction(analysisId: string): Promise<FormState> {
  await requireAdmin();
  await startRun(uuid.parse(analysisId));
  refresh();
  return { message: a.runs.rerunStarted };
}

export async function updateNotesAction(analysisId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = notesSchema.safeParse(formObject(formData, ["stated_problems", "goals"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("site_analyses").update(parsed.data).eq("id", uuid.parse(analysisId));
  if (error) return { error: a.errors.unknown };
  refresh();
  return { message: a.form.saved };
}

export async function submitAnswerAction(runId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = uuid.parse(runId);
  const supabase = await createClient();
  const run = await supabase.from("analysis_runs").select("status").eq("id", id).single();
  if (run.error || run.data.status !== "awaiting_result") return { error: a.manual.errors.not_waiting };

  const pages = await supabase.from("analysis_pages").select("url").eq("run_id", id);
  if (pages.error) return { error: a.errors.unknown };

  const parsed = parsePastedAnswer(String(formData.get("answer") ?? ""), pages.data.map((p) => p.url));
  if (!parsed.ok) {
    const e = parsed.error;
    return { error: e.code === "schema" ? `${a.manual.errors.schema}\n${e.issues.join("\n")}` : a.manual.errors[e.code] };
  }

  const now = new Date().toISOString();
  const saved = await supabase
    .from("analysis_runs")
    .update({ result: parsed.result, status: "done", status_changed_at: now, finished_at: now })
    .eq("id", id)
    .eq("status", "awaiting_result");
  if (saved.error) return { error: a.errors.unknown };
  refresh();
  return { message: parsed.dropped ? `${a.manual.saved} ${a.manual.dropped(parsed.dropped)}` : a.manual.saved };
}

const optionalUuid = z
  .string()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid().nullable());

export async function linkAction(analysisId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z.object({ client_id: optionalUuid, project_id: optionalUuid }).safeParse(formObject(formData, ["client_id", "project_id"]));
  if (!parsed.success) return { error: a.errors.unknown };
  const supabase = await createClient();

  // A project decides the client, so the two never disagree.
  let { client_id } = parsed.data;
  if (parsed.data.project_id) {
    const project = await supabase.from("projects").select("client_id").eq("id", parsed.data.project_id).single();
    if (project.error) return { error: a.errors.unknown };
    client_id = project.data.client_id;
  }
  const { error } = await supabase
    .from("site_analyses")
    .update({ client_id, project_id: parsed.data.project_id })
    .eq("id", uuid.parse(analysisId));
  if (error) return { error: a.errors.unknown };
  refresh();
  return { message: a.link.saved };
}

export async function deleteAnalysisAction(analysisId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("site_analyses").delete().eq("id", uuid.parse(analysisId));
  if (error) return { error: a.errors.unknown };
  redirect("/studio/analyses");
}

export async function savePromptAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin("/studio/settings");
  const body = requiredText(t.forms.required, 20_000).safeParse(formData.get("body"));
  if (!body.success) return { error: firstError(body.error) };
  const supabase = await createClient();
  const latest = await supabase.from("prompt_templates").select("version, body").eq("key", "site_analysis").order("version", { ascending: false }).limit(1).single();
  if (latest.error) return { error: a.errors.unknown };
  if (latest.data.body.trim() === body.data.trim()) return { message: a.settings.instructionsSaved(latest.data.version) };

  const version = latest.data.version + 1;
  const { error } = await supabase.from("prompt_templates").insert({ key: "site_analysis", version, body: body.data, created_by: user.id });
  if (error) return { error: a.errors.unknown };
  refresh();
  return { message: a.settings.instructionsSaved(version) };
}

export async function savePageLimitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("/studio/settings");
  const limit = z.coerce.number().int().min(1).max(50).safeParse(formData.get("analysis_page_limit"));
  if (!limit.success) return { error: a.settings.pageLimitHint };
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ analysis_page_limit: limit.data }).eq("id", true);
  if (error) return { error: a.errors.unknown };
  refresh();
  return { message: t.studio.settings.saved };
}
