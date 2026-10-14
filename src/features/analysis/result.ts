import { z } from "zod";
import { normaliseUrl } from "./extract";

// The answer format, shared by manual (pasted) and automatic runs (docs/PLAN-ANALYSIS.md §4).

const text = (max: number) => z.string().trim().min(1).max(max);

export const findingSchema = z.object({
  title: text(200),
  clientSaid: z.string().trim().max(1000).nullable(),
  siteToday: text(2000),
  recommendation: text(2000),
  impact: z.enum(["high", "medium", "low"]),
  sourceUrls: z.array(z.string()).min(1).max(10),
});

export const keepSchema = z.object({
  kind: z.enum(["text", "image"]),
  description: text(500),
  excerpt: z.string().trim().max(2000).optional(),
  sourceUrl: z.string(),
});

export const resultSchema = z.object({
  summary: text(2000),
  findings: z.array(findingSchema).max(20),
  keep: z.array(keepSchema).max(30),
  limitations: z.array(text(500)).max(10),
});

export type AnalysisResult = z.infer<typeof resultSchema>;
export type Finding = z.infer<typeof findingSchema>;

export const MAX_PASTE_CHARS = 500_000;

// The skeleton shown to the AI. Kept next to the schema so the two never drift apart.
export const resultExample = `{
  "summary": "2–3 setninger.",
  "findings": [
    {
      "title": "Kort tittel",
      "clientSaid": "Det bedriften sa, eller null",
      "siteToday": "Det siden gjør i dag, konkret",
      "recommendation": "Det frilanseren bør gjøre",
      "impact": "high | medium | low",
      "sourceUrls": ["https://…"]
    }
  ],
  "keep": [
    { "kind": "text | image", "description": "Hva og hvorfor", "excerpt": "Valgfritt utdrag", "sourceUrl": "https://…" }
  ],
  "limitations": ["Det du ikke kunne vurdere"]
}`;

export type ParseError =
  | { code: "empty" | "tooLong" | "no_json" | "invalid_json" }
  | { code: "schema"; issues: string[] };

// Finds the JSON in a pasted answer: a ```json block if there is one, otherwise the outermost
// braces. Text around it is fine.
export function extractJson(answer: string): { ok: true; value: unknown } | { ok: false; error: ParseError } {
  const trimmed = answer.trim();
  if (!trimmed) return { ok: false, error: { code: "empty" } };
  if (trimmed.length > MAX_PASTE_CHARS) return { ok: false, error: { code: "tooLong" } };

  const fenced = [...trimmed.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/gi)].map((m) => m[1]).find((block) => block.trim().startsWith("{"));
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidate = fenced ?? (start >= 0 && end > start ? trimmed.slice(start, end + 1) : null);
  if (!candidate) return { ok: false, error: { code: "no_json" } };
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    return { ok: false, error: { code: "invalid_json" } };
  }
}

const canonical = (url: string) => {
  try {
    return normaliseUrl(new URL(url));
  } catch {
    return null;
  }
};

// Validates the shape, then keeps only references to pages we actually read: a finding keeps the
// sources we know and is dropped if none are left; a "keep" item is dropped if its page is unknown.
export function validateResult(
  value: unknown,
  readUrls: string[],
): { ok: true; result: AnalysisResult; dropped: number } | { ok: false; error: ParseError } {
  const parsed = resultSchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(rot)"}: ${i.message}`);
    return { ok: false, error: { code: "schema", issues } };
  }
  const known = new Set(readUrls.map(canonical).filter(Boolean));
  let dropped = 0;

  const findings = parsed.data.findings.flatMap((f) => {
    const sourceUrls = f.sourceUrls.map(canonical).filter((u): u is string => !!u && known.has(u));
    if (sourceUrls.length === 0) {
      dropped++;
      return [];
    }
    return [{ ...f, sourceUrls }];
  });
  const keep = parsed.data.keep.flatMap((k) => {
    const sourceUrl = canonical(k.sourceUrl);
    if (!sourceUrl || !known.has(sourceUrl)) {
      dropped++;
      return [];
    }
    return [{ ...k, sourceUrl }];
  });

  const order = { high: 0, medium: 1, low: 2 } as const;
  findings.sort((a, b) => order[a.impact] - order[b.impact]);
  return { ok: true, result: { ...parsed.data, findings, keep }, dropped };
}

export function parsePastedAnswer(answer: string, readUrls: string[]) {
  const json = extractJson(answer);
  if (!json.ok) return json;
  return validateResult(json.value, readUrls);
}
