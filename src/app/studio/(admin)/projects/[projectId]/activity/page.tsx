import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, PageHeader } from "@/components/ui";
import { getActivity } from "@/features/steps/admin-queries";
import { formatDateTime } from "@/lib/format/date";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const a = t.studio.activity;

export const metadata: Metadata = { title: a.heading };

export default async function ActivityPage({ params }: PageProps<"/studio/projects/[projectId]/activity">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, events } = await getActivity(projectId);

  return (
    <>
      <PageHeader
        title={a.heading}
        eyebrow={
          <Link href={`/studio/projects/${project.id}`} className="underline underline-offset-4 hover:no-underline">
            {project.clients?.name} · {project.name}
          </Link>
        }
      />
      {events.length === 0 ? (
        <Empty>{a.empty}</Empty>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {events.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <time dateTime={e.at} className="shrink-0 text-sm text-muted sm:w-56">
                {formatDateTime(e.at)}
              </time>
              <p>
                <span className="font-medium">{e.actor ?? a.someone}</span> {a.events[e.event] ?? e.event}
                {e.subject && <span className="text-muted"> · {e.subject}</span>}
                {e.round !== null && <span className="text-muted"> · {t.client.step.round(e.round, null)}</span>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
