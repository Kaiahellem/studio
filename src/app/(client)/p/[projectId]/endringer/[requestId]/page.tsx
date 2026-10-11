import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Callout } from "@/components/ds/callout";
import { Card } from "@/components/ds/card";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { FormMessage } from "@/components/form";
import { createRequestUploadAction, registerRequestUploadAction } from "@/features/maintenance/actions";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestForClient } from "@/features/maintenance/queries";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { UploadPanel } from "@/features/steps/components/upload-panel";
import { getUploadSettings } from "@/features/steps/settings";
import { formatDate, formatMinutes } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const r = t.client.requests;

export const metadata: Metadata = { title: r.heading };

export default async function RequestPage({ params, searchParams }: PageProps<"/p/[projectId]/endringer/[requestId]">) {
  const { projectId, requestId } = await params;
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(requestId).success) notFound();
  const [{ request, createdBy, files, comments, minutes }, upload, query] = await Promise.all([
    getRequestForClient(projectId, requestId),
    getUploadSettings(),
    searchParams,
  ]);
  const open = request.status !== "done" && request.status !== "declined";

  return (
    <article className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        {query.sendt === "1" && <FormMessage message={r.sent} />}
        <PageHeader
          title={request.title}
          trail={[{ label: r.heading, href: `/p/${projectId}/endringer` }]}
          properties={[
            { label: t.client.step.properties.status, value: <RequestStatus status={request.status} /> },
            { label: r.urgency, value: request.urgency === "urgent" ? <Tag tone="brick">{r.urgent}</Tag> : null },
            { label: t.studio.requests.billing, value: r.billing[request.billing] },
            { label: t.studio.requests.estimate, value: request.estimate_minutes !== null ? formatMinutes(request.estimate_minutes) : null },
            { label: r.usedLabel, value: minutes > 0 ? formatMinutes(minutes) : null },
            { label: r.sentLabel, value: `${formatDate(request.created_at)} · ${createdBy}` },
          ]}
        />
      </div>

      {request.description && (
        <Section id="description" title={r.description}>
          <p className="whitespace-pre-line text-body-l">{request.description}</p>
        </Section>
      )}

      <Section id="attachments" title={r.attachments} card={!open && files.length === 0}>
        {open ? (
          <div className="flex flex-col gap-4">
            <Card>
              <UploadPanel
                create={createRequestUploadAction.bind(null, request.id)}
                register={registerRequestUploadAction.bind(null, request.id)}
                maxBytes={upload.maxBytes}
                allowedTypes={upload.allowedTypes}
              />
            </Card>
            {files.length > 0 && <FileList files={files} label={r.attachments} />}
          </div>
        ) : files.length > 0 ? (
          <FileList files={files} label={r.attachments} />
        ) : (
          <Callout>{r.closed}</Callout>
        )}
      </Section>

      <CommentThread target={{ changeRequestId: request.id }} comments={comments} />
    </article>
  );
}
