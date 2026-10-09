import { Tag, type Tone } from "@/components/ds/tag";
import { formatMinutes } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const m = t.client.maintenance;
const r = t.client.requests;

// Hours used this month against the allowance. The bar is decoration; the text carries it.
export function HoursMeter({ used, included, month }: { used: number; included: number; month: string }) {
  const share = included > 0 ? Math.min(used / included, 1) : used > 0 ? 1 : 0;
  const over = used > included;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-ink-secondary">{m.hoursThisMonth(month)}</p>
      <p className="text-title-m">{m.hoursOf(formatMinutes(used), formatMinutes(included))}</p>
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-sm bg-active">
        <div className={`h-full ${over ? "bg-brick-fg" : "bg-slate-fg"}`} style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
      {over && <p className="text-small text-amber-fg">{m.over}</p>}
    </div>
  );
}

type Status = keyof typeof r.status;

const requestTone: Record<Status, Tone> = {
  new: "neutral",
  accepted: "slate",
  in_progress: "slate",
  waiting_on_client: "amber",
  done: "sage",
  declined: "neutral",
};

export function RequestStatus({ status }: { status: Status }) {
  return <Tag tone={requestTone[status]}>{r.status[status]}</Tag>;
}
