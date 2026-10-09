// Whose turn is it? Shared by the admin dashboard and the client's "Din tur" card.
// See docs/PLAN.md §6.2 for approval steps.

export type Party = "client" | "studio";

export type TurnStep = {
  status: "pending" | "active" | "done" | "skipped";
  owner: Party;
  type: "task" | "upload" | "approval" | "form" | "link";
  // Approval steps: the latest round and whether the client has answered it.
  latestRound?: { round: number; answered: boolean } | null;
};

// Who must act on a step right now, or null if nobody (not active).
export function stepTurn(step: TurnStep): Party | null {
  if (step.status !== "active") return null;
  if (step.type === "approval") {
    // No open round means the studio is preparing the next version.
    const round = step.latestRound;
    return round && !round.answered ? "client" : "studio";
  }
  return step.owner;
}

export type ProjectGroup = "studio" | "client" | "done" | "paused";

// Dashboard grouping. A project waiting on both parties counts as waiting on the studio,
// since that is where the next move is in my hands.
export function projectGroup(
  project: { status: "active" | "paused" | "completed" | "archived" },
  steps: TurnStep[],
): ProjectGroup {
  if (project.status === "completed" || project.status === "archived") return "done";
  if (project.status === "paused") return "paused";

  const turns = steps.map(stepTurn);
  if (turns.includes("studio")) return "studio";
  if (turns.includes("client")) return "client";
  // Nothing active: either every step is finished, or the project has no steps yet.
  const allFinished = steps.length > 0 && steps.every((s) => s.status === "done" || s.status === "skipped");
  return allFinished ? "done" : "studio";
}
