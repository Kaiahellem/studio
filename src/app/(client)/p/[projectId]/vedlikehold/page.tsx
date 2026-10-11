import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag } from "@/components/ds/tag";
import { HoursMeter } from "@/features/maintenance/components";
import { getMaintenanceForClient } from "@/features/maintenance/queries";
import { formatDate, formatMinutes, formatMonth, formatOre, todayInOslo } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const m = t.client.maintenance;

export const metadata: Metadata = { title: m.heading };

export default async function MaintenancePage({ params }: PageProps<"/p/[projectId]/vedlikehold">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { agreement, usage, log } = await getMaintenanceForClient(projectId);
  const plan = agreement?.maintenance_plans;

  // The log, newest month first.
  const months = new Map<string, typeof log>();
  for (const entry of log) {
    const key = entry.entry_date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), entry]);
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={m.heading}
        trail={[{ label: t.client.nav.overview, href: `/p/${projectId}` }]}
        actions={
          <ButtonLink href={`/p/${projectId}/endringer/ny`} variant="primary">
            {t.client.requests.new}
          </ButtonLink>
        }
        properties={
          agreement && plan
            ? [
                { label: m.agreement, value: plan.name },
                { label: t.client.step.properties.status, value: <Tag tone={agreement.status === "active" ? "sage" : "neutral"}>{m.status[agreement.status]}</Tag> },
                { label: m.priceLabel, value: m.perMonth(formatOre(agreement.price_override_ore ?? plan.monthly_price_ore)) },
                { label: m.responseTime, value: plan.response_time },
                { label: m.notice, value: plan.notice_period },
                { label: m.sinceLabel, value: formatDate(agreement.start_date) },
              ]
            : []
        }
      />

      {!agreement || !plan ? (
        <Card>
          <p className="text-body">{m.noAgreement}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-6">
          {usage && <HoursMeter used={usage.used_minutes} included={usage.included_minutes} month={formatMonth(todayInOslo())} />}
          {plan.includes.length > 0 && (
            <div className="rounded-inset bg-inset p-4">
              <h2 className="mb-2 text-title-s">{m.includes}</h2>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {plan.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <section aria-labelledby="log-heading" className="flex flex-col gap-4">
        <h2 id="log-heading" className="text-title-l">
          {m.log}
        </h2>
        {log.length === 0 ? (
          <p className="text-ink-secondary">{m.logEmpty}</p>
        ) : (
          [...months.entries()].map(([month, entries]) => (
            <div key={month} className="flex flex-col gap-2">
              <h3 className="text-title-s">{formatMonth(`${month}-01`)}</h3>
              <InsetGroupedList label={formatMonth(`${month}-01`)}>
                {entries.map((e) => (
                  <InsetRow key={e.id}>
                    <div className="flex flex-col gap-0.5 py-1">
                      <p className="font-medium">{e.title}</p>
                      {e.description && <p className="whitespace-pre-line text-small">{e.description}</p>}
                      <p className="text-small text-ink-secondary">
                        {formatDate(e.entry_date)}
                        {e.minutes ? ` · ${m.timeSpent(formatMinutes(e.minutes))}` : ""}
                      </p>
                    </div>
                  </InsetRow>
                ))}
              </InsetGroupedList>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
