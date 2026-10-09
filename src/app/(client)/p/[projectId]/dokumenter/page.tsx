import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { getDocumentsForClient } from "@/features/hub/queries";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const d = t.client.documents;

export const metadata: Metadata = { title: d.heading };

export default async function DocumentsPage({ params }: PageProps<"/p/[projectId]/dokumenter">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const documents = await getDocumentsForClient(projectId);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl tracking-tight">{d.heading}</h1>
      {documents.length === 0 ? (
        <p className="text-muted">{d.empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="text-sm text-muted">
                  {d.type[doc.type]} · {formatDate(doc.document_date)}
                </p>
                {doc.href ? (
                  <a href={doc.href} target="_blank" rel="noopener noreferrer" className="text-lg font-medium underline-offset-4 hover:underline">
                    {doc.title}
                    <span className="sr-only"> {t.client.newTab}</span>
                  </a>
                ) : (
                  <p className="text-lg font-medium">{doc.title}</p>
                )}
              </div>
              <Badge tone={doc.status === "paid" || doc.status === "signed" || doc.status === "accepted" ? "success" : "neutral"}>
                {d.status[doc.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
