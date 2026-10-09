import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, Select } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { createProjectAction } from "@/features/projects/actions";
import { getNewProjectOptions } from "@/features/projects/queries";
import { todayInOslo } from "@/lib/format/date";
import { t } from "@/i18n/nb";

const p = t.studio.projects;

export const metadata: Metadata = { title: p.new };

export default async function NewProjectPage({ searchParams }: PageProps<"/studio/projects/new">) {
  const [{ client }, options] = await Promise.all([searchParams, getNewProjectOptions()]);
  const preselected = typeof client === "string" ? client : undefined;

  if (options.clients.length === 0) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={p.new} />
        <p className="mb-6 text-muted">{t.studio.clients.empty}</p>
        <Link href="/studio/clients/new" className="underline underline-offset-4">
          {t.studio.clients.new}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={p.new} />
      <ActionForm action={createProjectAction} submitLabel={p.create} pendingLabel={t.common.loading}>
        <Select
          label={p.client}
          name="client_id"
          required
          defaultValue={preselected}
          options={options.clients.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          label={p.template}
          name="template_id"
          required
          options={options.templates.map((tpl) => ({ value: tpl.id, label: tpl.name }))}
        />
        <Field label={p.name} name="name" required placeholder={p.namePlaceholder} />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label={p.startDate} hint={p.startDateHint} name="start_date" type="date" defaultValue={todayInOslo()} />
          <Field label={p.targetLaunch} name="target_launch_date" type="date" />
        </div>
      </ActionForm>
    </div>
  );
}
