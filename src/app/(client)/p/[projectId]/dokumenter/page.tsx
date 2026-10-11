import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag, type Tone } from "@/components/ds/tag";
import { getDocumentsForClient } from "@/features/hub/queries";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const d = t.client.documents;

export const metadata: Metadata = { title: d.heading };

const tone = (status: keyof typeof d.status): Tone =>
  status === "paid" || status === "signed" || status === "accepted" ? "sage" : status === "void" ? "neutral" : status === "sent" ? "slate" : "neutral";

export default async function DocumentsPage({ params }: PageProps<"/p/[projectId]/dokumenter">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const documents = await getDocumentsForClient(projectId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={d.heading} trail={[{ label: t.client.nav.overview, href: `/p/${projectId}` }]} />
      {documents.length === 0 ? (
        <p className="text-ink-secondary">{d.empty}</p>
      ) : (
        <InsetGroupedList label={d.heading}>
          {documents.map((doc) => (
            <InsetRow key={doc.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  {doc.href ? (
                    <a href={doc.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium underline-offset-3 hover:underline hover:decoration-focus">
                      {doc.title}
                      <Icon icon={ExternalLink} className="text-ink-secondary" />
                      <span className="sr-only"> {t.client.newTab}</span>
                    </a>
                  ) : (
                    <p className="font-medium">{doc.title}</p>
                  )}
                  <p className="text-small text-ink-secondary">
                    {d.type[doc.type]} · {formatDate(doc.document_date)}
                  </p>
                </div>
                <Tag tone={tone(doc.status)}>{d.status[doc.status]}</Tag>
              </div>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}
    </div>
  );
}
