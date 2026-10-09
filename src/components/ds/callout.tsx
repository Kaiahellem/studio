import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export type CalloutTone = "neutral" | "info" | "success" | "warning" | "critical";

// An --inset area inside a card with a 16px icon and text; status tint instead of --inset when
// colour carries meaning. Never a border (DESIGN.md, Callouts).
const tones: Record<CalloutTone, { box: string; icon: LucideIcon; ink: string }> = {
  neutral: { box: "bg-inset", icon: Info, ink: "text-ink-secondary" },
  info: { box: "bg-slate-bg", icon: Info, ink: "text-slate-fg" },
  success: { box: "bg-sage-bg", icon: CircleCheck, ink: "text-sage-fg" },
  warning: { box: "bg-amber-bg", icon: TriangleAlert, ink: "text-amber-fg" },
  critical: { box: "bg-brick-bg", icon: CircleAlert, ink: "text-brick-fg" },
};

export function Callout({ tone = "neutral", icon, children, role }: { tone?: CalloutTone; icon?: LucideIcon; children: ReactNode; role?: "status" | "alert" }) {
  const t = tones[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-inset p-4 ${t.box}`}>
      <Icon icon={icon ?? t.icon} className={`mt-[5px] ${t.ink}`} />
      <div className={`min-w-0 flex-1 text-body ${tone === "neutral" ? "text-ink" : t.ink}`}>{children}</div>
    </div>
  );
}
