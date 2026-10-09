import Link from "next/link";
import { cardClass } from "./card";
import { StatusIndicator } from "./status-indicator";
import { Tag, type Tone } from "./tag";
import { ToggleRow } from "./toggle-row";

export type TimelineStep = { id: string; title: string; href: string; statusLabel: string; tone: Tone; due?: string | null; finished: boolean };
export type TimelinePhase = { id: string; name: string; status: "pending" | "active" | "done"; statusLabel: string; tone: Tone; steps: TimelineStep[] };

// An inset grouped list in one card. Each phase is a toggle row with a status indicator, the
// name and a tag; the current phase is in weight 600 and expanded by default, its steps in an
// --inset area under the row, aligned with the phase name (DESIGN.md, Timeline).
export function Timeline({ phases, label }: { phases: TimelinePhase[]; label: string }) {
  return (
    <ol aria-label={label} className={cardClass("card", false)}>
      {phases.map((phase, i) => (
        <li
          key={phase.id}
          aria-current={phase.status === "active" ? "step" : undefined}
          className="relative px-2 py-1 first:pt-2 last:pb-2 md:px-3"
        >
          <ToggleRow
            defaultOpen={phase.status === "active"}
            summary={
              <span className="flex items-center gap-3">
                <StatusIndicator status={phase.status} />
                <span className={`min-w-0 ${phase.status === "active" ? "font-semibold" : ""}`}>{phase.name}</span>
              </span>
            }
            trailing={<Tag tone={phase.tone}>{phase.statusLabel}</Tag>}
          >
            {/* Indented so step text lines up with the phase name (12 + 8 + 12 + 8 + 16 + 12 px). */}
            <ul className="mb-2 ml-11 mt-1 rounded-inset bg-inset px-3 py-1">
              {phase.steps.map((step) => (
                <li key={step.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1 md:min-h-10">
                  <Link
                    href={step.href}
                    className={`min-w-0 underline-offset-3 hover:underline hover:decoration-focus ${step.finished ? "text-ink-secondary line-through decoration-1" : ""}`}
                  >
                    {step.title}
                  </Link>
                  <span className="flex flex-wrap items-center gap-2">
                    {step.due && <span className="text-small text-ink-secondary">{step.due}</span>}
                    <Tag tone={step.tone}>{step.statusLabel}</Tag>
                  </span>
                </li>
              ))}
            </ul>
          </ToggleRow>
          {/* Separators start where the phase name starts, not under the icons. */}
          {i < phases.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-16 right-0 h-px bg-separator md:left-[68px]" />}
        </li>
      ))}
    </ol>
  );
}
