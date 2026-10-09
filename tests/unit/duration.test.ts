import { describe, expect, it } from "vitest";
import { parseDuration } from "@/lib/format/duration";

describe("parseDuration", () => {
  it.each([
    ["1,5", 90],
    ["1.5", 90],
    ["0,25", 15],
    ["1:30", 90],
    ["0:45", 45],
    ["90", 90],
    ["90 min", 90],
    ["45m", 45],
    ["2 t", 120],
    ["2t 15min", 135],
    ["2 timer 15 minutter", 135],
    // What formatMinutes writes must read back.
    ["1 t 30 min", 90],
    ["1,5 t", 90],
    ["3", 180],
  ])("%s → %i minutes", (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes);
  });

  it.each(["", "abc", "0", "1:75", "-1", "t"])("rejects %j", (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});
