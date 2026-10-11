import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag } from "@/components/ds/tag";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestsForAdmin } from "@/features/maintenance/queries";
import { formatDate } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const s = t.studio.requests;
const r = t.client.requests;

export const metadata: Metadata = { title: s.heading };

type Row = Awaited<ReturnType<typeof getRequestsForAdmin>>["open"][number];

function Group({ id, title, rows }: { id: string; title: string; rows: Row[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-baseline gap-2 text-title-l">
        {title}
        <span className="text-mono text-ink-secondary">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <Card>
          <EmptyState>{s.empty}</EmptyState>
        </Card>
      ) : (
        <InsetGroupedList label={title}>
          {rows.map((req) => (
            <InsetRow key={req.id}>
              <Link href={`/studio/change-requests/${req.id}`} className="flex flex-wrap items-center justify-between gap-2 py-1">
                <span className="min-w-0">
                  <span className="block font-medium">{req.title}</span>
                  <span className="text-small text-ink-secondary">{s.from(req.clients?.name ?? "", formatDate(req.created_at))}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {req.urgency === "urgent" && <Tag tone="brick">{r.urgent}</Tag>}
                  <Tag>{r.billing[req.billing]}</Tag>
                  <RequestStatus status={req.status} />
                </span>
              </Link>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}
    </section>
  );
}

export default async function ChangeRequestsPage() {
  const { open, closed } = await getRequestsForAdmin();
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={s.heading} />
      <Group id="open" title={s.open} rows={open} />
      <Group id="closed" title={s.closed} rows={closed} />
    </div>
  );
}
