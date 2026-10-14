import type { Tone } from "@/components/ds/tag";
import type { RunStatus } from "./queries";

export const statusTone: Record<RunStatus, Tone> = {
  queued: "slate",
  crawling: "slate",
  checking: "slate",
  analysing: "slate",
  awaiting_result: "amber",
  done: "sage",
  failed: "brick",
};

export const isWorking = (status: RunStatus) => status === "queued" || status === "crawling" || status === "checking" || status === "analysing";
