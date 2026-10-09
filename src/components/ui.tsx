import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { Tag, type Tone } from "@/components/ds/tag";

// Older helpers, now backed by the design system in components/ds. Pages are moving to the
// ds components one at a time; these keep the rest consistent meanwhile.

export const buttonClass = {
  primary: buttonVariants.primary,
  secondary: buttonVariants.secondary,
  small: buttonVariants.secondary,
  danger: buttonVariants.destructive,
  link: buttonVariants.ghost,
} as const;

type LegacyTone = "neutral" | "accent" | "success" | "danger" | "muted";
const toneMap: Record<LegacyTone, Tone> = { neutral: "neutral", accent: "slate", success: "sage", danger: "brick", muted: "neutral" };

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: LegacyTone }) {
  return <Tag tone={toneMap[tone]}>{children}</Tag>;
}

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-small text-ink-secondary">{eyebrow}</p>}
        <h1 className="text-title-xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, id, children, actions }: { title: string; id: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-16">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-2">
        <h2 id={id} className="text-title-l">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>;
}
