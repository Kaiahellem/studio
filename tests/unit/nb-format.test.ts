import { describe, expect, it } from "vitest";
import {
  compareNb,
  formatDate,
  formatDateShort,
  formatDateTable,
  formatDateTime,
  formatHours,
  formatMinutes,
  formatMonth,
  formatNumber,
  formatOre,
  formatOrgNumber,
  formatPhone,
  formatRelative,
  formatTime,
  formatTimeTable,
  formatWeek,
  isValidOrgNumber,
  isValidPostnummer,
  kronerToOre,
  parsePhone,
  telHref,
  todayInOslo,
  weekNumber,
} from "@/lib/format/nb";

// Intl uses no-break spaces; compare with plain spaces for readability.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("dates", () => {
  it("text, table and short formats", () => {
    expect(formatDate("2026-10-09")).toBe("9. oktober 2026");
    expect(formatDateTable("2026-10-09")).toBe("09.10.2026");
    expect(formatDateShort("2026-10-09", new Date("2026-10-20T10:00:00Z"))).toBe("9. okt.");
    expect(formatDateShort("2025-10-09", new Date("2026-10-20T10:00:00Z"))).toBe("9. okt. 2025");
    expect(formatMonth("2026-10-01")).toBe("oktober 2026");
  });

  it("time uses a full stop in text and a colon in tables, 24-hour, in Oslo time", () => {
    // 12:30 UTC is 14:30 in Oslo (summer time until 25 October 2026).
    expect(plain(formatTime("2026-10-09T12:30:00Z"))).toBe("kl. 14.30");
    expect(formatTimeTable("2026-10-09T12:30:00Z")).toBe("14:30");
    expect(plain(formatDateTime("2026-10-09T22:30:00Z"))).toBe("10. oktober 2026 kl. 00.30");
  });

  it("today in Oslo, not UTC", () => {
    expect(todayInOslo(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("relative time", () => {
    const now = new Date("2026-10-09T12:00:00Z"); // 14:00 in Oslo
    expect(formatRelative("2026-10-09T11:59:40Z", now)).toBe("nå nettopp");
    expect(formatRelative("2026-10-09T11:55:00Z", now)).toBe("for 5 minutter siden");
    expect(formatRelative("2026-10-09T09:00:00Z", now)).toBe("for 3 timer siden");
    expect(plain(formatRelative("2026-10-08T12:30:00Z", now))).toBe("i går kl. 14.30");
    expect(plain(formatRelative("2026-10-05T07:15:00Z", now))).toBe("mandag kl. 09.15");
    expect(formatRelative("2026-09-20T10:00:00Z", now)).toBe("20. sep.");
  });

  it("ISO week numbers, Monday first", () => {
    expect(weekNumber("2026-10-09")).toBe(41);
    expect(weekNumber("2026-10-12")).toBe(42); // Monday starts a new week
    expect(weekNumber("2026-10-11")).toBe(41); // Sunday still belongs to the week before
    expect(weekNumber("2027-01-01")).toBe(53); // Friday 1 Jan 2027 belongs to week 53 of 2026
    expect(weekNumber("2026-01-01")).toBe(1);
    expect(formatWeek("2026-10-15")).toBe("uke 42");
  });
});

describe("numbers and money", () => {
  it("numbers use a decimal comma and a space for thousands", () => {
    expect(plain(formatNumber(12500))).toBe("12 500");
    expect(formatNumber(2.5)).toBe("2,5");
  });

  it("money from øre", () => {
    expect(plain(formatOre(149000))).toBe("1 490 kr");
    expect(plain(formatOre(149050))).toBe("1 490,5 kr");
    expect(() => formatOre(1.5)).toThrow(TypeError);
    expect(kronerToOre(19.99)).toBe(1999);
  });

  it("durations and hours", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(90)).toBe("1 t 30 min");
    expect(plain(formatHours(150))).toBe("2,5 timer");
    expect(plain(formatHours(60))).toBe("1 time");
  });
});

describe("phone numbers", () => {
  it.each(["41234567", "412 34 567", "+47 412 34 567", "+4741234567", "0047 41234567", "(+47) 412-34-567"])("accepts %s", (input) => {
    expect(parsePhone(input)).toBe("+4741234567");
  });

  it("formats mobile and landline numbers", () => {
    expect(formatPhone("41234567")).toBe("412 34 567");
    expect(formatPhone("41234567", true)).toBe("+47 412 34 567");
    expect(formatPhone("22123456")).toBe("22 12 34 56");
  });

  it("keeps foreign numbers and rejects nonsense", () => {
    expect(parsePhone("+46 70 123 45 67")).toBe("+46701234567");
    expect(parsePhone("1234")).toBeNull();
    expect(formatPhone("ring meg")).toBe("ring meg");
  });

  it("makes tel: links", () => {
    expect(telHref("412 34 567")).toBe("tel:+4741234567");
    expect(telHref("ukjent")).toBeNull();
  });
});

describe("organisation numbers", () => {
  it.each(["923609016", "974760673", "923 609 016"])("accepts the valid number %s", (n) => {
    expect(isValidOrgNumber(n)).toBe(true);
  });

  it.each(["923609017", "12345678", "1234567890", "abcdefghi", ""])("rejects %j", (n) => {
    expect(isValidOrgNumber(n)).toBe(false);
  });

  it("formats in groups of three", () => {
    expect(formatOrgNumber("923609016")).toBe("923 609 016");
  });
});

describe("postnummer and sorting", () => {
  it("validates postnummer as four digits", () => {
    expect(isValidPostnummer("0150")).toBe(true);
    expect(isValidPostnummer("150")).toBe(false);
    expect(isValidPostnummer("01500")).toBe(false);
  });

  it("sorts Æ, Ø and Å after Z", () => {
    expect(["Åsane", "Ørsta", "Zeta", "Ærø", "Bergen"].sort(compareNb)).toEqual(["Bergen", "Zeta", "Ærø", "Ørsta", "Åsane"]);
  });
});
