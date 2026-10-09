import type { TimelinePhase } from "@/components/ds/timeline";
import type { Tone } from "@/components/ds/tag";
import { stepTurn } from "@/features/projects/turn";
import { formatDateShort, formatWeek } from "@/lib/format/nb";
import { t } from "@/i18n/nb";
import type { HubPhase } from "./next-action";

const c = t.client;

const phaseTone: Record<HubPhase["status"], Tone> = { done: "sage", active: "slate", pending: "neutral" };

// Hub phases → the design system's timeline: status always in words, with the due date and
// week for open steps.
export function toTimeline(projectId: string, phases: HubPhase[]): TimelinePhase[] {
  return phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    status: phase.status,
    statusLabel: c.timeline.status[phase.status],
    tone: phaseTone[phase.status],
    steps: phase.steps.map((step) => {
      const turn = stepTurn(step);
      const finished = step.status === "done" || step.status === "skipped";
      const [statusLabel, tone]: [string, Tone] =
        turn === "client"
          ? [c.timeline.turn.client, "slate"]
          : turn === "studio"
            ? [c.timeline.turn.studio, "neutral"]
            : step.status === "done"
              ? [c.timeline.stepStatus.done, "sage"]
              : [c.timeline.stepStatus[step.status], "neutral"];
      return {
        id: step.id,
        title: step.title,
        href: `/p/${projectId}/steg/${step.id}`,
        statusLabel,
        tone,
        finished,
        due: !finished && step.due_date ? c.overview.due(formatDateShort(step.due_date), formatWeek(step.due_date)) : null,
      };
    }),
  }));
}
