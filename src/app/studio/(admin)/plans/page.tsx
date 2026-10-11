import type { Metadata } from "next";
import { AddRow, EditDisclosure } from "@/components/ds/add-row";
import { Card, cardClass } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { Tag } from "@/components/ds/tag";
import { ActionForm, Checkbox, Field, TextArea } from "@/components/form";
import { savePlanAction } from "@/features/maintenance/actions";
import { listPlans } from "@/features/maintenance/queries";
import { formatMinutes, formatOre } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const p = t.studio.plans;

export const metadata: Metadata = { title: p.heading };

type Plan = Awaited<ReturnType<typeof listPlans>>[number];

function PlanFields({ plan }: { plan?: Plan }) {
  return (
    <>
      <Field label={p.name} name="name" required defaultValue={plan?.name ?? ""} />
      <Field label={p.description} name="description" defaultValue={plan?.description ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={p.price} name="price" required inputMode="numeric" defaultValue={plan ? String(plan.monthly_price_ore / 100) : ""} />
        <Field label={p.hours} hint={p.hoursHint} name="hours" required inputMode="decimal" defaultValue={plan ? formatMinutes(plan.included_minutes_per_month) : ""} />
      </div>
      <TextArea label={p.includes} hint={p.includesHint} name="includes" rows={4} grow defaultValue={plan?.includes.join("\n") ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={p.responseTime} name="response_time" defaultValue={plan?.response_time ?? ""} />
        <Field label={p.notice} name="notice_period" defaultValue={plan?.notice_period ?? ""} />
      </div>
      <Checkbox label={p.active} name="is_active" defaultChecked={plan?.is_active ?? true} />
    </>
  );
}

export default async function PlansPage() {
  const plans = await listPlans();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={p.heading} />
      {plans.length === 0 ? (
        <Card>
          <EmptyState>{p.empty}</EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <li key={plan.id} className={`flex flex-col gap-3 ${cardClass("card")}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-title-m">{plan.name}</h2>
                {!plan.is_active && <Tag>{p.inactive}</Tag>}
              </div>
              <p className="text-ink-secondary">{p.perMonth(formatOre(plan.monthly_price_ore), formatMinutes(plan.included_minutes_per_month))}</p>
              {plan.includes.length > 0 && (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-body marker:text-ink-disabled">
                  {plan.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <div className="mt-auto">
                <EditDisclosure label={p.edit(plan.name)}>
                  <ActionForm action={savePlanAction.bind(null, plan.id)} submitLabel={p.save} pendingLabel={t.common.loading}>
                    <PlanFields plan={plan} />
                  </ActionForm>
                </EditDisclosure>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddRow label={p.add}>
        <div className={cardClass("card")}>
          <ActionForm action={savePlanAction.bind(null, null)} submitLabel={p.save} pendingLabel={t.common.loading}>
            <PlanFields />
          </ActionForm>
        </div>
      </AddRow>
    </div>
  );
}
