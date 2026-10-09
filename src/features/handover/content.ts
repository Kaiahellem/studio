import { z } from "zod";

// Handover sections (BRIEF.md, "Handover page"). Each kind has its own content shape, stored
// as JSON in handover_sections.content. A future Brand Hub adds kinds, not tables.

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const httpUrl = z.string().regex(/^https?:\/\/\S+$/i);

export const sectionContent = {
  logos: z.object({ intro: z.string().max(2000).optional(), file_ids: z.array(z.uuid()).max(50).default([]) }),
  colours: z.object({ colours: z.array(z.object({ name: z.string().max(80), hex })).max(30).default([]) }),
  fonts: z.object({
    fonts: z.array(z.object({ name: z.string().max(80), url: httpUrl.optional(), usage: z.string().max(200).optional() })).max(10).default([]),
  }),
  website_guide: z.object({ text: z.string().max(10_000).default(""), links: z.array(z.object({ label: z.string().max(120), url: httpUrl })).max(20).default([]) }),
  domain_hosting: z.object({ note: z.string().max(2000).optional() }),
  links_contacts: z.object({
    links: z.array(z.object({ label: z.string().max(120), url: httpUrl })).max(30).default([]),
    contacts: z.array(z.object({ name: z.string().max(120), role: z.string().max(120).optional(), contact: z.string().max(200).optional() })).max(30).default([]),
  }),
  access_notes: z.object({ text: z.string().max(10_000).default("") }),
  custom: z.object({ text: z.string().max(10_000).default("") }),
} as const;

export type SectionKind = keyof typeof sectionContent;
export type SectionContent<K extends SectionKind> = z.infer<(typeof sectionContent)[K]>;

export const sectionKinds = Object.keys(sectionContent) as SectionKind[];

// Bad or old content never breaks the page; it just renders as empty.
export function readContent<K extends SectionKind>(kind: K, value: unknown): SectionContent<K> {
  const parsed = sectionContent[kind].safeParse(value ?? {});
  return (parsed.success ? parsed.data : sectionContent[kind].parse({})) as SectionContent<K>;
}

// The admin edits lists as lines of "part | part | part", which keeps the form simple.
export function splitLines(text: string): string[][] {
  return text
    .split("\n")
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter((parts) => parts.some((p) => p !== ""));
}

export function joinLines(rows: (string | undefined)[][]): string {
  return rows.map((r) => r.filter((p) => p !== undefined && p !== "").join(" | ")).join("\n");
}

// "Mørk grønn | #2c4a3e" or "Mørk grønn #2C4A3E"
export function parseColours(text: string) {
  return splitLines(text).flatMap((parts) => {
    const joined = parts.join(" ");
    const match = joined.match(/#[0-9a-f]{6}\b/i);
    if (!match) return [];
    const name = joined.replace(match[0], "").replace(/\s+/g, " ").trim();
    return [{ name: name || match[0].toUpperCase(), hex: match[0].toUpperCase() }];
  });
}

export function parseLinks(text: string) {
  return splitLines(text).flatMap(([label, url]) => (url && /^https?:\/\/\S+$/i.test(url) ? [{ label: label || url, url }] : []));
}

export function parseFonts(text: string) {
  return splitLines(text).map(([name, a, b]) => {
    const url = [a, b].find((p) => p && /^https?:\/\//i.test(p));
    const usage = [a, b].find((p) => p && p !== url);
    return { name: name ?? "", ...(url ? { url } : {}), ...(usage ? { usage } : {}) };
  });
}

export function parseContacts(text: string) {
  return splitLines(text).map(([name, role, contact]) => ({ name: name ?? "", ...(role ? { role } : {}), ...(contact ? { contact } : {}) }));
}

// Readable text colour for a swatch label.
export function inkOn(hexColour: string): "#000000" | "#ffffff" {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hexColour.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? "#000000" : "#ffffff";
}
