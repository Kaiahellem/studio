import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form";
import { createRequestUploadAction, registerRequestUploadAction } from "@/features/maintenance/actions";
import { RequestStatus } from "@/features/maintenance/components";
import { getRequestForClient } from "@/features/maintenance/queries";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { UploadPanel } from "@/features/steps/components/upload-panel";
import { getUploadSettings } from "@/features/steps/settings";
import { formatDate } from "@/lib/format/date";
import { formatMinutes } from "@/lib/format/money";
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
      <Link href={`/p/${projectId}/endringer`} className="text-sm underline underline-offset-4 hover:no-underline">
        <span aria-hidden="true">← </span>
        {r.heading}
      </Link>
      {query.sendt === "1" && <FormMessage message={r.sent} />}

      <header className="flex flex-col gap-4">
        <p className="text-muted">
          {r.sentOn(formatDate(request.created_at))} · {createdBy}
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">{request.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <RequestStatus status={request.status} />
          {request.urgency === "urgent" && <span className="text-sm font-medium text-danger">{r.urgent}</span>}
        </div>
      </header>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface p-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">{t.studio.requests.billing}</dt>
          <dd className="font-medium">{r.billing[request.billing]}</dd>
        </div>
        {request.estimate_minutes !== null && (
          <div>
            <dt className="text-sm text-muted">{t.studio.requests.estimate}</dt>
            <dd className="font-medium">{formatMinutes(request.estimate_minutes)}</dd>
          </div>
        )}
        {minutes > 0 && (
          <div>
            <dt className="text-sm text-muted">{r.usedLabel}</dt>
            <dd className="font-medium">{formatMinutes(minutes)}</dd>
          </div>
        )}
      </dl>

      {request.description && <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed">{request.description}</p>}

      <section aria-labelledby="attachments-heading" className="flex flex-col gap-4">
        <h2 id="attachments-heading" className="font-serif text-2xl">
          {r.attachments}
        </h2>
        {open && (
          <UploadPanel
            create={createRequestUploadAction.bind(null, request.id)}
            register={registerRequestUploadAction.bind(null, request.id)}
            maxBytes={upload.maxBytes}
            allowedTypes={upload.allowedTypes}
          />
        )}
        <FileList files={files} />
      </section>

      {!open && <p className="text-muted">{r.closed}</p>}
      <CommentThread target={{ changeRequestId: request.id }} comments={comments} />
    </article>
  );
}
