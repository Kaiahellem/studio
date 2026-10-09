import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="flex max-w-2xl flex-col gap-8">
      <Link href={`/p/${projectId}/endringer`} className="text-sm underline underline-offset-4 hover:no-underline">
        <span aria-hidden="true">← </span>
        {r.heading}
      </Link>
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-4xl tracking-tight">{r.new}</h1>
        <p className="text-lg leading-relaxed text-muted">{r.intro}</p>
      </header>
      <ActionForm action={createRequestAction.bind(null, projectId)} submitLabel={r.submit} pendingLabel={t.forms.submitting}>
        <Field label={r.title} hint={r.titleHint} name="title" required maxLength={200} />
        <TextArea label={r.description} hint={r.descriptionHint} name="description" rows={6} />
        <Select
          label={r.urgency}
          name="urgency"
          defaultValue="normal"
          options={(["normal", "urgent"] as const).map((u) => ({ value: u, label: r.urgencyOptions[u] }))}
        />
        <p className="text-sm text-muted">{r.attachHint}</p>
      </ActionForm>
    </div>
  );
}
