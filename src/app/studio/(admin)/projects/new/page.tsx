import type { Metadata } from "next";
import { ButtonLink } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { ActionForm, Field, Select } from "@/components/form";
import { createProjectAction } from "@/features/projects/actions";
import { getNewProjectOptions } from "@/features/projects/queries";
import { todayInOslo } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const p = t.studio.projects;

export const metadata: Metadata = { title: p.new };

export default async function NewProjectPage({ searchParams }: PageProps<"/studio/projects/new">) {
  const [{ client }, options] = await Promise.all([searchParams, getNewProjectOptions()]);
  const preselected = typeof client === "string" ? client : undefined;
  const trail = [{ label: t.studio.clients.title, href: "/studio/clients" }];

  if (options.clients.length === 0) {
    return (
      <div className="flex max-w-[760px] flex-col gap-6">
        <PageHeader title={p.new} trail={trail} />
        <Card>
          <EmptyState
            action={
              <ButtonLink href="/studio/clients/new" variant="secondary">
                {t.studio.clients.new}
              </ButtonLink>
            }
          >
            {t.studio.clients.empty}
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <PageHeader title={p.new} trail={trail} />
      <Card>
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={p.startDate} hint={p.startDateHint} name="start_date" type="date" defaultValue={todayInOslo()} />
            <Field label={p.targetLaunch} name="target_launch_date" type="date" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
