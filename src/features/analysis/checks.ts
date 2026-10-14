import type { PageFacts } from "./extract";

// Our own checks on the facts we extracted (docs/PLAN-ANALYSIS.md §2, step 3). Codes, not text:
// the labels live in the dictionary, and the bundle spells them out for the AI.

export type PageIssueCode =
  | "no_title"
  | "title_length"
  | "no_meta_description"
  | "meta_length"
  | "no_h1"
  | "many_h1"
  | "heading_skip"
  | "images_without_alt"
  | "unlinked_phone"
  | "no_viewport";

export type SiteIssueCode =
  | "no_https"
  | "no_http_redirect"
  | "no_og_image"
  | "no_structured_data"
  | "no_contact_on_front"
  | "duplicate_titles";

export type Issue<C extends string> = { code: C; count?: number };

export type PageCheck = { url: string; issues: Issue<PageIssueCode>[] };

export type SiteFacts = {
  startUrl: string;
  usesHttps: boolean;
  // null when we could not test it (the site is http only, or the request failed).
  httpRedirectsToHttps: boolean | null;
  pages: { url: string; facts: PageFacts }[];
};

export function checkPage(f: PageFacts): Issue<PageIssueCode>[] {
  const issues: Issue<PageIssueCode>[] = [];
  if (!f.title) issues.push({ code: "no_title" });
  else if (f.title.length < 15 || f.title.length > 65) issues.push({ code: "title_length", count: f.title.length });
  if (!f.metaDescription) issues.push({ code: "no_meta_description" });
  else if (f.metaDescription.length < 70 || f.metaDescription.length > 160) issues.push({ code: "meta_length", count: f.metaDescription.length });

  const h1 = f.headings.filter((h) => h.level === 1).length;
  if (h1 === 0) issues.push({ code: "no_h1" });
  if (h1 > 1) issues.push({ code: "many_h1", count: h1 });
  if (f.headings.some((h, i) => i > 0 && h.level > f.headings[i - 1].level + 1)) issues.push({ code: "heading_skip" });

  const noAlt = f.images.filter((img) => img.alt === null).length;
  if (noAlt > 0) issues.push({ code: "images_without_alt", count: noAlt });
  if (f.contacts.unlinkedPhones.length > 0) issues.push({ code: "unlinked_phone", count: f.contacts.unlinkedPhones.length });
  if (!f.hasViewport) issues.push({ code: "no_viewport" });
  return issues;
}

export function checkSite(site: SiteFacts): { site: Issue<SiteIssueCode>[]; pages: PageCheck[] } {
  const issues: Issue<SiteIssueCode>[] = [];
  if (!site.usesHttps) issues.push({ code: "no_https" });
  else if (site.httpRedirectsToHttps === false) issues.push({ code: "no_http_redirect" });

  const front = site.pages[0]?.facts;
  if (front) {
    if (!front.ogImage) issues.push({ code: "no_og_image" });
    const c = front.contacts;
    if (c.phones.length + c.emails.length + c.forms + c.bookingLinks.length === 0) issues.push({ code: "no_contact_on_front" });
  }
  if (site.pages.length > 0 && !site.pages.some((p) => p.facts.hasLocalBusiness)) issues.push({ code: "no_structured_data" });

  const titles = site.pages.map((p) => p.facts.title).filter((t): t is string => !!t);
  const duplicates = titles.length - new Set(titles).size;
  if (duplicates > 0) issues.push({ code: "duplicate_titles", count: duplicates + 1 });

  return { site: issues, pages: site.pages.map((p) => ({ url: p.url, issues: checkPage(p.facts) })) };
}
