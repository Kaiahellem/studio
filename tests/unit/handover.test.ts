import { describe, expect, it } from "vitest";
import { inkOn, joinLines, parseColours, parseContacts, parseFonts, parseLinks, readContent } from "@/features/handover/content";

describe("handover content parsing", () => {
  it("reads colours in either format, and skips lines without a hex value", () => {
    expect(parseColours("Mørk grønn | #2c4a3e\nPapir #F7F5F0\nbare tekst\n#000000")).toEqual([
      { name: "Mørk grønn", hex: "#2C4A3E" },
      { name: "Papir", hex: "#F7F5F0" },
      { name: "#000000", hex: "#000000" },
    ]);
  });

  it("reads links and drops unsafe ones", () => {
    expect(parseLinks("Sanity | https://fjordlys.sanity.studio\nOnde | javascript:alert(1)\n| https://x.no")).toEqual([
      { label: "Sanity", url: "https://fjordlys.sanity.studio" },
      { label: "https://x.no", url: "https://x.no" },
    ]);
  });

  it("reads fonts with url and usage in any order", () => {
    expect(parseFonts("Newsreader | https://fonts.google.com/specimen/Newsreader | Overskrifter\nInter | Brødtekst")).toEqual([
      { name: "Newsreader", url: "https://fonts.google.com/specimen/Newsreader", usage: "Overskrifter" },
      { name: "Inter", usage: "Brødtekst" },
    ]);
  });

  it("reads contacts and writes them back", () => {
    const contacts = parseContacts("Kari | Daglig leder | 400 00 000\nOla");
    expect(contacts).toEqual([{ name: "Kari", role: "Daglig leder", contact: "400 00 000" }, { name: "Ola" }]);
    expect(joinLines(contacts.map((c) => [c.name, c.role, c.contact]))).toBe("Kari | Daglig leder | 400 00 000\nOla");
  });

  it("falls back to empty content when stored JSON is invalid", () => {
    expect(readContent("colours", { colours: [{ name: "x", hex: "red" }] })).toEqual({ colours: [] });
    expect(readContent("logos", null)).toEqual({ file_ids: [] });
  });

  it("picks a readable label colour", () => {
    expect(inkOn("#2C4A3E")).toBe("#ffffff");
    expect(inkOn("#F7F5F0")).toBe("#000000");
  });
});
