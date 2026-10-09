"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { checkbox, firstError, formObject, optionalDate, optionalText, optionalUrl, requiredText, uuid } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const p = t.studio.projects;

// Approvals are permanent (docs/PLAN.md §3.4), so deleting anything that has one fails in the database.
function deleteError(error: { message: string } | null): FormState {
  if (!error) return undefined;
  if (error.message.includes("append-only")) return { error: p.cannotDeleteApproved };
  return { error: t.studio.errors.generic };
}

async function rpcResult(promise: PromiseLike<{ error: { message: string } | null }>): Promise<FormState> {
  const { error } = await promise;
  if (error) return deleteError(error);
  refresh();
  return undefined;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const createSchema = z.object({
  client_id: uuid,
  template_id: uuid,
  name: requiredText(p.nameRequired),
  start_date: optionalDate,
  target_launch_date: optionalDate,
});

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = createSchema.safeParse(
    formObject(formData, ["client_id", "template_id", "name", "start_date", "target_launch_date"]),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_project_from_template", {
    p_client_id: v.client_id,
    p_template_id: v.template_id,
    p_name: v.name,
    p_start_date: v.start_date ?? undefined,
    p_target_launch_date: v.target_launch_date ?? undefined,
  });
  if (error || !data) return { error: t.studio.errors.generic };
  redirect(`/studio/projects/${data}`);
}

const settingsSchema = z.object({
  name: requiredText(p.nameRequired),
  status: z.enum(["active", "paused", "completed", "archived"]),
  start_date: optionalDate,
  target_launch_date: optionalDate,
  staging_url: optionalUrl(p.invalidUrl),
  live_url: optionalUrl(p.invalidUrl),
  cms_url: optionalUrl(p.invalidUrl),
  reminders_enabled: checkbox,
});

export async function updateProjectAction(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(
    formObject(formData, [
      "name", "status", "start_date", "target_launch_date", "staging_url", "live_url", "cms_url", "reminders_enabled",
    ]),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(parsed.data).eq("id", uuid.parse(projectId));
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return { message: p.saved };
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

const phaseSchema = z.object({
  name: requiredText(p.titleRequired),
  description: optionalText(2000),
  step_mode: z.enum(["sequential", "parallel"]),
});

export async function addPhaseAction(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = phaseSchema.safeParse(formObject(formData, ["name", "description", "step_mode"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  return rpcResult(
    supabase.rpc("add_phase", {
      p_project_id: uuid.parse(projectId),
      p_name: parsed.data.name,
      p_description: parsed.data.description ?? undefined,
      p_step_mode: parsed.data.step_mode,
    }),
  );
}

export async function updatePhaseAction(phaseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = phaseSchema.safeParse(formObject(formData, ["name", "description", "step_mode"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("project_phases").update(parsed.data).eq("id", uuid.parse(phaseId));
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return { message: t.studio.clients.saved };
}

export async function movePhaseAction(phaseId: string, direction: number): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  return rpcResult(supabase.rpc("move_phase", { p_phase_id: uuid.parse(phaseId), p_direction: Math.sign(direction) }));
}

export async function deletePhaseAction(phaseId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  return rpcResult(supabase.rpc("delete_phase", { p_phase_id: uuid.parse(phaseId) }));
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const stepSchema = z
  .object({
    title: requiredText(p.titleRequired),
    description: optionalText(5000),
    owner: z.enum(["client", "studio"]),
    type: z.enum(["task", "upload", "approval", "form", "link"]),
    visible_to_client: checkbox,
    // Only present in the form for approval and form steps.
    max_revision_rounds: z
      .string()
      .nullable()
      .transform((v) => (v === null || v.trim() === "" ? null : Number(v)))
      .pipe(z.number().int().min(0).max(20).nullable()),
    form_definition_id: z
      .string()
      .nullable()
      .transform((v) => (v === null || v === "" ? null : v))
      .pipe(uuid.nullable()),
    due_date: optionalDate,
  })
  .refine((v) => v.type !== "form" || v.form_definition_id !== null, { message: p.formRequired })
  // Columns that only apply to one type are cleared for the others (the database checks this too).
  .transform((v) => ({
    ...v,
    max_revision_rounds: v.type === "approval" ? v.max_revision_rounds : null,
    form_definition_id: v.type === "form" ? v.form_definition_id : null,
  }));

const stepKeys = [
  "title", "description", "owner", "type", "visible_to_client", "max_revision_rounds", "form_definition_id", "due_date",
] as const;

export async function addStepAction(phaseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = stepSchema.safeParse(formObject(formData, stepKeys));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  return rpcResult(
    supabase.rpc("add_step", {
      p_phase_id: uuid.parse(phaseId),
      p_title: v.title,
      p_owner: v.owner,
      p_type: v.type,
      p_visible_to_client: v.visible_to_client,
      p_description: v.description ?? undefined,
      p_max_revision_rounds: v.max_revision_rounds ?? undefined,
      p_form_definition_id: v.form_definition_id ?? undefined,
      p_due_date: v.due_date ?? undefined,
    }),
  );
}

export async function updateStepAction(stepId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = stepSchema.safeParse(formObject(formData, stepKeys));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("project_steps").update(parsed.data).eq("id", uuid.parse(stepId));
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return { message: t.studio.clients.saved };
}

export async function completeStepAction(stepId: string, skip: boolean): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  return rpcResult(supabase.rpc("complete_step", { p_step_id: uuid.parse(stepId), p_skip: skip }));
}

export async function reopenStepAction(stepId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  return rpcResult(supabase.rpc("reopen_step", { p_step_id: uuid.parse(stepId) }));
}

export async function moveStepAction(stepId: string, direction: number): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  return rpcResult(supabase.rpc("move_step", { p_step_id: uuid.parse(stepId), p_direction: Math.sign(direction) }));
}

export async function deleteStepAction(stepId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  return rpcResult(supabase.rpc("delete_step", { p_step_id: uuid.parse(stepId) }));
}
