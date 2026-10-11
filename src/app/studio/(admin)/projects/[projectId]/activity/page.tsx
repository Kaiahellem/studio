import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { getActivity } from "@/features/steps/admin-queries";
import { formatDateTime } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const a = t.studio.activity;

export const metadata: Metadata = { title: a.heading };

export default async function ActivityPage({ params }: PageProps<"/studio/projects/[projectId]/activity">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, events } = await getActivity(projectId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={a.heading}
        trail={[{ label: project.name, href: `/studio/projects/${project.id}` }]}
        eyebrow={project.clients?.name}
      />
      {events.length === 0 ? (
        <Card>
          <EmptyState>{a.empty}</EmptyState>
        </Card>
      ) : (
        <InsetGroupedList ordered label={a.heading}>
          {events.map((e) => (
            <InsetRow key={e.id}>
              <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-6">
                <time dateTime={e.at} className="shrink-0 text-small text-ink-secondary tabular-nums sm:w-48 sm:pt-px">
                  {formatDateTime(e.at)}
                </time>
                <p>
                  <span className="font-medium">{e.actor ?? a.someone}</span> {a.events[e.event] ?? e.event}
                  {e.subject && <span className="text-ink-secondary"> · {e.subject}</span>}
                  {e.round !== null && <span className="text-ink-secondary"> · {t.client.step.round(e.round, null)}</span>}
                </p>
              </div>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}
    </div>
  );
}
