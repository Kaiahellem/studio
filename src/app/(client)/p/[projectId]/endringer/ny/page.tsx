import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ds/card";
import { PageHeader } from "@/components/ds/page-header";
import { ActionForm, Field, Select, TextArea } from "@/components/form";
import { createRequestAction } from "@/features/maintenance/actions";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const r = t.client.requests;

export const metadata: Metadata = { title: r.new };

export default async function NewRequestPage({ params }: PageProps<"/p/[projectId]/endringer/ny">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={r.new} trail={[{ label: r.heading, href: `/p/${projectId}/endringer` }]} />
      <p className="-mt-2 text-body-l text-ink-secondary">{r.intro}</p>
      <Card>
        <ActionForm action={createRequestAction.bind(null, projectId)} submitLabel={r.submit} pendingLabel={t.forms.submitting}>
          <Field label={r.title} hint={r.titleHint} name="title" required maxLength={200} />
          <TextArea label={r.description} hint={r.descriptionHint} name="description" rows={6} grow />
          <Select
            label={r.urgency}
            name="urgency"
            defaultValue="normal"
            options={(["normal", "urgent"] as const).map((u) => ({ value: u, label: r.urgencyOptions[u] }))}
          />
          <p className="text-small text-ink-secondary">{r.attachHint}</p>
        </ActionForm>
      </Card>
    </div>
  );
}
