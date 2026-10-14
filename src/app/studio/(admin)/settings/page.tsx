import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { ActionForm, Checkbox, Field, TextArea } from "@/components/form";
import { savePageLimitAction, savePromptAction } from "@/features/analysis/actions";
import { getPromptVersions } from "@/features/analysis/queries";
import { updateSettingsAction } from "@/features/privacy/actions";
import { formatDate } from "@/lib/format/nb";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const s = t.studio.settings;
const as = t.studio.analysis.settings;

export const metadata: Metadata = { title: s.heading };

export default async function SettingsPage() {
  await requireAdmin("/studio/settings");
  const supabase = await createClient();
  const [{ data: settings, error }, versions] = await Promise.all([supabase.from("app_settings").select("*").single(), getPromptVersions()]);
  if (error) throw error;
  const [current, ...earlier] = versions;

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <PageHeader title={s.heading} />
      <ActionForm action={updateSettingsAction} submitLabel={s.save} pendingLabel={t.common.loading} className="flex flex-col gap-10">
        <Section id="reminders" title={s.reminders}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={s.afterDays} name="reminder_after_days" type="number" min={1} max={60} required defaultValue={settings.reminder_after_days} />
            <Field label={s.intervalDays} name="reminder_interval_days" type="number" min={1} max={60} required defaultValue={settings.reminder_interval_days} />
          </div>
        </Section>
        <Section id="uploads" title={s.uploads}>
          <Field label={s.maxSize} name="max_upload_mb" type="number" min={1} max={500} required defaultValue={Math.round(settings.max_upload_bytes / 1024 / 1024)} />
            <fieldset>
              <legend className="mb-1 text-label">{s.types}</legend>
              <div className="grid gap-x-4 sm:grid-cols-2">
                {Object.entries(s.mime).map(([type, label]) => (
                  <Checkbox key={type} label={label} name="types" value={type} defaultChecked={settings.allowed_mime_types.includes(type)} />
                ))}
              </div>
            </fieldset>
        </Section>
      </ActionForm>

      <Section id="analysis" title={as.heading}>
        <ActionForm action={savePageLimitAction} submitLabel={as.savePageLimit} pendingLabel={t.common.loading}>
          <Field label={as.pageLimit} hint={as.pageLimitHint} name="analysis_page_limit" type="number" min={1} max={50} required defaultValue={settings.analysis_page_limit} />
        </ActionForm>
        {current && (
          <ActionForm action={savePromptAction} submitLabel={as.saveInstructions} pendingLabel={t.common.loading}>
            <TextArea
              label={`${as.instructions} (${t.studio.analysis.version(current.version)})`}
              hint={as.instructionsHint}
              name="body"
              rows={14}
              grow
              required
              defaultValue={current.body.trim()}
            />
          </ActionForm>
        )}
        {earlier.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-title-s">{as.history}</h3>
            {earlier.map((v) => (
              <details key={v.id}>
                <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-control px-2 text-small text-ink-secondary hover:bg-hover hover:text-ink md:min-h-9">
                  {as.versionBy(v.version, formatDate(v.created_at))}
                </summary>
                <p className="mt-2 whitespace-pre-line rounded-inset bg-inset p-4 text-body-compact">{v.body.trim()}</p>
              </details>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
