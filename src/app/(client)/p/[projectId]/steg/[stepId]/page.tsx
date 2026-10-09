import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStepForClient } from "@/features/hub/queries";
import { formatDate } from "@/lib/format/date";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const c = t.client;

export const metadata: Metadata = { title: c.yourTurn.heading };

// Milestone 3: what the step is about. Uploads, approvals, forms and comments arrive in milestone 4.
export default async function StepPage({ params }: PageProps<"/p/[projectId]/steg/[stepId]">) {
  const { projectId, stepId } = await params;
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(stepId).success) notFound();
  const step = await getStepForClient(projectId, stepId);

  const rounds = [...step.approval_rounds].sort((a, b) => b.round - a.round);
  const current = rounds[0];
  const link = (step.config as { url?: string } | null)?.url;

  return (
    <article className="flex flex-col gap-8">
      <Link href={`/p/${projectId}`} className="text-sm underline underline-offset-4 hover:no-underline">
        <span aria-hidden="true">← </span>
        {c.step.back}
      </Link>
      <header>
        {step.project_phases && <p className="mb-2 text-muted">{c.step.phase(step.project_phases.name)}</p>}
        <h1 className="font-serif text-4xl leading-tight tracking-tight">{step.title}</h1>
      </header>

      {step.description && <p className="max-w-prose text-lg leading-relaxed">{step.description}</p>}
      {step.due_date && <p className="text-sm font-medium">{c.yourTurn.dueBy(formatDate(step.due_date))}</p>}

      {step.type === "approval" && current && (
        <section aria-labelledby="round-heading" className="rounded-xl border border-line bg-surface p-6">
          <h2 id="round-heading" className="mb-2 font-serif text-2xl">
            {c.step.round(current.round, step.max_revision_rounds)}
          </h2>
          {current.note && <p className="mb-4 leading-relaxed">{current.note}</p>}
          {current.link && /^https?:\/\//i.test(current.link) && (
            <a href={current.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {c.step.openLink}
              <span className="sr-only"> {c.newTab}</span>
            </a>
          )}
        </section>
      )}

      {step.type === "link" && link && /^https?:\/\//i.test(link) && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-ink sm:self-start"
        >
          {c.step.openLink}
          <span className="sr-only"> {c.newTab}</span>
        </a>
      )}

      {step.status !== "active" ? (
        <p className="text-muted">{c.step.notActive}</p>
      ) : (
        step.owner === "client" && step.type !== "link" && <p className="text-muted">{c.step.comingSoon}</p>
      )}
    </article>
  );
}
