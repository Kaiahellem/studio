import type { ReactNode } from "react";

// Status is always text in a tag, never colour alone (DESIGN.md, Status).
export type Tone = "neutral" | "slate" | "sage" | "amber" | "brick";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-bg text-neutral-fg",
  slate: "bg-slate-bg text-slate-fg",
  sage: "bg-sage-bg text-sage-fg",
  amber: "bg-amber-bg text-amber-fg",
  brick: "bg-brick-bg text-brick-fg",
};

export function Tag({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded-sm px-2 py-0.5 text-label md:min-h-5 md:py-0 ${tones[tone]}`}>
      {children}
    </span>
  );
}
