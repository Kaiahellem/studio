import { describe, expect, it } from "vitest";
import { formatMinutes, formatOre, kronerToOre } from "@/lib/format/money";
import { formatDate, formatDateTime, formatMonth, todayInOslo } from "@/lib/format/date";

// nb-NO uses a narrow no-break space as the thousands separator; normalise for readability.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatOre", () => {
  it("formats whole kroner without decimals", () => {
    expect(plain(formatOre(149000))).toBe("1 490 kr");
  });

  it("keeps øre when there are any", () => {
    expect(plain(formatOre(149050))).toBe("1 490,5 kr");
  });

  it("formats zero", () => {
    expect(plain(formatOre(0))).toBe("0 kr");
  });

  it("rejects non-integer øre", () => {
    expect(() => formatOre(1.5)).toThrow(TypeError);
  });

  it("converts kroner to øre without float drift", () => {
    expect(kronerToOre(19.99)).toBe(1999);
  });
});

describe("formatMinutes", () => {
  it.each([
    [45, "45 min"],
    [60, "1 t"],
    [90, "1 t 30 min"],
    [0, "0 min"],
  ])("%i → %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});

describe("dates", () => {
  it("formats a Postgres date as the same calendar day", () => {
    expect(formatDate("2026-10-09")).toBe("9. oktober 2026");
  });

  it("formats timestamps in Oslo time", () => {
    // 22:30 UTC is 00:30 the next day in Oslo (summer time ends 25 October 2026).
    expect(plain(formatDateTime("2026-10-09T22:30:00Z"))).toBe("10. oktober 2026 kl. 00:30");
  });

  it("formats months", () => {
    expect(formatMonth("2026-10-01")).toBe("oktober 2026");
  });

  it("gives today's date in Oslo, not UTC", () => {
    expect(todayInOslo(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
