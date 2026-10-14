import { t } from "@/i18n/nb";
import type { Issue, PageCheck, PageIssueCode, SiteIssueCode } from "./checks";
import type { Contacts, Cta, Heading, Image } from "./extract";
import type { SkipReason } from "./crawl";
import type { PageSpeedReport } from "./pagespeed";
import { resultExample } from "./result";

// The bundle: everything the AI needs in one Markdown text, used as the prompt in automatic mode
// and copied or downloaded in manual mode (docs/PLAN-ANALYSIS.md §2.1).

const b = t.studio.analysis.bundle;
const issueText = t.studio.analysis.technical.issues;
const metricText = t.studio.analysis.technical.metrics;
const scoreText = t.studio.analysis.technical.scores;

export type TechnicalReport = {
  startUrl: string;
  usesHttps: boolean;
  httpRedirectsToHttps: boolean | null;
  robotsDisallowAll: boolean;
  skipped: { url: string; reason: SkipReason }[];
  site: Issue<SiteIssueCode>[];
  pages: PageCheck[];
  pagespeed: PageSpeedReport[];
  pagespeedFailed: boolean;
};

export type BundlePage = {
  url: string;
  title: string | null;
  meta_description: string | null;
  headings: Heading[];
  main_text: string | null;
  images: Image[];
  ctas: Cta[];
  contacts: Contacts;
};

export type BundleInput = {
  instructions: string;
  businessName: string;
  url: string;
  statedProblems: string | null;
  goals: string | null;
  technical: TechnicalReport;
  pages: BundlePage[];
};

export function describeIssue(issue: Issue<PageIssueCode | SiteIssueCode>): string {
  const label = issueText[issue.code];
  return typeof label === "function" ? label(issue.count ?? 0) : label;
}

// Keeps page text from closing our delimiter early.
const fence = (s: string) => s.replaceAll("</side>", "</ side>");

function page(p: BundlePage, i: number) {
  const lines = [`<side nr="${i + 1}" url="${p.url}">`];
  lines.push(`Tittel: ${p.title ?? "–"}`);
  lines.push(`Metabeskrivelse: ${p.meta_description ?? "–"}`);
  if (p.headings.length) lines.push("Overskrifter:", ...p.headings.map((h) => `${"  ".repeat(h.level - 1)}- h${h.level}: ${h.text}`));
  const c = p.contacts;
  lines.push(
    `Kontakt: telefonlenker ${c.phones.join(", ") || "ingen"}; telefonnumre uten lenke ${c.unlinkedPhones.join(", ") || "ingen"}; ` +
      `e-post ${c.emails.join(", ") || "ingen"}; skjemaer ${c.forms}; booking ${c.bookingLinks.join(", ") || "ingen"}`,
  );
  if (p.ctas.length) lines.push(`Knapper og handlingslenker: ${p.ctas.map((a) => `«${a.text}»${a.href ? ` (${a.href})` : ""}`).join("; ")}`);
  if (p.images.length) {
    lines.push(`Bilder (${p.images.length}):`, ...p.images.slice(0, 15).map((img) => `- ${img.src} — alt: ${img.alt === null ? "mangler" : img.alt ? `«${img.alt}»` : "tom (pynt)"}`));
  }
  lines.push("Tekst:", p.main_text?.trim() || "(ingen tekst funnet, siden krever kanskje JavaScript)");
  lines.push("</side>");
  return fence(lines.join("\n")).replace(/<\/ side>$/, "</side>");
}

function technical(r: TechnicalReport) {
  const out = [`## ${b.technical}`, "", `### ${b.siteIssues}`];
  out.push(...(r.site.length ? r.site.map((i) => `- ${describeIssue(i)}`) : ["- Ingen funn."]));
  out.push("", `### ${b.pageIssues}`);
  for (const pc of r.pages) out.push(`- ${pc.url}: ${pc.issues.length ? pc.issues.map(describeIssue).join("; ") : "ingen funn"}`);
  out.push("", `### ${b.pagespeed}`);
  if (r.pagespeed.length === 0) out.push(b.pagespeedMissing);
  for (const ps of r.pagespeed) {
    const scores = (Object.keys(scoreText) as (keyof typeof scoreText)[]).map((k) => `${scoreText[k]} ${ps.scores[k] ?? "–"}`).join(", ");
    const metrics = (Object.keys(metricText) as (keyof typeof metricText)[]).map((k) => `${metricText[k]} ${ps.metrics[k] ?? "–"}`).join(", ");
    out.push(`- ${ps.url}: ${scores}. ${metrics}.`);
    for (const issue of ps.issues) out.push(`  - ${issue.title}${issue.displayValue ? ` (${issue.displayValue})` : ""}`);
  }
  return out.join("\n");
}

export function buildBundle(input: BundleInput): string {
  const urls = input.pages.map((p) => p.url);
  const sections = [
    `# ${b.title(input.businessName)}`,
    `## ${b.instructions}\n\n${input.instructions.trim()}`,
    [
      `## ${b.business}`,
      "",
      `- ${b.name}: ${input.businessName}`,
      `- ${b.url}: ${input.url}`,
      `- ${b.problems}: ${input.statedProblems?.trim() || b.notGiven}`,
      `- ${b.goals}: ${input.goals?.trim() || b.notGiven}`,
    ].join("\n"),
    technical(input.technical),
    [`## ${b.pages}`, "", b.pagesNote, "", ...input.pages.map(page)].join("\n\n"),
  ];
  if (input.technical.skipped.length) {
    sections.push([`## ${b.skipped}`, "", ...input.technical.skipped.map((s) => `- ${s.url} (${t.studio.analysis.result.skipReason[s.reason]})`)].join("\n"));
  }
  sections.push(
    [`## ${b.format}`, "", b.formatIntro, "", "```json", resultExample, "```", "", b.allowedUrls, "", ...urls.map((u) => `- ${u}`)].join("\n"),
  );
  return sections.join("\n\n") + "\n";
}

// Rough token count for the size warning: Norwegian text runs at about 3.5 characters a token.
export function estimateTokens(bundle: string) {
  return Math.ceil(bundle.length / 3.5);
}

// Above this, a single paste into Claude is likely to be refused or truncated.
export const LARGE_BUNDLE_TOKENS = 120_000;
