import { AddRow, EditDisclosure } from "@/components/ds/add-row";
import { Card } from "@/components/ds/card";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { ActionForm, Field, Select } from "@/components/form";
import { saveAgreementAction } from "@/features/maintenance/actions";
import { HoursMeter } from "@/features/maintenance/components";
import { getAgreementsForClient } from "@/features/maintenance/queries";
import { formatDate, formatMinutes, formatMonth, todayInOslo } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const a = t.studio.agreements;
const statuses = t.client.maintenance.status;

type Data = Awaited<ReturnType<typeof getAgreementsForClient>>;

function AgreementFields({ data, agreement }: { data: Data; agreement?: Data["agreements"][number] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
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
  );
}

export async function Agreements({ clientId }: { clientId: string }) {
  const data = await getAgreementsForClient(clientId);
  return (
    <Section id="agreements" title={a.heading} card={false}>
      {data.agreements.length === 0 && (
        <Card>
          <p className="text-ink-secondary">{a.none}</p>
        </Card>
      )}
      {data.agreements.map((ag) => {
        const usage = data.usage.get(ag.id);
        return (
          <Card key={ag.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{ag.maintenance_plans?.name}</p>
                <p className="text-body-compact text-ink-secondary">
                  {ag.projects?.name} · {formatDate(ag.start_date)}
                </p>
              </div>
              <Tag tone={ag.status === "active" ? "sage" : ag.status === "proposed" ? "slate" : "neutral"}>{statuses[ag.status]}</Tag>
            </div>
            {usage && <HoursMeter used={usage.used_minutes} included={usage.included_minutes} month={formatMonth(todayInOslo())} />}
            <EditDisclosure label={a.edit}>
              <ActionForm action={saveAgreementAction.bind(null, clientId, ag.id)} submitLabel={a.save} pendingLabel={t.common.loading}>
                <AgreementFields data={data} agreement={ag} />
              </ActionForm>
            </EditDisclosure>
          </Card>
        );
      })}
      {data.projects.length > 0 &&
        (data.plans.some((p) => p.is_active) ? (
          <AddRow label={a.add}>
            <Card>
              <ActionForm action={saveAgreementAction.bind(null, clientId, null)} submitLabel={a.save} pendingLabel={t.common.loading}>
                <AgreementFields data={data} />
              </ActionForm>
            </Card>
          </AddRow>
        ) : (
          <p className="text-small text-ink-secondary">{a.noPlans}</p>
        ))}
    </Section>
  );
}
