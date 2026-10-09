import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/form";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { deleteDocumentAction, updateDocumentAction } from "@/features/steps/admin-actions";
import { getDocumentsForAdmin } from "@/features/steps/admin-queries";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";
import { AddDocumentForm, DocumentFields } from "./document-fields";

const d = t.studio.documents;
const cd = t.client.documents;

export const metadata: Metadata = { title: d.heading };

export default async function AdminDocumentsPage({ params }: PageProps<"/studio/projects/[projectId]/documents">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, documents, steps } = await getDocumentsForAdmin(projectId);
  const stepOptions = steps.map((s) => ({ id: s.id, title: s.title }));

  return (
    <>
      <PageHeader
        title={d.heading}
        eyebrow={
          <Link href={`/studio/projects/${project.id}`} className="underline underline-offset-4 hover:no-underline">
            {project.clients?.name} · {project.name}
          </Link>
        }
      />
      <div className="grid gap-x-12 lg:grid-cols-[3fr_2fr]">
        <Section id="documents" title={d.heading}>
          {documents.length === 0 ? (
            <Empty>{d.empty}</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {documents.map((doc) => (
                <li key={doc.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted">
                        {cd.type[doc.type]} · {formatDate(doc.document_date)}
                      </p>
                      {doc.href ? (
                        <a href={doc.href} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                          {doc.title}
                        </a>
                      ) : (
                        <p className="font-medium">{doc.title}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{cd.status[doc.status]}</Badge>
                        {!doc.visible_to_client && <Badge tone="muted">{t.studio.labels.hidden}</Badge>}
                      </div>
                    </div>
                    <ActionButton
                      action={deleteDocumentAction.bind(null, doc.id)}
                      label={t.common.delete}
                      ariaLabel={d.delete(doc.title)}
                      confirm={d.confirmDelete(doc.title)}
                      variant="danger"
                    />
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm underline underline-offset-4 hover:no-underline">{d.edit(doc.title)}</summary>
                    <div className="mt-4 rounded-md border border-line bg-surface p-4">
                      <ActionForm action={updateDocumentAction.bind(null, doc.id)} submitLabel={d.save} pendingLabel={t.common.loading}>
                        <DocumentFields defaults={doc} steps={stepOptions} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section id="add-document" title={d.add}>
          <AddDocumentForm projectId={project.id} steps={stepOptions} />
        </Section>
      </div>
    </>
  );
}
