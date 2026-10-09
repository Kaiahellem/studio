import { describe, expect, it } from "vitest";
import { projectGroup, stepTurn, type TurnStep } from "@/features/projects/turn";

const step = (over: Partial<TurnStep>): TurnStep => ({ status: "active", owner: "client", type: "task", ...over });

describe("stepTurn", () => {
  it("is nobody's turn when the step is not active", () => {
    expect(stepTurn(step({ status: "pending" }))).toBeNull();
    expect(stepTurn(step({ status: "done" }))).toBeNull();
    expect(stepTurn(step({ status: "skipped" }))).toBeNull();
  });

  it("follows the owner for ordinary steps", () => {
    expect(stepTurn(step({ owner: "client", type: "upload" }))).toBe("client");
    expect(stepTurn(step({ owner: "studio", type: "task" }))).toBe("studio");
  });

  it("approval without a round: studio prepares the version", () => {
    expect(stepTurn(step({ type: "approval", latestRound: null }))).toBe("studio");
  });

  it("approval with an unanswered round: client reviews", () => {
    expect(stepTurn(step({ type: "approval", latestRound: { round: 1, answered: false } }))).toBe("client");
  });

  it("approval after the client asked for changes: back to studio", () => {
    expect(stepTurn(step({ type: "approval", latestRound: { round: 1, answered: true } }))).toBe("studio");
  });
});

describe("projectGroup", () => {
  const active = { status: "active" } as const;

  it("puts a project on my list when any active step is mine", () => {
    expect(projectGroup(active, [step({ owner: "client" }), step({ owner: "studio" })])).toBe("studio");
  });

  it("puts a project on the client's list when only they can act", () => {
    expect(projectGroup(active, [step({ owner: "client" }), step({ status: "pending", owner: "studio" })])).toBe("client");
  });

  it("is done when every step is finished", () => {
    expect(projectGroup(active, [step({ status: "done" }), step({ status: "skipped" })])).toBe("done");
  });

  it("respects project status", () => {
    expect(projectGroup({ status: "completed" }, [step({})])).toBe("done");
    expect(projectGroup({ status: "paused" }, [step({})])).toBe("paused");
  });

  it("an empty project is on my list", () => {
    expect(projectGroup(active, [])).toBe("studio");
  });
});
