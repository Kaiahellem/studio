import { describe, expect, it } from "vitest";
import { formatBytes, safeFileName } from "@/lib/format/file";

const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [819_200, "800 kB"],
    [13_107_200, "12,5 MB"],
    [52_428_800, "50 MB"],
  ])("%i → %s", (bytes, expected) => {
    expect(plain(formatBytes(bytes))).toBe(expected);
  });
});

describe("safeFileName", () => {
  it.each([
    ["Logo Fjordlys Rør.SVG", "logo-fjordlys-ror.svg"],
    ["Bilde av båten (1).jpeg", "bilde-av-baten-1.jpeg"],
    ["../../etc/passwd", "passwd"],
    ["C:\\fakepath\\Tekst.docx", "tekst.docx"],
    [".env", "env"],
    ["Ærlig talt.docx", "aerlig-talt.docx"],
    ["???.pdf", "fil.pdf"],
  ])("%s → %s", (input, expected) => {
    expect(safeFileName(input)).toBe(expected);
  });
});
