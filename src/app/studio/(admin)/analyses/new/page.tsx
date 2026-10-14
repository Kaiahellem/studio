import type { Metadata } from "next";
import { Card } from "@/components/ds/card";
import { PageHeader } from "@/components/ds/page-header";
import { ActionForm, Field, TextArea } from "@/components/form";
import { createAnalysisAction } from "@/features/analysis/actions";
import { t } from "@/i18n/nb";

const a = t.studio.analysis;

export const metadata: Metadata = { title: a.new };
// The first run starts right after the form is sent and continues in the background.
export const maxDuration = 300;

export default function NewAnalysisPage() {
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <PageHeader title={a.new} trail={[{ label: a.heading, href: "/studio/analyses" }]} />
      <Card>
        <ActionForm action={createAnalysisAction} submitLabel={a.form.create} pendingLabel={t.common.loading}>
          <Field label={a.form.url} hint={a.form.urlHint} name="url" type="text" inputMode="url" autoComplete="url" required spellCheck={false} />
          <Field label={a.form.businessName} name="business_name" required autoComplete="organization" />
          <TextArea label={a.form.problems} hint={a.form.notesHint} name="stated_problems" rows={3} grow />
          <TextArea label={a.form.goals} hint={a.form.notesHint} name="goals" rows={3} grow />
        </ActionForm>
      </Card>
    </div>
  );
}
