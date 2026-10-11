import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddRow } from "@/components/ds/add-row";
import { Card, cardClass } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { ActionButton, ActionForm, Checkbox, Field, TextArea } from "@/components/form";
import { addLogAction, deleteLogAction } from "@/features/maintenance/actions";
import { HoursMeter } from "@/features/maintenance/components";
import { getMaintenanceForAdmin } from "@/features/maintenance/queries";
import { formatDate, formatMinutes, formatMonth, todayInOslo } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const m = t.studio.maintenance;

export const metadata: Metadata = { title: m.heading };

export default async function MaintenanceLogPage({ params }: PageProps<"/studio/projects/[projectId]/maintenance">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, agreement, usage, log } = await getMaintenanceForAdmin(projectId);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={m.heading} trail={[{ label: project.name, href: `/studio/projects/${project.id}` }]} eyebrow={project.clients?.name} />

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="log" className="flex min-w-0 flex-col gap-4">
          <h2 id="log" className="text-title-l">
            {m.heading}
          </h2>
          <AddRow label={m.add}>
            <div className={cardClass("card")}>
              <ActionForm action={addLogAction.bind(null, project.id)} submitLabel={m.add} pendingLabel={t.common.loading}>
                <Field label={m.title} hint={m.titleHint} name="title" required />
                <TextArea label={m.description} name="description" rows={3} grow />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={m.date} name="entry_date" type="date" defaultValue={todayInOslo()} />
                  <Field label={m.duration} hint={t.studio.requests.durationHint} name="minutes" inputMode="decimal" />
                </div>
                <Checkbox label={m.visible} name="visible_to_client" defaultChecked />
              </ActionForm>
            </div>
          </AddRow>
          {log.length === 0 ? (
            <Card>
              <EmptyState>{m.empty}</EmptyState>
            </Card>
          ) : (
            <InsetGroupedList label={m.heading}>
              {log.map((e) => (
                <InsetRow
                  key={e.id}
                  actions={
                    <ActionButton
                      action={deleteLogAction.bind(null, e.id)}
                      label={t.common.delete}
                      ariaLabel={m.delete(e.title)}
                      confirm={m.confirmDelete(e.title)}
                      variant="ghost"
                    />
                  }
                >
                  <div className="flex flex-col gap-0.5 py-2">
                    <p className="font-medium">{e.title}</p>
                    {e.description && <p className="whitespace-pre-line text-ink-secondary">{e.description}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-small text-ink-secondary">
                      <span className="tabular-nums">
                        {formatDate(e.entry_date)}
                        {e.minutes ? ` · ${formatMinutes(e.minutes)}` : ""}
                      </span>
                      {!e.visible_to_client && <Tag>{t.studio.labels.hidden}</Tag>}
                    </p>
                  </div>
                </InsetRow>
              ))}
            </InsetGroupedList>
          )}
        </section>

        {agreement && usage && (
          <div>
            <Section id="usage" title={t.studio.agreements.heading} description={agreement.maintenance_plans?.name}>
              <HoursMeter used={usage.used_minutes} included={usage.included_minutes} month={formatMonth(todayInOslo())} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
