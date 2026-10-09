import { stepTurn, type TurnStep } from "@/features/projects/turn";

// What the "Din tur" card shows. See BRIEF.md: the one thing the client needs to do now, or,
// if nothing is waiting on them, what the studio is working on and when to expect news.

export type HubStep = TurnStep & {
  id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  config: { studio_working_text?: string; url?: string; label?: string } | null;
};

export type HubPhase = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  status: "pending" | "active" | "done";
  steps: HubStep[];
};

export type NextAction =
  | { kind: "client"; step: HubStep; phase: HubPhase; others: HubStep[] }
  | { kind: "studio"; phase: HubPhase | null; working: string[]; expectBy: string | null }
  | { kind: "done" };

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export function nextForClient(phases: HubPhase[]): NextAction {
  const ordered = [...phases].sort(byPosition).map((p) => ({ ...p, steps: [...p.steps].sort(byPosition) }));

  const clientSteps = ordered.flatMap((phase) =>
    phase.steps.filter((s) => stepTurn(s) === "client").map((step) => ({ step, phase })),
  );
  if (clientSteps.length > 0) {
    const [first, ...rest] = clientSteps;
    return { kind: "client", step: first.step, phase: first.phase, others: rest.map((r) => r.step) };
  }

  const current = ordered.find((p) => p.status === "active") ?? ordered.find((p) => p.status === "pending") ?? null;
  if (!current && ordered.length > 0) return { kind: "done" };

  const studioSteps = ordered.flatMap((p) => p.steps.filter((s) => stepTurn(s) === "studio"));
  const working = studioSteps.map((s) => s.config?.studio_working_text ?? s.title);
  const dueDates = studioSteps.map((s) => s.due_date).filter((d): d is string => d !== null).sort();

  return { kind: "studio", phase: current, working, expectBy: dueDates[0] ?? null };
}
