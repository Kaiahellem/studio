import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestsForAdmin } from "@/features/maintenance/queries";
import { formatDate } from "@/lib/format/date";
import { t } from "@/i18n/nb";

const s = t.studio.requests;
const r = t.client.requests;

export const metadata: Metadata = { title: s.heading };

type Row = Awaited<ReturnType<typeof getRequestsForAdmin>>["open"][number];

function List({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <Empty>{s.empty}</Empty>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {rows.map((req) => (
        <li key={req.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/studio/change-requests/${req.id}`} className="text-lg font-medium underline-offset-4 hover:underline">
              {req.title}
            </Link>
            <p className="text-sm text-muted">{s.from(req.clients?.name ?? "", formatDate(req.created_at))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {req.urgency === "urgent" && <Badge tone="danger">{r.urgent}</Badge>}
            <Badge tone="muted">{r.billing[req.billing]}</Badge>
            <RequestStatus status={req.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ChangeRequestsPage() {
  const { open, closed } = await getRequestsForAdmin();
  return (
    <>
      <PageHeader title={s.heading} />
      <Section id="open" title={`${s.open} (${open.length})`}>
        <List rows={open} />
      </Section>
      <Section id="closed" title={`${s.closed} (${closed.length})`}>
        <List rows={closed} />
      </Section>
    </>
  );
}
