import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFilesForClient } from "@/features/hub/queries";
import { FileList } from "@/features/steps/components/file-list";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const f = t.client.files;

export const metadata: Metadata = { title: f.heading };

export default async function FilesPage({ params }: PageProps<"/p/[projectId]/filer">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const files = await getFilesForClient(projectId);

  // Grouped by the step they were delivered for.
  const groups = new Map<string, typeof files>();
  for (const file of files) {
    const key = file.project_steps?.title ?? f.heading;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-4xl tracking-tight">{f.heading}</h1>
      {files.length === 0 ? (
        <p className="text-muted">{f.empty}</p>
      ) : (
        [...groups.entries()].map(([title, list]) => (
          <section key={title} aria-label={title} className="flex flex-col gap-3">
            <h2 className="font-serif text-2xl">{title}</h2>
            <FileList files={list} />
          </section>
        ))
      )}
    </div>
  );
}
