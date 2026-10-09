import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui";
import { HoursMeter } from "@/features/maintenance/components";
import { getMaintenanceForClient } from "@/features/maintenance/queries";
import { formatDate, formatMonth, todayInOslo } from "@/lib/format/date";
import { formatMinutes, formatOre } from "@/lib/format/money";
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
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl tracking-tight">{m.heading}</h1>
        <Link href={`/p/${projectId}/endringer/ny`} className={`${buttonClass.primary} h-12 w-full text-base sm:w-auto`}>
          {t.client.requests.new}
        </Link>
      </div>

      {!agreement || !plan ? (
        <p className="max-w-prose text-lg leading-relaxed text-muted">{m.noAgreement}</p>
      ) : (
        <section aria-labelledby="agreement-heading" className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <p className="text-sm text-muted">
              {m.agreement} · {m.status[agreement.status]} · {m.since(formatDate(agreement.start_date))}
            </p>
            <h2 id="agreement-heading" className="font-serif text-3xl">
              {plan.name}
            </h2>
            <p className="text-muted">{m.perMonth(formatOre(agreement.price_override_ore ?? plan.monthly_price_ore))}</p>
          </div>
          {usage && <HoursMeter used={usage.used_minutes} included={usage.included_minutes} month={formatMonth(todayInOslo())} />}
          {plan.includes.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium">{m.includes}</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {plan.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid gap-4 sm:grid-cols-2">
            {plan.response_time && (
              <div>
                <dt className="text-sm text-muted">{m.responseTime}</dt>
                <dd>{plan.response_time}</dd>
              </div>
            )}
            {plan.notice_period && (
              <div>
                <dt className="text-sm text-muted">{m.notice}</dt>
                <dd>{plan.notice_period}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section aria-labelledby="log-heading" className="flex flex-col gap-6">
        <h2 id="log-heading" className="font-serif text-2xl">
          {m.log}
        </h2>
        {log.length === 0 ? (
          <p className="text-muted">{m.logEmpty}</p>
        ) : (
          [...months.entries()].map(([month, entries]) => (
            <div key={month}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-muted">{formatMonth(`${month}-01`)}</h3>
              <ul className="divide-y divide-line border-y border-line">
                {entries.map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 py-3">
                    <p className="font-medium">{e.title}</p>
                    {e.description && <p className="whitespace-pre-line text-sm leading-relaxed">{e.description}</p>}
                    <p className="text-sm text-muted">
                      {formatDate(e.entry_date)}
                      {e.minutes ? ` · ${m.timeSpent(formatMinutes(e.minutes))}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
