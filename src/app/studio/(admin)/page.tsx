import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag } from "@/components/ds/tag";
import { getDashboard, type DashboardProject } from "@/features/projects/queries";
import { formatDateShort, formatDateTable, formatMinutes } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

export const metadata: Metadata = { title: t.studio.dashboardTitle };

const d = t.studio.dashboard;

function Group({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-baseline gap-2 text-title-m">
        {title}
        <span className="text-mono text-ink-secondary">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p className="text-ink-secondary">{children}</p>
    </Card>
  );
}

function ProjectList({ projects, label }: { projects: DashboardProject[]; label: string }) {
  if (projects.length === 0) return <Empty>{d.noProjects}</Empty>;
  return (
    <InsetGroupedList label={label}>
      {projects.map((p) => (
        <InsetRow key={p.id}>
          <Link href={`/studio/projects/${p.id}`} className="flex flex-col gap-0.5 py-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <span className="min-w-0">
              <span className="font-medium">{p.clientName}</span>
              <span className="text-ink-secondary"> · {p.name}</span>
            </span>
            {p.current.length > 0 && (
              <span className="text-body-compact text-ink-secondary sm:text-right">
                <span className="sr-only">{d.currentStep}: </span>
                {p.current[0].title}
                {p.current[0].activatedAt && <span className="ml-2 text-mono">{formatDateShort(p.current[0].activatedAt)}</span>}
                {p.current.length > 1 && ` · ${d.more(p.current.length - 1)}`}
              </span>
            )}
          </Link>
        </InsetRow>
      ))}
    </InsetGroupedList>
  );
}

export default async function StudioDashboard() {
  const { grouped, changeRequests, usage, renewals } = await getDashboard();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={t.studio.dashboardTitle}
        actions={
          <>
            <ButtonLink href="/studio/projects/new" variant="primary">
              {t.studio.projects.new}
            </ButtonLink>
            <ButtonLink href="/studio/clients/new" variant="secondary">
              {t.studio.clients.new}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-10">
          <Group id="waiting-me" title={d.waitingOnMe} count={grouped.studio.length}>
            <ProjectList projects={grouped.studio} label={d.waitingOnMe} />
          </Group>
          <Group id="waiting-client" title={d.waitingOnClient} count={grouped.client.length}>
            <ProjectList projects={grouped.client} label={d.waitingOnClient} />
          </Group>
          {grouped.paused.length > 0 && (
            <Group id="paused" title={d.paused} count={grouped.paused.length}>
              <ProjectList projects={grouped.paused} label={d.paused} />
            </Group>
          )}
          <Group id="done" title={d.done} count={grouped.done.length}>
            <ProjectList projects={grouped.done} label={d.done} />
          </Group>
        </div>

        <div className="flex flex-col gap-10">
          <Group id="change-requests" title={d.openChangeRequests} count={changeRequests.length}>
            {changeRequests.length === 0 ? (
              <Empty>{d.noChangeRequests}</Empty>
            ) : (
              <InsetGroupedList label={d.openChangeRequests}>
                {changeRequests.map((cr) => (
                  <InsetRow key={cr.id}>
                    <Link href={`/studio/change-requests/${cr.id}`} className="flex flex-col gap-0.5 py-1">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {cr.title}
                        {cr.urgency === "urgent" && <Tag tone="brick">{d.urgent}</Tag>}
                      </span>
                      <span className="text-body-compact text-ink-secondary">
                        {cr.clients?.name} · <span className="text-mono">{formatDateTable(cr.created_at)}</span>
                      </span>
                    </Link>
                  </InsetRow>
                ))}
              </InsetGroupedList>
            )}
          </Group>

          <Group id="hours" title={d.hoursThisMonth} count={usage.length}>
            {usage.length === 0 ? (
              <Empty>{d.noAgreements}</Empty>
            ) : (
              <InsetGroupedList label={d.hoursThisMonth}>
                {usage.map((u) => {
                  const over = u.used_minutes > u.included_minutes;
                  return (
                    <InsetRow key={u.agreement_id}>
                      <div className="flex items-center justify-between gap-4 py-1">
                        <span>{u.client_name}</span>
                        <span className="flex items-center gap-2 text-body-compact text-ink-secondary">
                          {d.hoursOf(formatMinutes(u.used_minutes), formatMinutes(u.included_minutes))}
                          {over && <Tag tone="amber">{d.overAllowance}</Tag>}
                        </span>
                      </div>
                    </InsetRow>
                  );
                })}
              </InsetGroupedList>
            )}
          </Group>

          <Group id="renewals" title={d.renewals} count={renewals.length}>
            {renewals.length === 0 ? (
              <Empty>{d.noRenewals}</Empty>
            ) : (
              <InsetGroupedList label={d.renewals}>
                {renewals.map((r) => (
                  <InsetRow key={`${r.projectId}-${r.kind}`}>
                    <Link href={`/studio/projects/${r.projectId}/site`} className="flex flex-col gap-0.5 py-1">
                      <span>
                        <span className="font-medium">{r.kind === "domain" ? d.domain : d.hosting}</span>
                        {r.what && <span className="text-ink-secondary"> · {r.what}</span>}
                      </span>
                      <span className="text-body-compact text-ink-secondary">
                        {r.project?.clients?.name} · <span className="text-mono">{formatDateTable(r.date)}</span>
                      </span>
                    </Link>
                  </InsetRow>
                ))}
              </InsetGroupedList>
            )}
          </Group>
        </div>
      </div>
    </div>
  );
}
