import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm, Field, Select } from "@/components/form";
import { Badge, PageHeader, Section } from "@/components/ui";
import { addRequestTimeAction, deleteTimeAction, updateRequestAction } from "@/features/maintenance/actions";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestForAdmin } from "@/features/maintenance/queries";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { formatDate, formatDateTime, todayInOslo } from "@/lib/format/date";
import { formatMinutes } from "@/lib/format/money";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const s = t.studio.requests;
const r = t.client.requests;

export const metadata: Metadata = { title: s.heading };

export default async function ChangeRequestPage({ params }: PageProps<"/studio/change-requests/[requestId]">) {
  const { requestId } = await params;
  if (!uuid.safeParse(requestId).success) notFound();
  const { request, createdBy, agreement, files, comments, time } = await getRequestForAdmin(requestId);
  const total = time.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <>
      <PageHeader
        title={request.title}
        eyebrow={
          <>
            <Link href="/studio/change-requests" className="underline underline-offset-4 hover:no-underline">
              {s.heading}
            </Link>
            {" · "}
            <Link href={`/studio/clients/${request.clients?.id}`} className="underline underline-offset-4 hover:no-underline">
              {request.clients?.name}
            </Link>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {request.urgency === "urgent" && <Badge tone="danger">{r.urgent}</Badge>}
            <RequestStatus status={request.status} />
          </div>
        }
      />

      <div className="grid gap-x-12 lg:grid-cols-[3fr_2fr]">
        <div>
          <p className="mb-2 text-sm text-muted">
            {createdBy} · {formatDateTime(request.created_at)} · {request.projects?.name}
            {agreement?.maintenance_plans && ` · ${agreement.maintenance_plans.name}`}
          </p>
          {request.description && <p className="mb-10 max-w-prose whitespace-pre-line leading-relaxed">{request.description}</p>}

          {files.length > 0 && (
            <Section id="attachments" title={s.attachments}>
              <FileList files={files} />
            </Section>
          )}

          <Section id="time" title={s.time} actions={<span className="text-sm text-muted">{s.total(formatMinutes(total))}</span>}>
            {time.length === 0 ? (
              <p className="mb-6 text-muted">{s.noTime}</p>
            ) : (
              <ul className="mb-6 divide-y divide-line border-y border-line">
                {time.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span>
                      <span className="font-medium">{formatMinutes(e.minutes)}</span>
                      <span className="text-muted"> · {formatDate(e.entry_date)}</span>
                      {e.description && <span> · {e.description}</span>}
                    </span>
                    <ActionButton
                      action={deleteTimeAction.bind(null, e.id)}
                      label={t.common.delete}
                      ariaLabel={s.deleteTime(e.description ?? formatMinutes(e.minutes))}
                      variant="danger"
                    />
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={addRequestTimeAction.bind(null, request.id)} submitLabel={s.addTime} pendingLabel={t.common.loading}>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={s.duration} hint={s.durationHint} name="minutes" required inputMode="decimal" />
                <Field label={s.date} name="entry_date" type="date" defaultValue={todayInOslo()} />
              </div>
              <Field label={s.note} name="description" />
            </ActionForm>
          </Section>
        </div>

        <div>
          <Section id="triage" title={s.triage}>
            <ActionForm action={updateRequestAction.bind(null, request.id)} submitLabel={s.save} pendingLabel={t.common.loading}>
              <Select
                label={s.status}
                name="status"
                defaultValue={request.status}
                options={(Object.keys(r.status) as (keyof typeof r.status)[]).map((k) => ({ value: k, label: r.status[k] }))}
              />
              <Select
                label={s.billing}
                name="billing"
                defaultValue={request.billing}
                options={(Object.keys(r.billing) as (keyof typeof r.billing)[]).map((k) => ({ value: k, label: r.billing[k] }))}
              />
              <Field
                label={s.estimate}
                hint={s.estimateHint}
                name="estimate_minutes"
                inputMode="decimal"
                defaultValue={request.estimate_minutes !== null ? formatMinutes(request.estimate_minutes) : ""}
              />
            </ActionForm>
          </Section>
          <CommentThread target={{ changeRequestId: request.id }} comments={comments} allowInternal />
        </div>
      </div>
    </>
  );
}
