import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextActionCard, Timeline } from "@/features/hub/components";
import { nextForClient } from "@/features/hub/next-action";
import { getProjectOverview } from "@/features/hub/queries";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const c = t.client;

export const metadata: Metadata = { title: c.projectsTitle };

export default async function ProjectOverviewPage({ params }: PageProps<"/p/[projectId]">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, phases, firstName } = await getProjectOverview(projectId);
  const next = nextForClient(phases);

  return (
    <div className="flex flex-col gap-12">
      <header>
        <p className="mb-2 text-muted">
          {c.greeting(firstName)} · {project.clients?.name}
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{project.name}</h1>
      </header>

      <NextActionCard projectId={project.id} next={next} />

      {project.staging_url && (
        <section aria-labelledby="staging-heading" className="border-y border-line py-6">
          <h2 id="staging-heading" className="mb-1 font-serif text-2xl">
            {c.staging.heading}
          </h2>
          <p className="mb-4 text-muted">{c.staging.body}</p>
          <a
            href={project.staging_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-md border border-field-border bg-surface px-5 text-sm font-medium hover:bg-paper"
          >
            {c.staging.open}
            <span aria-hidden="true">&nbsp;↗</span>
            <span className="sr-only"> {c.newTab}</span>
          </a>
        </section>
      )}

      <Timeline projectId={project.id} phases={phases} />
    </div>
  );
}
