"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { safeFileName } from "@/lib/format/file";
import { checkbox, firstError, formObject, optionalDate, optionalText, optionalUrl, requiredText, uuid } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const s = t.studio.step;
const d = t.studio.documents;

// ---------------------------------------------------------------------------
// Approval rounds
// ---------------------------------------------------------------------------

export async function openRoundAction(stepId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({ note: optionalText(5000), link: optionalUrl(t.studio.projects.invalidUrl) })
    .safeParse(formObject(formData, ["note", "link"]));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_approval_round", {
    p_step_id: uuid.parse(stepId),
    p_note: parsed.data.note ?? undefined,
    p_link: parsed.data.link ?? undefined,
  });
  if (error) {
    if (error.message.includes("already open")) return { error: s.roundAlreadyOpen };
    if (error.message.includes("not active")) return { error: s.notActive };
    return { error: t.studio.errors.generic };
  }
  refresh();
  return { message: s.roundOpened(data) };
}

// ---------------------------------------------------------------------------
// Documents: a PDF in Storage, or a link (Fiken, signing service). The hub only stores them.
// ---------------------------------------------------------------------------

export async function createDocumentUploadAction(
  projectId: string,
  file: { name: string; size: number; type: string },
): Promise<{ ok: true; path: string; token: string } | { ok: false }> {
  await requireAdmin();
  const supabase = await createClient();
  const project = await supabase.from("projects").select("id, client_id").eq("id", uuid.parse(projectId)).single();
  if (project.error) return { ok: false };
  const path = `${project.data.client_id}/${project.data.id}/documents/${randomUUID()}-${safeFileName(z.string().max(255).parse(file.name))}`;
  const { data, error } = await supabase.storage.from("project-files").createSignedUploadUrl(path);
  if (error) return { ok: false };
  return { ok: true, path: data.path, token: data.token };
}

const documentSchema = z.object({
  type: z.enum(["proposal", "contract", "invoice", "other"]),
  title: requiredText(t.studio.projects.titleRequired),
  status: z.enum(["draft", "sent", "accepted", "signed", "paid", "void"]),
  document_date: optionalDate,
  step_id: z
    .string()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(uuid.nullable()),
  visible_to_client: checkbox,
});
const documentKeys = ["type", "title", "status", "document_date", "step_id", "visible_to_client"] as const;

export async function addDocumentAction(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = uuid.parse(projectId);
  const parsed = documentSchema.safeParse(formObject(formData, documentKeys));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const link = optionalUrl(t.studio.projects.invalidUrl).safeParse(formData.get("external_url"));
  if (!link.success) return { error: firstError(link.error) };
  const storagePath = z.string().min(1).max(1024).nullable().catch(null).parse(formData.get("storage_path"));
  // The uploaded file must sit in this project's folder.
  const project = await (await createClient()).from("projects").select("client_id").eq("id", id).single();
  if (project.error) return { error: t.studio.errors.generic };
  const validPath = storagePath?.startsWith(`${project.data.client_id}/${id}/documents/`) ? storagePath : null;
  if (Boolean(validPath) === Boolean(link.data)) return { error: d.fileOrLink };

  const supabase = await createClient();
  const { document_date, ...rest } = parsed.data;
  const created = await supabase
    .from("documents")
    .insert({
      ...rest,
      ...(document_date ? { document_date } : {}),
      project_id: id,
      storage_path: validPath,
      external_url: validPath ? null : link.data,
    })
    .select("id")
    .single();
  if (created.error) return { error: t.studio.errors.generic };

  await supabase.from("activity_log").insert({
    client_id: project.data.client_id,
    project_id: id,
    actor_id: admin.id,
    event: "document.added",
    entity_type: "document",
    entity_id: created.data.id,
    data: { title: rest.title },
  });
  refresh();
  return { message: d.added };
}

export async function updateDocumentAction(documentId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = documentSchema.safeParse(formObject(formData, documentKeys));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { document_date, ...rest } = parsed.data;

  const supabase = await createClient();
  const updated = await supabase
    .from("documents")
    .update({ ...rest, ...(document_date ? { document_date } : {}) })
    .eq("id", uuid.parse(documentId))
    .select("id, project_id, projects(client_id)")
    .single();
  if (updated.error || !updated.data.projects) return { error: t.studio.errors.generic };

  await supabase.from("activity_log").insert({
    client_id: updated.data.projects.client_id,
    project_id: updated.data.project_id,
    actor_id: admin.id,
    event: "document.updated",
    entity_type: "document",
    entity_id: updated.data.id,
    data: { title: rest.title, status: rest.status },
  });
  refresh();
  return { message: d.saved };
}

export async function deleteDocumentAction(documentId: string): Promise<FormState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const deleted = await supabase
    .from("documents")
    .delete()
    .eq("id", uuid.parse(documentId))
    .select("id, title, storage_path, project_id, projects(client_id)")
    .single();
  if (deleted.error || !deleted.data.projects) return { error: t.studio.errors.generic };

  if (deleted.data.storage_path) await createAdminClient().storage.from("project-files").remove([deleted.data.storage_path]);
  await supabase.from("activity_log").insert({
    client_id: deleted.data.projects.client_id,
    project_id: deleted.data.project_id,
    actor_id: admin.id,
    event: "document.deleted",
    entity_type: "document",
    entity_id: deleted.data.id,
    data: { title: deleted.data.title },
  });
  refresh();
  return undefined;
}
