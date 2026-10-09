import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm, Checkbox, Field, TextArea } from "@/components/form";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { addLogAction, deleteLogAction } from "@/features/maintenance/actions";
import { HoursMeter } from "@/features/maintenance/components";
import { getMaintenanceForAdmin } from "@/features/maintenance/queries";
import { formatDate, formatMonth, todayInOslo } from "@/lib/format/date";
import { formatMinutes } from "@/lib/format/money";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const m = t.studio.maintenance;

export const metadata: Metadata = { title: m.heading };

export default async function MaintenanceLogPage({ params }: PageProps<"/studio/projects/[projectId]/maintenance">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, agreement, usage, log } = await getMaintenanceForAdmin(projectId);

  return (
    <>
      <PageHeader
        title={m.heading}
        eyebrow={
          <Link href={`/studio/projects/${project.id}`} className="underline underline-offset-4 hover:no-underline">
            {project.clients?.name} · {project.name}
          </Link>
        }
      />
      <div className="grid gap-x-12 lg:grid-cols-[3fr_2fr]">
        <Section id="log" title={m.heading}>
          {log.length === 0 ? (
            <Empty>{m.empty}</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {log.map((e) => (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{e.title}</p>
                    {e.description && <p className="whitespace-pre-line text-sm">{e.description}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      {formatDate(e.entry_date)}
                      {e.minutes ? ` · ${formatMinutes(e.minutes)}` : ""}
                      {!e.visible_to_client && <Badge tone="muted">{t.studio.labels.hidden}</Badge>}
                    </p>
                  </div>
                  <ActionButton
                    action={deleteLogAction.bind(null, e.id)}
                    label={t.common.delete}
                    ariaLabel={m.delete(e.title)}
                    confirm={m.confirmDelete(e.title)}
                    variant="danger"
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <div>
          {agreement && usage && (
            <Section id="usage" title={t.studio.agreements.heading}>
              <p className="mb-4 text-sm text-muted">{agreement.maintenance_plans?.name}</p>
              <HoursMeter used={usage.used_minutes} included={usage.included_minutes} month={formatMonth(todayInOslo())} />
            </Section>
          )}
          <Section id="add-log" title={m.add}>
            <ActionForm action={addLogAction.bind(null, project.id)} submitLabel={m.add} pendingLabel={t.common.loading}>
              <Field label={m.title} hint={m.titleHint} name="title" required />
              <TextArea label={m.description} name="description" rows={3} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={m.date} name="entry_date" type="date" defaultValue={todayInOslo()} />
                <Field label={m.duration} hint={t.studio.requests.durationHint} name="minutes" inputMode="decimal" />
              </div>
              <Checkbox label={m.visible} name="visible_to_client" defaultChecked />
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}
