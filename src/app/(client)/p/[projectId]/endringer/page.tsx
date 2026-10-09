import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestsForClient } from "@/features/maintenance/queries";
import { formatDate } from "@/lib/format/date";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const r = t.client.requests;

export const metadata: Metadata = { title: r.heading };

export default async function RequestsPage({ params }: PageProps<"/p/[projectId]/endringer">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const requests = await getRequestsForClient(projectId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl tracking-tight">{r.heading}</h1>
        <Link href={`/p/${projectId}/endringer/ny`} className={`${buttonClass.primary} h-12 w-full text-base sm:w-auto`}>
          {r.new}
        </Link>
      </div>
      {requests.length === 0 ? (
        <p className="text-muted">{r.empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {requests.map((req) => (
            <li key={req.id}>
              <Link href={`/p/${projectId}/endringer/${req.id}`} className="flex flex-col gap-2 py-4 hover:bg-surface/60 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block text-lg font-medium">{req.title}</span>
                  <span className="text-sm text-muted">{r.sentOn(formatDate(req.created_at))}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {req.urgency === "urgent" && <span className="text-sm font-medium text-danger">{r.urgent}</span>}
                  <RequestStatus status={req.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
