import type { Metadata } from "next";
import { ActionForm, Checkbox, Field, TextArea } from "@/components/form";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { savePlanAction } from "@/features/maintenance/actions";
import { listPlans } from "@/features/maintenance/queries";
import { formatMinutes, formatOre } from "@/lib/format/money";
import { t } from "@/i18n/nb";

const p = t.studio.plans;

export const metadata: Metadata = { title: p.heading };

type Plan = Awaited<ReturnType<typeof listPlans>>[number];

function PlanFields({ plan }: { plan?: Plan }) {
  return (
    <>
      <Field label={p.name} name="name" required defaultValue={plan?.name ?? ""} />
      <Field label={p.description} name="description" defaultValue={plan?.description ?? ""} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={p.price} name="price" required inputMode="numeric" defaultValue={plan ? String(plan.monthly_price_ore / 100) : ""} />
        <Field label={p.hours} hint={p.hoursHint} name="hours" required inputMode="decimal" defaultValue={plan ? formatMinutes(plan.included_minutes_per_month) : ""} />
      </div>
      <TextArea label={p.includes} hint={p.includesHint} name="includes" rows={4} defaultValue={plan?.includes.join("\n") ?? ""} />
      <div className="grid gap-6 sm:grid-cols-2">
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
    <>
      <PageHeader title={p.heading} />
      <div className="grid gap-x-12 lg:grid-cols-[3fr_2fr]">
        <Section id="plans" title={p.heading}>
          {plans.length === 0 ? (
            <Empty>{p.empty}</Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {plans.map((plan) => (
                <li key={plan.id} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{plan.name}</p>
                    {!plan.is_active && <Badge tone="muted">{p.inactive}</Badge>}
                  </div>
                  <p className="text-sm text-muted">{p.perMonth(formatOre(plan.monthly_price_ore), formatMinutes(plan.included_minutes_per_month))}</p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm underline underline-offset-4 hover:no-underline">{p.edit(plan.name)}</summary>
                    <div className="mt-4">
                      <ActionForm action={savePlanAction.bind(null, plan.id)} submitLabel={p.save} pendingLabel={t.common.loading}>
                        <PlanFields plan={plan} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section id="new-plan" title={p.add}>
          <ActionForm action={savePlanAction.bind(null, null)} submitLabel={p.save} pendingLabel={t.common.loading}>
            <PlanFields />
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
