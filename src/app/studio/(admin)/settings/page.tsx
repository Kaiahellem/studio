import type { Metadata } from "next";
import { ActionForm, Field } from "@/components/form";
import { PageHeader, Section } from "@/components/ui";
import { updateSettingsAction } from "@/features/privacy/actions";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const s = t.studio.settings;

export const metadata: Metadata = { title: s.heading };

export default async function SettingsPage() {
  await requireAdmin("/studio/settings");
  const supabase = await createClient();
  const { data: settings, error } = await supabase.from("app_settings").select("*").single();
  if (error) throw error;

  return (
    <div className="max-w-2xl">
      <PageHeader title={s.heading} />
      <ActionForm action={updateSettingsAction} submitLabel={s.save} pendingLabel={t.common.loading}>
        <Section id="reminders" title={s.reminders}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={s.afterDays} name="reminder_after_days" type="number" min={1} max={60} required defaultValue={settings.reminder_after_days} />
            <Field label={s.intervalDays} name="reminder_interval_days" type="number" min={1} max={60} required defaultValue={settings.reminder_interval_days} />
          </div>
        </Section>
        <Section id="uploads" title={s.uploads}>
          <div className="flex flex-col gap-6">
            <Field label={s.maxSize} name="max_upload_mb" type="number" min={1} max={500} required defaultValue={Math.round(settings.max_upload_bytes / 1024 / 1024)} />
            <fieldset>
              <legend className="mb-3 text-sm font-medium">{s.types}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(s.mime).map(([type, label]) => (
                  <label key={type} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="types" value={type} defaultChecked={settings.allowed_mime_types.includes(type)} className="size-5 accent-accent" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Section>
      </ActionForm>
    </div>
  );
}
