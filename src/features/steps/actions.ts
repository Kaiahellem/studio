"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { answersFromFormData, parseDefinition, validateAnswers, type Answers, type FieldErrors } from "@/features/forms/schema";
import { getSessionUser, isAdminAccount, requireUser } from "@/lib/auth/session";
import { safeFileName } from "@/lib/format/file";
import { uuid } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";
import { getUploadSettings } from "./settings";
import {
  notifyApproval,
  notifyClientTurnsForStep,
  notifyComment,
  notifyFormSubmitted,
  notifyUpload,
  schedule,
} from "@/features/notifications/notify";

const c = t.client;

// Database rule violations (wrong step, not active, ...) all mean the page is out of date.
function fail(error: { message: string } | null): FormState | undefined {
  if (!error) return undefined;
  console.error("step action failed:", error.message);
  return { error: c.step.notAllowed };
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function approveAction(stepId: string): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const id = uuid.parse(stepId);
  const { error } = await supabase.rpc("submit_approval", { p_step_id: id, p_decision: "approved" });
  if (error) return fail(error);
  schedule(async () => {
    await notifyApproval(id, "approved", false);
    await notifyClientTurnsForStep(id);
  });
  refresh();
  return { message: c.approval.approvedThanks };
}

export async function requestChangesAction(stepId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const comment = z.string().trim().min(1).max(10_000).safeParse(formData.get("comment"));
  if (!comment.success) return { error: c.approval.changesRequired };
  const supabase = await createClient();
  const id = uuid.parse(stepId);
  const { data, error } = await supabase.rpc("submit_approval", {
    p_step_id: id,
    p_decision: "changes_requested",
    p_comment: comment.data,
  });
  if (error) return fail(error);
  const usedUp = Boolean((data as { rounds_used_up?: boolean } | null)?.rounds_used_up);
  schedule(() => notifyApproval(id, "changes_requested", usedUp));
  refresh();
  return { message: c.approval.changesThanks };
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export type FormStepState = { error?: string; message?: string; fieldErrors?: FieldErrors; answers?: Answers } | undefined;

async function loadDefinition(stepId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_steps")
    .select("form_definitions(schema)")
    .eq("id", stepId)
    .single();
  if (error || !data.form_definitions) throw error ?? new Error("form definition missing");
  return { supabase, definition: parseDefinition(data.form_definitions.schema) };
}

export async function saveFormAction(stepId: string, _prev: FormStepState, formData: FormData): Promise<FormStepState> {
  const user = await requireUser();
  const id = uuid.parse(stepId);
  const { supabase, definition } = await loadDefinition(id);
  const answers = answersFromFormData(definition, formData);

  if (formData.get("intent") === "submit") {
    const fieldErrors = validateAnswers(definition, answers);
    if (Object.keys(fieldErrors).length > 0) return { error: t.forms.fixErrors, fieldErrors, answers };
    const { error } = await supabase.rpc("submit_form", { p_step_id: id, p_answers: answers });
    if (error) return { ...fail(error), answers };
    schedule(async () => {
      await notifyFormSubmitted(id);
      await notifyClientTurnsForStep(id);
    });
    refresh();
    return undefined;
  }

  // Drafts are written directly; RLS only allows it while the step is active and the
  // response is still a draft.
  const { error } = await supabase
    .from("form_responses")
    .upsert({ step_id: id, answers, status: "draft", updated_by: user.id }, { onConflict: "step_id" });
  if (error) return { ...fail(error), answers };
  return { message: t.forms.draftSaved, answers };
}

// ---------------------------------------------------------------------------
// Uploads: signed URL → browser uploads to Storage → register (docs/PLAN.md §1)
// ---------------------------------------------------------------------------

const fileInfo = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().max(255),
});

export type UploadTicket = { ok: true; path: string; token: string } | { ok: false; error: string };

export async function createUploadAction(projectId: string, stepId: string, file: z.input<typeof fileInfo>): Promise<UploadTicket> {
  await requireUser();
  const info = fileInfo.parse(file);
  const settings = await getUploadSettings();
  if (info.size > settings.maxBytes) return { ok: false, error: "too_large" };
  if (!settings.allowedTypes.includes(info.type)) return { ok: false, error: "wrong_type" };

  const supabase = await createClient();
  const project = await supabase.from("projects").select("id, client_id").eq("id", uuid.parse(projectId)).single();
  if (project.error) return { ok: false, error: "not_allowed" };
  // The step must be one the user can act on; register_upload checks it again in the database.
  const step = await supabase.from("project_steps").select("id").eq("id", uuid.parse(stepId)).eq("project_id", project.data.id).single();
  if (step.error) return { ok: false, error: "not_allowed" };

  const path = `${project.data.client_id}/${project.data.id}/${randomUUID()}-${safeFileName(info.name)}`;
  const { data, error } = await supabase.storage.from("project-files").createSignedUploadUrl(path);
  if (error) return { ok: false, error: "not_allowed" };
  return { ok: true, path: data.path, token: data.token };
}

export async function registerUploadAction(
  stepId: string,
  file: z.input<typeof fileInfo> & { path: string },
): Promise<{ ok: boolean }> {
  await requireUser();
  const info = fileInfo.extend({ path: z.string().min(1).max(1024) }).parse(file);
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_upload", {
    p_step_id: uuid.parse(stepId),
    p_storage_path: info.path,
    p_name: info.name,
    p_size_bytes: info.size,
    p_mime_type: info.type,
  });
  if (error) {
    console.error("register_upload failed:", error.message);
    return { ok: false };
  }
  schedule(() => notifyUpload(uuid.parse(stepId)));
  refresh();
  return { ok: true };
}

export async function removeUploadAction(fileId: string): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("remove_own_upload", { p_file_id: uuid.parse(fileId) });
  if (error || !path) return fail(error);
  // Storage deletes are admin-only in the bucket policy; the RPC above has checked ownership.
  await createAdminClient().storage.from("project-files").remove([path]);
  refresh();
  return undefined;
}

// ---------------------------------------------------------------------------
// Tasks, links and finished uploads
// ---------------------------------------------------------------------------

export async function completeClientStepAction(stepId: string): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const id = uuid.parse(stepId);
  const { error } = await supabase.rpc("complete_client_step", { p_step_id: id });
  if (error) return fail(error);
  schedule(() => notifyClientTurnsForStep(id));
  refresh();
  return { message: c.step.markedDone };
}

// ---------------------------------------------------------------------------
// Comments (client and studio)
// ---------------------------------------------------------------------------

export async function addCommentAction(
  target: { stepId?: string; changeRequestId?: string },
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const body = z.string().trim().min(1).max(10_000).safeParse(formData.get("body"));
  if (!body.success) return { error: c.comments.required };

  // Only an admin with a verified session may post internal comments; RLS enforces it too.
  const session = await getSessionUser();
  const internal = formData.get("internal") === "on" && session?.aal === "aal2" && (await isAdminAccount());

  const supabase = await createClient();
  const stepId = target.stepId ? uuid.parse(target.stepId) : null;
  const changeRequestId = target.changeRequestId ? uuid.parse(target.changeRequestId) : null;
  const parent = stepId
    ? await supabase.from("project_steps").select("project_id").eq("id", stepId).single()
    : await supabase.from("change_requests").select("project_id").eq("id", changeRequestId ?? "").single();
  if (parent.error) return fail(parent.error);

  const { data: comment, error } = await supabase.from("comments").insert({
    step_id: stepId,
    change_request_id: changeRequestId,
    project_id: parent.data.project_id,
    author_id: user.id,
    body: body.data,
    internal,
  }).select("id").single();
  if (error) return fail(error);
  schedule(() => notifyComment(comment.id));
  refresh();
  return { message: c.comments.sent };
}
