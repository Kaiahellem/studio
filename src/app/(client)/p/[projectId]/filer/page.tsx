import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
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
      <PageHeader title={f.heading} trail={[{ label: t.client.nav.overview, href: `/p/${projectId}` }]} />
      {files.length === 0 ? (
        <p className="-mt-4 text-ink-secondary">{f.empty}</p>
      ) : (
        [...groups.entries()].map(([title, list], i) => (
          <Section key={title} id={`files-${i}`} title={title} card={false}>
            <FileList files={list} label={title} />
          </Section>
        ))
      )}
    </div>
  );
}
