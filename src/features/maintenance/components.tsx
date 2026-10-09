import { Badge } from "@/components/ui";
import { formatMinutes } from "@/lib/format/money";
import { t } from "@/i18n/nb";

const m = t.client.maintenance;
const r = t.client.requests;

// Hours used this month against the allowance. The bar is decoration; the text carries it.
export function HoursMeter({ used, included, month }: { used: number; included: number; month: string }) {
  const share = included > 0 ? Math.min(used / included, 1) : used > 0 ? 1 : 0;
  const over = used > included;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{m.hoursThisMonth(month)}</p>
      <p className="text-2xl">{m.hoursOf(formatMinutes(used), formatMinutes(included))}</p>
      <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
      {over && <p className="text-sm">{m.over}</p>}
    </div>
  );
}

type Status = keyof typeof r.status;

export function RequestStatus({ status }: { status: Status }) {
  const tone = status === "done" ? "success" : status === "waiting_on_client" ? "accent" : status === "declined" ? "muted" : "neutral";
  return <Badge tone={tone}>{r.status[status]}</Badge>;
}
