import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddRow } from "@/components/ds/add-row";
import { Card, cardClass } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { ActionButton, ActionForm, Field, Select } from "@/components/form";
import { addRequestTimeAction, deleteTimeAction, updateRequestAction } from "@/features/maintenance/actions";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestForAdmin } from "@/features/maintenance/queries";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { formatDate, formatDateTime, formatMinutes, todayInOslo } from "@/lib/format/nb";
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
    <div className="flex flex-col gap-10">
      <PageHeader
        title={request.title}
        trail={[
          { label: s.heading, href: "/studio/change-requests" },
          ...(request.clients ? [{ label: request.clients.name, href: `/studio/clients/${request.clients.id}` }] : []),
        ]}
        properties={[
          {
            label: s.status,
            value: (
              <span className="inline-flex flex-wrap gap-1.5 sm:justify-end">
                {request.urgency === "urgent" && <Tag tone="brick">{r.urgent}</Tag>}
                <RequestStatus status={request.status} />
              </span>
            ),
          },
          { label: r.sentLabel, value: `${createdBy} · ${formatDateTime(request.created_at)}` },
          { label: s.project, value: request.projects?.name },
          { label: t.studio.agreements.heading, value: agreement?.maintenance_plans?.name },
          { label: s.billing, value: r.billing[request.billing] },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-10">
          {request.description && <p className="max-w-prose whitespace-pre-line text-body-l">{request.description}</p>}

          {files.length > 0 && (
            <Section id="attachments" title={s.attachments} card={false}>
              <FileList files={files} />
            </Section>
          )}

          <Section id="time" title={s.time} card={false} description={s.total(formatMinutes(total))}>
            {time.length === 0 ? (
              <Card>
                <EmptyState>{s.noTime}</EmptyState>
              </Card>
            ) : (
              <InsetGroupedList label={s.time}>
                {time.map((e) => (
                  <InsetRow
                    key={e.id}
                    actions={
                      <ActionButton
                        action={deleteTimeAction.bind(null, e.id)}
                        label={t.common.delete}
                        ariaLabel={s.deleteTime(e.description ?? formatMinutes(e.minutes))}
                        variant="ghost"
                      />
                    }
                  >
                    <p className="py-1">
                      <span className="font-medium tabular-nums">{formatMinutes(e.minutes)}</span>
                      <span className="text-ink-secondary"> · {formatDate(e.entry_date)}</span>
                      {e.description && <span> · {e.description}</span>}
                    </p>
                  </InsetRow>
                ))}
              </InsetGroupedList>
            )}
            <AddRow label={s.addTime}>
              <div className={cardClass("card")}>
                <ActionForm action={addRequestTimeAction.bind(null, request.id)} submitLabel={s.addTime} pendingLabel={t.common.loading}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={s.duration} hint={s.durationHint} name="minutes" required inputMode="decimal" />
                    <Field label={s.date} name="entry_date" type="date" defaultValue={todayInOslo()} />
                  </div>
                  <Field label={s.note} name="description" />
                </ActionForm>
              </div>
            </AddRow>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-10">
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
    </div>
  );
}
