import { z } from "zod";

// Google PageSpeed Insights, mobile strategy (docs/PLAN-ANALYSIS.md §3.3). Only the page URL is
// sent. Renders JavaScript, so it also covers sites our own crawler reads poorly.

export type PageSpeedReport = {
  url: string;
  scores: { performance: number | null; accessibility: number | null; seo: number | null; bestPractices: number | null };
  metrics: { lcp: string | null; cls: string | null; tbt: string | null; fcp: string | null };
  issues: { id: string; title: string; displayValue: string | null }[];
};

const audit = z.object({
  title: z.string(),
  score: z.number().nullable().optional(),
  scoreDisplayMode: z.string().optional(),
  displayValue: z.string().optional(),
});
const category = z.object({ score: z.number().nullable(), auditRefs: z.array(z.object({ id: z.string(), weight: z.number() })) });
const response = z.object({
  lighthouseResult: z.object({
    finalUrl: z.string().optional(),
    categories: z.object({
      performance: category.optional(),
      accessibility: category.optional(),
      seo: category.optional(),
      "best-practices": category.optional(),
    }),
    audits: z.record(z.string(), audit),
  }),
});

const toPercent = (score: number | null | undefined) => (typeof score === "number" ? Math.round(score * 100) : null);

// Reduces the large Lighthouse result to scores, the four core metrics and the failing audits
// that weigh most. Pure, so it is tested on a fixture.
export function summarisePageSpeed(url: string, json: unknown): PageSpeedReport {
  const { lighthouseResult: lh } = response.parse(json);
  const c = lh.categories;
  const weight = new Map<string, number>();
  for (const cat of [c.performance, c.accessibility, c.seo, c["best-practices"]]) {
    for (const ref of cat?.auditRefs ?? []) weight.set(ref.id, Math.max(weight.get(ref.id) ?? 0, ref.weight));
  }
  const metric = (id: string) => lh.audits[id]?.displayValue ?? null;
  const issues = Object.entries(lh.audits)
    .filter(([, a]) => typeof a.score === "number" && a.score < 0.9 && !["notApplicable", "informative", "manual"].includes(a.scoreDisplayMode ?? ""))
    .sort(([a, x], [b, y]) => (weight.get(b) ?? 0) - (weight.get(a) ?? 0) || (x.score ?? 0) - (y.score ?? 0))
    .slice(0, 8)
    .map(([id, a]) => ({ id, title: a.title, displayValue: a.displayValue ?? null }));

  return {
    url: lh.finalUrl ?? url,
    scores: {
      performance: toPercent(c.performance?.score),
      accessibility: toPercent(c.accessibility?.score),
      seo: toPercent(c.seo?.score),
      bestPractices: toPercent(c["best-practices"]?.score),
    },
    metrics: {
      lcp: metric("largest-contentful-paint"),
      cls: metric("cumulative-layout-shift"),
      tbt: metric("total-blocking-time"),
      fcp: metric("first-contentful-paint"),
    },
    issues,
  };
}

export async function runPageSpeed(url: string, apiKey: string | undefined): Promise<PageSpeedReport> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "MOBILE");
  endpoint.searchParams.set("locale", "nb");
  for (const cat of ["PERFORMANCE", "ACCESSIBILITY", "SEO", "BEST_PRACTICES"]) endpoint.searchParams.append("category", cat);
  if (apiKey) endpoint.searchParams.set("key", apiKey);

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`PageSpeed ${res.status}`);
  return summarisePageSpeed(url, await res.json());
}

// Picks up to three pages for PSI: the front page, a contact page, and the most linked-to other page.
export function pickPageSpeedPages(pages: { url: string; internalLinks: string[] }[]): string[] {
  if (pages.length === 0) return [];
  const [front, ...rest] = pages;
  const contact = rest.find((p) => /kontakt|contact/i.test(new URL(p.url).pathname));
  const counts = new Map<string, number>();
  for (const p of pages) for (const link of p.internalLinks) counts.set(link, (counts.get(link) ?? 0) + 1);
  const popular = rest
    .filter((p) => p !== contact)
    .sort((a, b) => (counts.get(b.url) ?? 0) - (counts.get(a.url) ?? 0))[0];
  return [front, contact, popular].filter((p): p is (typeof pages)[number] => !!p).map((p) => p.url);
}
