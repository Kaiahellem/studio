import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export type CalloutTone = "neutral" | "info" | "success" | "warning" | "critical";

const tones: Record<CalloutTone, { box: string; icon: LucideIcon; ink: string }> = {
  neutral: { box: "border-hairline bg-subtle", icon: Info, ink: "text-ink-secondary" },
  info: { box: "border-slate-fg bg-slate-bg", icon: Info, ink: "text-slate-fg" },
  success: { box: "border-sage-fg bg-sage-bg", icon: CircleCheck, ink: "text-sage-fg" },
  warning: { box: "border-amber-fg bg-amber-bg", icon: TriangleAlert, ink: "text-amber-fg" },
  critical: { box: "border-brick-fg bg-brick-bg", icon: CircleAlert, ink: "text-brick-fg" },
};

// Always icon plus text (DESIGN.md, Callouts).
export function Callout({
  tone = "neutral",
  title,
  icon,
  children,
  action,
  headingLevel = 2,
  id,
  role,
}: {
  tone?: CalloutTone;
  title?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
  id?: string;
  role?: "status" | "alert";
}) {
  const t = tones[tone];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={title && id ? id : undefined} role={role} className={`flex gap-3 rounded-sm border p-4 ${t.box}`}>
      <Icon icon={icon ?? t.icon} className={`mt-1 ${t.ink}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title && (
          <Heading id={id} className="text-title-s">
            {title}
          </Heading>
        )}
        {children && <div className="text-body">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </section>
  );
}
