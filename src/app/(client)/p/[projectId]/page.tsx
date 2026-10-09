import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ds/button";
import { DinTur } from "@/components/ds/din-tur";
import { Icon } from "@/components/ds/icon";
import { List, ListRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag, type Tone } from "@/components/ds/tag";
import { Timeline } from "@/components/ds/timeline";
import { ToggleRow } from "@/components/ds/toggle-row";
import { toTimeline } from "@/features/hub/components";
import { nextForClient } from "@/features/hub/next-action";
import { getMyProjects, getProjectOverview } from "@/features/hub/queries";
import { HoursMeter, RequestStatus } from "@/features/maintenance/components";
import { getMaintenanceSummary } from "@/features/maintenance/queries";
import { formatDate, formatMonth, formatWeek, todayInOslo } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const c = t.client;
const o = c.overview;

export const metadata: Metadata = { title: c.nav.overview };

const safeUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);
const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function ExternalText({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="prose-link inline-flex items-center gap-1">
      {children}
      <Icon icon={ExternalLink} />
      <span className="sr-only">{c.newTab}</span>
    </a>
  );
}

export default async function ProjectOverviewPage({ params }: PageProps<"/p/[projectId]">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const [{ project, phases, hasHandover }, { projects }] = await Promise.all([getProjectOverview(projectId), getMyProjects()]);
  const next = nextForClient(phases);
  const liveUrl = safeUrl(project.live_url);
  const cmsUrl = safeUrl(project.cms_url);
  const stagingUrl = liveUrl ? null : safeUrl(project.staging_url);
  const maintenance = liveUrl ? await getMaintenanceSummary(project.id) : null;

  const current = phases.find((p) => p.status === "active");
  const [stateLabel, stateTone]: [string, Tone] =
    project.status === "paused"
      ? [o.state.paused, "amber"]
      : next.kind === "client"
        ? [o.state.yourTurn, "slate"]
        : next.kind === "done"
          ? [o.state.done, "sage"]
          : [o.state.ourTurn, "neutral"];
  const timeline = toTimeline(project.id, phases);

  return (
    <article>
      <PageHeader
        title={project.name}
        trail={projects.length > 1 ? [{ label: c.projectsTitle, href: "/" }] : []}
        properties={[
          { label: o.status, value: <Tag tone={stateTone}>{stateLabel}</Tag> },
          { label: o.phase, value: current ? o.phaseOf(current.name, current.position, phases.length) : null },
          { label: o.nextStep, value: next.kind === "client" ? next.step.title : next.kind === "studio" ? next.working[0] : null },
          {
            label: o.launch,
            value: !liveUrl && project.target_launch_date ? o.dateWithWeek(formatDate(project.target_launch_date), formatWeek(project.target_launch_date)) : null,
          },
          { label: o.preview, value: stagingUrl ? <ExternalText href={stagingUrl}>{c.staging.open}</ExternalText> : null },
          { label: o.website, value: liveUrl ? <ExternalText href={liveUrl}>{host(liveUrl)}</ExternalText> : null },
          {
            label: c.nav.handover,
            value: hasHandover ? (
              <Link href={`/p/${project.id}/overlevering`} className="prose-link">
                {c.liveSite.handover}
              </Link>
            ) : null,
          },
        ]}
      />

      <div className="flex flex-col gap-16">
        {/* The one callout at the top: what the client should do now, or what we are doing. */}
        {next.kind === "client" ? (
          <DinTur
            title={next.step.title}
            action={{
              label: c.yourTurn.action[next.step.type],
              href: `/p/${project.id}/steg/${next.step.id}`,
              ariaLabel: `${c.yourTurn.action[next.step.type]}: ${next.step.title}`,
            }}
          >
            {next.step.description && <p>{next.step.description}</p>}
            {next.step.due_date && <p className="mt-2 font-medium">{c.yourTurn.dueBy(formatDate(next.step.due_date))}</p>}
            {next.others.length > 0 && (
              <p className="mt-2 text-small text-ink-secondary">
                {c.yourTurn.more(next.others.length)}{" "}
                {next.others.map((s, i) => (
                  <span key={s.id}>
                    <Link href={`/p/${project.id}/steg/${s.id}`} className="prose-link">
                      {s.title}
                    </Link>
                    {i < next.others.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
          </DinTur>
        ) : next.kind === "studio" ? (
          <DinTur waiting={false} title={c.studioTurn.heading}>
            <p>
              {next.working.length > 0 && `${c.studioTurn.working} ${next.working.join(" ")} `}
              {next.expectBy ? c.studioTurn.expectBy(formatDate(next.expectBy)) : c.studioTurn.noDate}
            </p>
          </DinTur>
        ) : (
          <DinTur waiting={false} title={c.done.heading}>
            <p>{c.done.body}</p>
          </DinTur>
        )}

        {/* After launch: maintenance, changes and the CMS (BRIEF.md, "After launch"). */}
        {maintenance && (
          <section aria-labelledby="maintenance-heading" className="flex flex-col gap-6">
            <h2 id="maintenance-heading" className="text-title-l">
              {c.maintenance.heading}
            </h2>
            {maintenance.agreement && maintenance.usage ? (
              <HoursMeter used={maintenance.usage.used_minutes} included={maintenance.usage.included_minutes} month={formatMonth(todayInOslo())} />
            ) : (
              !maintenance.agreement && <p className="text-ink-secondary">{c.maintenance.noAgreement}</p>
            )}
            {maintenance.openRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-title-s">{c.liveSite.openRequests}</h3>
                <List>
                  {maintenance.openRequests.map((req) => (
                    <ListRow key={req.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/p/${project.id}/endringer/${req.id}`} className="underline-offset-3 hover:underline">
                          {req.title}
                        </Link>
                        <RequestStatus status={req.status} />
                      </div>
                    </ListRow>
                  ))}
                </List>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={`/p/${project.id}/endringer/ny`} variant="primary">
                {c.liveSite.newRequest}
              </ButtonLink>
              {cmsUrl && (
                <ButtonLink href={cmsUrl} external variant="secondary" aria-describedby="cms-hint">
                  {c.liveSite.edit}
                  <Icon icon={ExternalLink} />
                </ButtonLink>
              )}
            </div>
            {cmsUrl && (
              <p id="cms-hint" className="-mt-4 text-small text-ink-secondary">
                {c.liveSite.editHint}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="timeline-heading" className="flex flex-col gap-4">
          {next.kind === "done" ? (
            // Once the project is finished, the history is still there but out of the way.
            <>
              <h2 id="timeline-heading" className="sr-only">
                {c.timeline.heading}
              </h2>
              <ToggleRow summary={<span className="text-title-s">{c.timeline.history}</span>}>
                <Timeline label={c.timeline.heading} phases={timeline} />
              </ToggleRow>
            </>
          ) : (
            <>
              <h2 id="timeline-heading" className="text-title-l">
                {c.timeline.heading}
              </h2>
              <Timeline label={c.timeline.heading} phases={timeline} />
            </>
          )}
        </section>
      </div>
    </article>
  );
}
