import Link from "next/link";
import type { Tone } from "./tag";
import { Tag } from "./tag";
import { StatusIndicator } from "./status-indicator";
import { ToggleRow } from "./toggle-row";

export type TimelineStep = { id: string; title: string; href: string; statusLabel: string; tone: Tone; due?: string | null; finished: boolean };
export type TimelinePhase = { id: string; name: string; status: "pending" | "active" | "done"; statusLabel: string; tone: Tone; steps: TimelineStep[] };

// Phases as toggle rows; the current one is in weight 600 and expanded by default, steps
// indented 20px (DESIGN.md, Timeline).
export function Timeline({ phases, label }: { phases: TimelinePhase[]; label: string }) {
  return (
    <ol aria-label={label} className="border-t border-hairline">
      {phases.map((phase) => (
        <li key={phase.id} aria-current={phase.status === "active" ? "step" : undefined} className="border-b border-hairline py-1">
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
            <ul className="flex flex-col pb-2">
              {phase.steps.map((step) => (
                <li key={step.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 md:min-h-9">
                  <Link href={step.href} className={`min-w-0 underline-offset-3 hover:underline ${step.finished ? "text-ink-secondary line-through decoration-1" : ""}`}>
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
        </li>
      ))}
    </ol>
  );
}
