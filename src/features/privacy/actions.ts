"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { uuid } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const p = t.studio.privacy;
const s = t.studio.settings;

// Permanent GDPR delete: database rows (purge_client), then files, then member accounts that
// belonged only to this client. Requires typing the client's name.
export async function deleteClientAction(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = uuid.parse(clientId);
  const supabase = await createClient();
  const client = await supabase.from("clients").select("name").eq("id", id).single();
  if (client.error) return { error: t.studio.errors.generic };
  if (String(formData.get("confirm") ?? "").trim() !== client.data.name) return { error: p.confirmMismatch };

  const { data, error } = await supabase.rpc("purge_client", { p_client_id: id });
  if (error || !data?.[0]) return { error: t.studio.errors.generic };
  const { storage_paths, member_ids } = data[0];

  const admin = createAdminClient();
  for (let i = 0; i < storage_paths.length; i += 100) {
    await admin.storage.from("project-files").remove(storage_paths.slice(i, i + 100));
  }
  for (const userId of member_ids) await admin.auth.admin.deleteUser(userId);

  redirect(`/studio/clients?slettet=${encodeURIComponent(client.data.name)}`);
}

const wholeNumber = z.coerce.number({ error: s.invalidNumber }).int(s.invalidNumber).min(1, s.invalidNumber);

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({
      reminder_after_days: wholeNumber.max(60, s.invalidNumber),
      reminder_interval_days: wholeNumber.max(60, s.invalidNumber),
      max_upload_mb: wholeNumber.max(500, s.invalidNumber),
      types: z.array(z.string().refine((v) => v in s.mime)).min(1, s.noTypes),
    })
    .safeParse({
      reminder_after_days: formData.get("reminder_after_days"),
      reminder_interval_days: formData.get("reminder_interval_days"),
      max_upload_mb: formData.get("max_upload_mb"),
      types: formData.getAll("types").map(String),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? s.invalidNumber };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_app_settings", {
    p_reminder_after_days: parsed.data.reminder_after_days,
    p_reminder_interval_days: parsed.data.reminder_interval_days,
    p_max_upload_bytes: parsed.data.max_upload_mb * 1024 * 1024,
    p_allowed_mime_types: parsed.data.types,
  });
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return { message: s.saved };
}
