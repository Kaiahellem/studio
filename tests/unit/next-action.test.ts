import { describe, expect, it } from "vitest";
import { nextForClient, type HubPhase, type HubStep } from "@/features/hub/next-action";

let n = 0;
const step = (over: Partial<HubStep> = {}): HubStep => ({
  id: `s${++n}`,
  title: `Steg ${n}`,
  description: null,
  position: n,
  due_date: null,
  config: null,
  status: "pending",
  owner: "client",
  type: "task",
  ...over,
});
const phase = (over: Partial<HubPhase> & { steps: HubStep[] }): HubPhase => ({
  id: `p${++n}`,
  name: `Fase ${n}`,
  description: null,
  position: n,
  status: "pending",
  ...over,
});

describe("nextForClient", () => {
  it("picks the first active client step, in phase and step order", () => {
    const later = step({ status: "active", title: "Bilder", position: 2 });
    const first = step({ status: "active", title: "Logo", position: 1 });
    const result = nextForClient([phase({ status: "active", steps: [later, first] })]);
    expect(result.kind).toBe("client");
    if (result.kind !== "client") return;
    expect(result.step.title).toBe("Logo");
    expect(result.others.map((s) => s.title)).toEqual(["Bilder"]);
  });

  it("approval with an open round is the client's turn", () => {
    const approval = step({ status: "active", type: "approval", latestRound: { round: 1, answered: false } });
    expect(nextForClient([phase({ status: "active", steps: [approval] })]).kind).toBe("client");
  });

  it("when waiting on the studio, says what we work on and the earliest due date", () => {
    const design = step({
      status: "active",
      type: "approval",
      latestRound: null,
      config: { studio_working_text: "Vi jobber med designet." },
      due_date: "2026-11-02",
    });
    const other = step({ status: "active", owner: "studio", title: "Oppsett av CMS", due_date: "2026-10-20" });
    const result = nextForClient([phase({ status: "active", name: "Design", steps: [design, other] })]);
    expect(result).toMatchObject({
      kind: "studio",
      working: ["Vi jobber med designet.", "Oppsett av CMS"],
      expectBy: "2026-10-20",
    });
  });

  it("is studio's turn with no date when none is set", () => {
    const result = nextForClient([phase({ status: "active", steps: [step({ status: "active", owner: "studio" })] })]);
    expect(result).toMatchObject({ kind: "studio", expectBy: null });
  });

  it("is done when every phase is done", () => {
    expect(nextForClient([phase({ status: "done", steps: [step({ status: "done" })] })]).kind).toBe("done");
  });
});
