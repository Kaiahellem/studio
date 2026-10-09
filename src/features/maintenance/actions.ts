"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { kronerToOre, todayInOslo } from "@/lib/format/nb";
import { parseDuration } from "@/lib/format/duration";
import { safeFileName } from "@/lib/format/file";
import { checkbox, firstError, formObject, optionalDate, optionalText, requiredText, uuid } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { getUploadSettings } from "@/features/steps/settings";
import { t } from "@/i18n/nb";
import { checkHours, notifyNewRequest, notifyRequestStatus, schedule } from "@/features/notifications/notify";

const cr = t.client.requests;
const sr = t.studio.requests;

const durationField = (required: boolean) =>
  z
    .string()
    .nullable()
    .transform((v, ctx) => {
      if (!v?.trim()) {
        if (required) ctx.addIssue({ code: "custom", message: sr.invalidDuration });
        return null;
      }
      const minutes = parseDuration(v);
      if (minutes === null) ctx.addIssue({ code: "custom", message: sr.invalidDuration });
      return minutes;
    });

// ---------------------------------------------------------------------------
// Client: "Meld inn endring"
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  title: requiredText(cr.titleRequired, 200),
  description: optionalText(20_000),
  urgency: z.enum(["normal", "urgent"]).catch("normal"),
});

export async function createRequestAction(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse(formObject(formData, ["title", "description", "urgency"]));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const project = await supabase.from("projects").select("id, client_id").eq("id", uuid.parse(projectId)).single();
  if (project.error) return { error: t.client.step.notAllowed };

  // Status, billing and estimate are set by the database for client requests.
  const created = await supabase
    .from("change_requests")
    .insert({ ...parsed.data, client_id: project.data.client_id, project_id: project.data.id, created_by: user.id })
    .select("id")
    .single();
  if (created.error) return { error: t.client.step.notAllowed };
  schedule(() => notifyNewRequest(created.data.id));
  redirect(`/p/${project.data.id}/endringer/${created.data.id}?sendt=1`);
}

const fileInfo = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive(), type: z.string().max(255) });

export async function createRequestUploadAction(requestId: string, file: z.input<typeof fileInfo>) {
  await requireUser();
  const info = fileInfo.parse(file);
  const settings = await getUploadSettings();
  if (info.size > settings.maxBytes) return { ok: false as const, error: "too_large" };
  if (!settings.allowedTypes.includes(info.type)) return { ok: false as const, error: "wrong_type" };

  const supabase = await createClient();
  const request = await supabase.from("change_requests").select("id, client_id, project_id").eq("id", uuid.parse(requestId)).single();
  if (request.error) return { ok: false as const, error: "not_allowed" };
  const path = `${request.data.client_id}/${request.data.project_id}/requests/${randomUUID()}-${safeFileName(info.name)}`;
  const { data, error } = await supabase.storage.from("project-files").createSignedUploadUrl(path);
  if (error) return { ok: false as const, error: "not_allowed" };
  return { ok: true as const, path: data.path, token: data.token };
}

export async function registerRequestUploadAction(requestId: string, file: z.input<typeof fileInfo> & { path: string }) {
  await requireUser();
  const info = fileInfo.extend({ path: z.string().max(1024) }).parse(file);
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_request_upload", {
    p_change_request_id: uuid.parse(requestId),
    p_storage_path: info.path,
    p_name: info.name,
    p_size_bytes: info.size,
    p_mime_type: info.type,
  });
  if (!error) refresh();
  return { ok: !error };
}

// ---------------------------------------------------------------------------
// Studio: triage and time
// ---------------------------------------------------------------------------

const triageSchema = z.object({
  status: z.enum(["new", "accepted", "in_progress", "waiting_on_client", "done", "declined"]),
  billing: z.enum(["included", "extra", "quote_needed"]),
  estimate_minutes: durationField(false),
});

export async function updateRequestAction(requestId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = triageSchema.safeParse(formObject(formData, ["status", "billing", "estimate_minutes"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const id = uuid.parse(requestId);
  const before = await supabase.from("change_requests").select("status, project_id").eq("id", id).single();
  const { error } = await supabase.from("change_requests").update(parsed.data).eq("id", id);
  if (error || !before.data) return { error: t.studio.errors.generic };
  const previous = before.data.status;
  const projectId = before.data.project_id;
  schedule(async () => {
    await notifyRequestStatus(id, previous);
    // A change of billing can move time into or out of the allowance.
    await checkHours(projectId);
  });
  refresh();
  return { message: sr.saved };
}

const timeSchema = z.object({
  minutes: durationField(true),
  entry_date: optionalDate,
  description: optionalText(500),
});

export async function addRequestTimeAction(requestId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = timeSchema.safeParse(formObject(formData, ["minutes", "entry_date", "description"]));
  if (!parsed.success || !parsed.data.minutes) return { error: parsed.success ? sr.invalidDuration : firstError(parsed.error) };
  const supabase = await createClient();
  const request = await supabase.from("change_requests").select("project_id").eq("id", uuid.parse(requestId)).single();
  if (request.data) {
    const projectId = request.data.project_id;
    schedule(() => checkHours(projectId));
  }
  const { error } = await supabase.from("time_entries").insert({
    change_request_id: uuid.parse(requestId),
    minutes: parsed.data.minutes,
    description: parsed.data.description,
    ...(parsed.data.entry_date ? { entry_date: parsed.data.entry_date } : {}),
  });
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return undefined;
}

export async function deleteTimeAction(timeEntryId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", uuid.parse(timeEntryId));
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return undefined;
}

// ---------------------------------------------------------------------------
// Studio: maintenance log
// ---------------------------------------------------------------------------

const logSchema = z.object({
  title: requiredText(t.studio.projects.titleRequired, 200),
  description: optionalText(5000),
  entry_date: optionalDate,
  minutes: durationField(false),
  visible_to_client: checkbox,
});

export async function addLogAction(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = logSchema.safeParse(formObject(formData, ["title", "description", "entry_date", "minutes", "visible_to_client"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_maintenance_log", {
    p_project_id: uuid.parse(projectId),
    p_entry_date: v.entry_date ?? todayInOslo(),
    p_title: v.title,
    p_description: v.description ?? undefined,
    p_visible_to_client: v.visible_to_client,
    p_minutes: v.minutes ?? undefined,
  });
  if (error) return { error: t.studio.errors.generic };
  schedule(() => checkHours(uuid.parse(projectId)));
  refresh();
  return { message: t.studio.maintenance.added };
}

export async function deleteLogAction(entryId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_log").delete().eq("id", uuid.parse(entryId));
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return undefined;
}

// ---------------------------------------------------------------------------
// Studio: plans and agreements
// ---------------------------------------------------------------------------

const planSchema = z.object({
  name: requiredText(t.studio.projects.titleRequired, 120),
  description: optionalText(500),
  price: z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, t.studio.plans.invalidPrice)
    .transform((v) => kronerToOre(Number(v))),
  hours: durationField(true),
  includes: z
    .string()
    .nullable()
    .transform((v) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean)),
  response_time: optionalText(120),
  notice_period: optionalText(120),
  is_active: checkbox,
});

export async function savePlanAction(planId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = planSchema.safeParse(
    formObject(formData, ["name", "description", "price", "hours", "includes", "response_time", "notice_period", "is_active"]),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { price, hours, ...rest } = parsed.data;
  const row = { ...rest, monthly_price_ore: price, included_minutes_per_month: hours ?? 0 };
  const supabase = await createClient();
  const { error } = planId
    ? await supabase.from("maintenance_plans").update(row).eq("id", uuid.parse(planId))
    : await supabase.from("maintenance_plans").insert(row);
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return { message: t.studio.plans.saved };
}

const agreementSchema = z.object({
  project_id: uuid,
  plan_id: uuid,
  status: z.enum(["proposed", "active", "paused", "ended"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.studio.agreements.startRequired),
  end_date: optionalDate,
  price_override: z
    .string()
    .nullable()
    .transform((v, ctx) => {
      if (!v?.trim()) return null;
      if (!/^\d{1,7}$/.test(v.trim())) ctx.addIssue({ code: "custom", message: t.studio.plans.invalidPrice });
      return kronerToOre(Number(v.trim()));
    }),
  minutes_override: durationField(false),
});

export async function saveAgreementAction(clientId: string, agreementId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = agreementSchema.safeParse(
    formObject(formData, ["project_id", "plan_id", "status", "start_date", "end_date", "price_override", "minutes_override"]),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { price_override, ...rest } = parsed.data;
  const row = { ...rest, client_id: uuid.parse(clientId), price_override_ore: price_override };
  const supabase = await createClient();
  const { error } = agreementId
    ? await supabase.from("maintenance_agreements").update(row).eq("id", uuid.parse(agreementId))
    : await supabase.from("maintenance_agreements").insert(row);
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return { message: t.studio.agreements.saved };
}
