import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddRow, EditDisclosure } from "@/components/ds/add-row";
import { Card, cardClass } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag, type Tone } from "@/components/ds/tag";
import { ActionButton, ActionForm } from "@/components/form";
import { deleteDocumentAction, updateDocumentAction } from "@/features/steps/admin-actions";
import { getDocumentsForAdmin } from "@/features/steps/admin-queries";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";
import { AddDocumentForm, DocumentFields } from "./document-fields";

const d = t.studio.documents;
const cd = t.client.documents;

export const metadata: Metadata = { title: d.heading };

const statusTone: Record<keyof typeof cd.status, Tone> = { draft: "neutral", sent: "slate", accepted: "sage", signed: "sage", paid: "sage", void: "brick" };

export default async function AdminDocumentsPage({ params }: PageProps<"/studio/projects/[projectId]/documents">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, documents, steps } = await getDocumentsForAdmin(projectId);
  const stepOptions = steps.map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={d.heading} trail={[{ label: project.name, href: `/studio/projects/${project.id}` }]} eyebrow={project.clients?.name} />

      {documents.length === 0 ? (
        <Card>
          <EmptyState>{d.empty}</EmptyState>
        </Card>
      ) : (
        <InsetGroupedList label={d.heading}>
          {documents.map((doc) => (
            <InsetRow key={doc.id}>
              <div className="flex flex-col gap-1.5 py-2">
                <p className="text-small text-ink-secondary">
                  {cd.type[doc.type]} · {formatDate(doc.document_date)}
                </p>
                {doc.href ? (
                  <a href={doc.href} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-3 hover:underline hover:decoration-focus">
                    {doc.title}
                    <span className="sr-only"> {cd.open}</span>
                  </a>
                ) : (
                  <p className="font-medium">{doc.title}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Tag tone={statusTone[doc.status]}>{cd.status[doc.status]}</Tag>
                  {!doc.visible_to_client && <Tag>{t.studio.labels.hidden}</Tag>}
                </div>
                <EditDisclosure label={d.edit(doc.title)}>
                  <ActionForm action={updateDocumentAction.bind(null, doc.id)} submitLabel={d.save} pendingLabel={t.common.loading}>
                    <DocumentFields defaults={doc} steps={stepOptions} />
                  </ActionForm>
                  <div className="mt-4">
                    <ActionButton
                      action={deleteDocumentAction.bind(null, doc.id)}
                      label={d.delete(doc.title)}
                      confirm={d.confirmDelete(doc.title)}
                      variant="destructive"
                    />
                  </div>
                </EditDisclosure>
              </div>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}

      <AddRow label={d.add}>
        <div className={cardClass("card")}>
          <AddDocumentForm projectId={project.id} steps={stepOptions} />
        </div>
      </AddRow>
    </div>
  );
}
