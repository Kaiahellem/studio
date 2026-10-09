import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NextActionCard, Timeline } from "@/features/hub/components";
import { HoursMeter, RequestStatus } from "@/features/maintenance/components";
import { getMaintenanceSummary } from "@/features/maintenance/queries";
import { formatMonth, todayInOslo } from "@/lib/format/date";
import { nextForClient } from "@/features/hub/next-action";
import { getProjectOverview } from "@/features/hub/queries";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const c = t.client;

export const metadata: Metadata = { title: c.projectsTitle };

export default async function ProjectOverviewPage({ params }: PageProps<"/p/[projectId]">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, phases, firstName, hasHandover } = await getProjectOverview(projectId);
  const liveUrl = project.live_url && /^https?:\/\//i.test(project.live_url) ? project.live_url : null;
  const cmsUrl = project.cms_url && /^https?:\/\//i.test(project.cms_url) ? project.cms_url : null;
  const next = nextForClient(phases);
  const maintenance = liveUrl ? await getMaintenanceSummary(project.id) : null;

  return (
    <div className="flex flex-col gap-12">
      <header>
        <p className="mb-2 text-muted">
          {c.greeting(firstName)} · {project.clients?.name}
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{project.name}</h1>
      </header>

      {/* After launch: the live site and the CMS come first (BRIEF.md, "After launch"). */}
      {liveUrl && (
        <section aria-labelledby="live-heading" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h2 id="live-heading" className="font-serif text-3xl">
            {c.liveSite.heading}
          </h2>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="break-all text-lg underline underline-offset-4 hover:no-underline">
            {liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <span aria-hidden="true">&nbsp;↗</span>
            <span className="sr-only"> {c.newTab}</span>
          </a>
          <div className="flex flex-col gap-3 sm:flex-row">
            {cmsUrl && (
              <a
                href={cmsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby="cms-hint"
                className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-ink hover:opacity-90"
              >
                {c.liveSite.edit}
                <span aria-hidden="true">&nbsp;↗</span>
              </a>
            )}
            {hasHandover && (
              <Link href={`/p/${project.id}/overlevering`} className="inline-flex h-12 items-center justify-center rounded-md border border-field-border px-6 font-medium hover:bg-paper">
                {c.liveSite.handover}
              </Link>
            )}
          </div>
          {cmsUrl && (
            <p id="cms-hint" className="text-sm text-muted">
              {c.liveSite.editHint}
            </p>
          )}
        </section>
      )}

      {/* After launch: "Meld inn endring" and this month's hours (BRIEF.md, "After launch"). */}
      {maintenance && (
        <section aria-labelledby="maintenance-heading" className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h2 id="maintenance-heading" className="font-serif text-2xl">
            {c.maintenance.heading}
          </h2>
          {maintenance.agreement && maintenance.usage ? (
            <HoursMeter used={maintenance.usage.used_minutes} included={maintenance.usage.included_minutes} month={formatMonth(todayInOslo())} />
          ) : (
            !maintenance.agreement && <p className="text-muted">{c.maintenance.noAgreement}</p>
          )}
          {maintenance.openRequests.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium">{c.liveSite.openRequests}</h3>
              <ul className="flex flex-col gap-2">
                {maintenance.openRequests.map((req) => (
                  <li key={req.id} className="flex flex-wrap items-center gap-3">
                    <Link href={`/p/${project.id}/endringer/${req.id}`} className="underline underline-offset-4 hover:no-underline">
                      {req.title}
                    </Link>
                    <RequestStatus status={req.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/p/${project.id}/endringer/ny`} className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-ink hover:opacity-90">
              {c.liveSite.newRequest}
            </Link>
            <Link href={`/p/${project.id}/vedlikehold`} className="inline-flex h-12 items-center justify-center rounded-md border border-field-border px-6 font-medium hover:bg-paper">
              {c.liveSite.maintenance}
            </Link>
          </div>
        </section>
      )}

      <NextActionCard projectId={project.id} next={next} />

      {/* The test version is for the build; after launch the live site replaces it. */}
      {project.staging_url && !liveUrl && (
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

      <Timeline projectId={project.id} phases={phases} collapsed={next.kind === "done"} />
    </div>
  );
}
