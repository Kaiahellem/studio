import { ActionForm, Field, Select } from "@/components/form";
import { Badge, Empty, Section } from "@/components/ui";
import { saveAgreementAction } from "@/features/maintenance/actions";
import { HoursMeter } from "@/features/maintenance/components";
import { getAgreementsForClient } from "@/features/maintenance/queries";
import { formatDate, formatMonth, todayInOslo } from "@/lib/format/date";
import { formatMinutes } from "@/lib/format/money";
import { t } from "@/i18n/nb";

const a = t.studio.agreements;
const statuses = t.client.maintenance.status;

type Data = Awaited<ReturnType<typeof getAgreementsForClient>>;

function AgreementFields({ data, agreement }: { data: Data; agreement?: Data["agreements"][number] }) {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Select label={a.project} name="project_id" defaultValue={agreement?.project_id} options={data.projects.map((p) => ({ value: p.id, label: p.name }))} />
        <Select
          label={a.plan}
          name="plan_id"
          defaultValue={agreement?.plan_id}
          options={data.plans.filter((p) => p.is_active || p.id === agreement?.plan_id).map((p) => ({ value: p.id, label: p.name }))}
        />
        <Select
          label={a.status}
          name="status"
          defaultValue={agreement?.status ?? "proposed"}
          options={(Object.keys(statuses) as (keyof typeof statuses)[]).map((k) => ({ value: k, label: statuses[k] }))}
        />
        <Field label={a.start} name="start_date" type="date" required defaultValue={agreement?.start_date ?? todayInOslo()} />
        <Field label={a.end} name="end_date" type="date" defaultValue={agreement?.end_date ?? ""} />
        <Field label={a.priceOverride} name="price_override" inputMode="numeric" defaultValue={agreement?.price_override_ore != null ? String(agreement.price_override_ore / 100) : ""} />
        <Field label={a.hoursOverride} hint={t.studio.requests.durationHint} name="minutes_override" inputMode="decimal" defaultValue={agreement?.minutes_override != null ? formatMinutes(agreement.minutes_override) : ""} />
      </div>
    </>
  );
}

export async function Agreements({ clientId }: { clientId: string }) {
  const data = await getAgreementsForClient(clientId);
  return (
    <Section id="agreements" title={a.heading}>
      {data.agreements.length === 0 ? (
        <Empty>{a.none}</Empty>
      ) : (
        <ul className="mb-8 flex flex-col gap-4">
          {data.agreements.map((ag) => {
            const usage = data.usage.get(ag.id);
            return (
              <li key={ag.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{ag.maintenance_plans?.name}</p>
                  <Badge tone={ag.status === "active" ? "success" : "muted"}>{statuses[ag.status]}</Badge>
                  <span className="text-sm text-muted">
                    {ag.projects?.name} · {formatDate(ag.start_date)}
                  </span>
                </div>
                {usage && <HoursMeter used={usage.used_minutes} included={usage.included_minutes} month={formatMonth(todayInOslo())} />}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm underline underline-offset-4 hover:no-underline">{a.edit}</summary>
                  <div className="mt-4">
                    <ActionForm action={saveAgreementAction.bind(null, clientId, ag.id)} submitLabel={a.save} pendingLabel={t.common.loading}>
                      <AgreementFields data={data} agreement={ag} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {data.projects.length > 0 &&
        (data.plans.some((p) => p.is_active) ? (
          <details>
            <summary className="cursor-pointer text-sm underline underline-offset-4 hover:no-underline">{a.add}</summary>
            <div className="mt-4">
              <ActionForm action={saveAgreementAction.bind(null, clientId, null)} submitLabel={a.save} pendingLabel={t.common.loading}>
                <AgreementFields data={data} />
              </ActionForm>
            </div>
          </details>
        ) : (
          <p className="text-sm text-muted">{a.noPlans}</p>
        ))}
    </Section>
  );
}
