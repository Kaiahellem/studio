import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ds/button";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag } from "@/components/ds/tag";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestsForClient } from "@/features/maintenance/queries";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const r = t.client.requests;

export const metadata: Metadata = { title: r.heading };

export default async function RequestsPage({ params }: PageProps<"/p/[projectId]/endringer">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const requests = await getRequestsForClient(projectId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={r.heading}
        trail={[{ label: t.client.nav.overview, href: `/p/${projectId}` }]}
        actions={
          <ButtonLink href={`/p/${projectId}/endringer/ny`} variant="primary">
            {r.new}
          </ButtonLink>
        }
      />
      {requests.length === 0 ? (
        <p className="text-ink-secondary">{r.empty}</p>
      ) : (
        <InsetGroupedList label={r.heading}>
          {requests.map((req) => (
            <InsetRow key={req.id}>
              <Link href={`/p/${projectId}/endringer/${req.id}`} className="flex flex-wrap items-center justify-between gap-2 py-1">
                <span className="min-w-0">
                  <span className="block font-medium">{req.title}</span>
                  <span className="text-small text-ink-secondary">{r.sentOn(formatDate(req.created_at))}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {req.urgency === "urgent" && <Tag tone="brick">{r.urgent}</Tag>}
                  <RequestStatus status={req.status} />
                </span>
              </Link>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}
    </div>
  );
}
