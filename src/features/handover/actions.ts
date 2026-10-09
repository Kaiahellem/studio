"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { safeFileName } from "@/lib/format/file";
import { checkbox, firstError, formObject, optionalDate, optionalText, optionalUrl, requiredText, uuid } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";
import { parseColours, parseContacts, parseFonts, parseLinks, sectionContent, type SectionKind } from "./content";

const h = t.studio.handover;
const s = t.studio.site;

const done = (error: { message: string } | null, message?: string): FormState => {
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return message ? { message } : undefined;
};

// ---------------------------------------------------------------------------
// Site details
// ---------------------------------------------------------------------------

const party = z
  .enum(["client", "studio", ""])
  .nullable()
  .transform((v) => (v ? v : null));

const siteSchema = z.object({
  domain_name: optionalText(255),
  registrar: optionalText(255),
  domain_owner: party,
  domain_renewal_date: optionalDate,
  hosting_provider: optionalText(255),
  hosting_owner: party,
  hosting_renewal_date: optionalDate,
  dns_provider: optionalText(255),
  email_provider: optionalText(255),
  access_notes: optionalText(5000),
  google_business_profile_url: optionalUrl(t.studio.projects.invalidUrl),
  analytics_notes: optionalText(5000),
});

export async function updateSiteAction(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = siteSchema.safeParse(formObject(formData, Object.keys(siteSchema.shape)));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_details")
    .upsert({ project_id: uuid.parse(projectId), ...parsed.data, updated_by: admin.id });
  return done(error, s.saved);
}

// ---------------------------------------------------------------------------
// Handover page
// ---------------------------------------------------------------------------

export async function createHandoverAction(projectId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_handover_page", { p_project_id: uuid.parse(projectId) });
  return done(error);
}

export async function setPublishedAction(pageId: string, published: boolean): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("handover_pages")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("id", uuid.parse(pageId));
  return done(error);
}

export async function setPublicAction(pageId: string, enabled: boolean): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("handover_pages").update({ public_enabled: enabled }).eq("id", uuid.parse(pageId));
  return done(error);
}

export async function regenerateTokenAction(pageId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_handover_token", { p_page_id: uuid.parse(pageId) });
  return done(error);
}

export async function addCustomSectionAction(pageId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = uuid.parse(pageId);
  const last = await supabase.from("handover_sections").select("position").eq("page_id", id).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("handover_sections").insert({
    page_id: id,
    kind: "custom",
    title: h.kinds.custom,
    position: (last.data?.[0]?.position ?? 0) + 1,
  });
  return done(error);
}

// Turns the section form into content of the right shape for its kind.
function contentFrom(kind: SectionKind, formData: FormData): unknown {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  switch (kind) {
    case "logos":
      return { intro: text("intro") || undefined, file_ids: formData.getAll("file_ids").map(String) };
    case "colours":
      return { colours: parseColours(text("colours")) };
    case "fonts":
      return { fonts: parseFonts(text("fonts")) };
    case "website_guide":
      return { text: text("text"), links: parseLinks(text("links")) };
    case "domain_hosting":
      return { note: text("note") || undefined };
    case "links_contacts":
      return { links: parseLinks(text("links")), contacts: parseContacts(text("contacts")) };
    case "access_notes":
    case "custom":
      return { text: text("text") };
  }
}

export async function updateSectionAction(sectionId: string, kind: SectionKind, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const title = requiredText(t.studio.projects.titleRequired, 120).safeParse(formData.get("title"));
  if (!title.success) return { error: firstError(title.error) };
  const content = sectionContent[kind].safeParse(contentFrom(kind, formData));
  if (!content.success) return { error: firstError(content.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("handover_sections")
    .update({ title: title.data, content: content.data, visible: checkbox.parse(formData.get("visible")) })
    .eq("id", uuid.parse(sectionId));
  return done(error, h.saved);
}

// ---------------------------------------------------------------------------
// Studio uploads (final logo files for the handover page)
// ---------------------------------------------------------------------------

const fileInfo = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive(), type: z.string().max(255) });

export async function createStudioUploadAction(
  projectId: string,
  file: z.input<typeof fileInfo>,
): Promise<{ ok: true; path: string; token: string } | { ok: false }> {
  await requireAdmin();
  const info = fileInfo.parse(file);
  const supabase = await createClient();
  const project = await supabase.from("projects").select("id, client_id").eq("id", uuid.parse(projectId)).single();
  if (project.error) return { ok: false };
  const path = `${project.data.client_id}/${project.data.id}/studio/${randomUUID()}-${safeFileName(info.name)}`;
  const { data, error } = await supabase.storage.from("project-files").createSignedUploadUrl(path);
  return error ? { ok: false } : { ok: true, path: data.path, token: data.token };
}

export async function registerStudioUploadAction(projectId: string, file: z.input<typeof fileInfo> & { path: string }): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  const info = fileInfo.extend({ path: z.string().max(1024) }).parse(file);
  const supabase = await createClient();
  const project = await supabase.from("projects").select("id, client_id").eq("id", uuid.parse(projectId)).single();
  if (project.error || !info.path.startsWith(`${project.data.client_id}/${project.data.id}/studio/`)) return { ok: false };
  const { error } = await supabase.from("files").insert({
    client_id: project.data.client_id,
    project_id: project.data.id,
    uploaded_by: admin.id,
    storage_path: info.path,
    name: info.name,
    size_bytes: info.size,
    mime_type: info.type || "application/octet-stream",
  });
  if (!error) refresh();
  return { ok: !error };
}
