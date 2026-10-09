import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader, Section, buttonClass } from "@/components/ui";
import { getDashboard, type DashboardProject } from "@/features/projects/queries";
import { formatDate } from "@/lib/format/date";
import { formatMinutes } from "@/lib/format/money";
import { t } from "@/i18n/nb";

export const metadata: Metadata = { title: t.studio.dashboardTitle };

const d = t.studio.dashboard;

function ProjectList({ projects }: { projects: DashboardProject[] }) {
  if (projects.length === 0) return <Empty>{d.noProjects}</Empty>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {projects.map((p) => (
        <li key={p.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <div>
            <Link href={`/studio/projects/${p.id}`} className="text-lg font-medium underline-offset-4 hover:underline">
              {p.clientName}
            </Link>
            <span className="text-muted"> · {p.name}</span>
          </div>
          {p.current.length > 0 && (
            <p className="text-sm text-muted">
              <span className="sr-only">{d.currentStep}: </span>
              {p.current[0].title}
              {p.current[0].activatedAt && ` · ${t.studio.projects.openSince(formatDate(p.current[0].activatedAt))}`}
              {p.current.length > 1 && ` · ${d.more(p.current.length - 1)}`}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function StudioDashboard() {
  const { grouped, changeRequests, usage, renewals } = await getDashboard();

  return (
    <>
      <PageHeader
        title={t.studio.dashboardTitle}
        actions={
          <>
            <Link href="/studio/projects/new" className={buttonClass.primary}>
              {t.studio.projects.new}
            </Link>
            <Link href="/studio/clients/new" className={buttonClass.secondary}>
              {t.studio.clients.new}
            </Link>
          </>
        }
      />

      <div className="grid gap-x-12 lg:grid-cols-[2fr_1fr]">
        <div>
          <Section id="waiting-me" title={`${d.waitingOnMe} (${grouped.studio.length})`}>
            <ProjectList projects={grouped.studio} />
          </Section>
          <Section id="waiting-client" title={`${d.waitingOnClient} (${grouped.client.length})`}>
            <ProjectList projects={grouped.client} />
          </Section>
          {grouped.paused.length > 0 && (
            <Section id="paused" title={`${d.paused} (${grouped.paused.length})`}>
              <ProjectList projects={grouped.paused} />
            </Section>
          )}
          <Section id="done" title={`${d.done} (${grouped.done.length})`}>
            <ProjectList projects={grouped.done} />
          </Section>
        </div>

        <div>
          <Section id="change-requests" title={d.openChangeRequests}>
            {changeRequests.length === 0 ? (
              <Empty>{d.noChangeRequests}</Empty>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {changeRequests.map((cr) => (
                  <li key={cr.id} className="flex flex-col gap-1 py-3">
                    <p className="font-medium">
                      <Link href={`/studio/change-requests/${cr.id}`} className="underline-offset-4 hover:underline">
                        {cr.title}
                      </Link>{" "}
                      {cr.urgency === "urgent" && <Badge tone="danger">{d.urgent}</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {cr.clients?.name} · {formatDate(cr.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="hours" title={d.hoursThisMonth}>
            {usage.length === 0 ? (
              <Empty>{d.noAgreements}</Empty>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {usage.map((u) => {
                  const over = u.used_minutes > u.included_minutes;
                  return (
                    <li key={u.agreement_id} className="flex items-baseline justify-between gap-4 py-3">
                      <span>{u.client_name}</span>
                      <span className={`text-sm ${over ? "font-medium text-danger" : "text-muted"}`}>
                        {d.hoursOf(formatMinutes(u.used_minutes), formatMinutes(u.included_minutes))}
                        {over && <span className="block text-xs">{d.overAllowance}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="renewals" title={d.renewals}>
            {renewals.length === 0 ? (
              <Empty>{d.noRenewals}</Empty>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {renewals.map((r) => (
                  <li key={`${r.projectId}-${r.kind}`} className="flex flex-col gap-1 py-3">
                    <p>
                      <span className="font-medium">{r.kind === "domain" ? d.domain : d.hosting}</span>
                      {r.what && ` · ${r.what}`}
                    </p>
                    <p className="text-sm text-muted">
                      {r.project?.clients?.name} · {formatDate(r.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
