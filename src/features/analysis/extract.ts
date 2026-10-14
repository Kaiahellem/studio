import * as cheerio from "cheerio";

// Turns one HTML page into the facts the analysis needs (docs/PLAN-ANALYSIS.md §2, step 2).
// Pure: no network, so it can be tested on fixture HTML.

export type Heading = { level: number; text: string };
export type Image = { src: string; alt: string | null };
export type Cta = { text: string; href: string | null };
export type Contacts = {
  phones: string[]; // tel: links
  unlinkedPhones: string[]; // phone numbers in the text that are not tel: links
  emails: string[]; // mailto: links
  forms: number; // forms that are not search forms
  bookingLinks: string[];
};

export type PageFacts = {
  title: string | null;
  metaDescription: string | null;
  lang: string | null;
  headings: Heading[];
  mainText: string;
  images: Image[];
  ctas: Cta[];
  contacts: Contacts;
  hasViewport: boolean;
  ogImage: string | null;
  hasLocalBusiness: boolean;
  internalLinks: string[];
};

const MAX_TEXT = 12_000;
const MAX_IMAGES = 40;
const MAX_CTAS = 20;
const SKIP_EXTENSIONS = /\.(pdf|jpe?g|png|gif|webp|svg|avif|zip|docx?|xlsx?|pptx?|mp4|mov|mp3|ics)$/i;
const BOOKING = /(book|bestill|timebestilling|calendly|timely|simplybook|easyweek|fixit|onlinebooq)/i;
const CTA_WORDS = /^(kontakt|ring|bestill|book|få tilbud|be om tilbud|send|ta kontakt|start|kom i gang|les mer|se|kjøp|meld)/i;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function sameSite(a: URL, b: URL) {
  return a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
}

// Canonical form used for de-duplication: no hash, no trailing slash except the root.
export function normaliseUrl(url: URL): string {
  const u = new URL(url.toString());
  u.hash = "";
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}

// Norwegian numbers: eight digits, optionally after +47 or 0047, with spaces or dots.
const PHONE = /(?<![\d+])(?:\+47|0047)?[\s.]?(?:\d[\s.]?){7}\d(?![\d])/g;
function phoneDigits(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^(0047|47)(?=\d{8}$)/, "");
  return d.length === 8 && /^[2-9]/.test(d) ? d : null;
}

export function extractPage(html: string, pageUrl: string): PageFacts {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const abs = (href: string | undefined) => {
    if (!href) return null;
    try {
      return new URL(href, base);
    } catch {
      return null;
    }
  };

  const title = clean($("head > title").first().text()) || null;
  const metaDescription = clean($('meta[name="description" i]').attr("content") ?? "") || null;
  const lang = $("html").attr("lang") ?? null;
  const hasViewport = $('meta[name="viewport" i]').length > 0;
  const ogImage = $('meta[property="og:image" i]').attr("content") ?? null;
  const hasLocalBusiness = $('script[type="application/ld+json"]')
    .toArray()
    .some((el) => /"@type"\s*:\s*"[^"]*(LocalBusiness|Organization|ProfessionalService|HomeAndConstructionBusiness|Plumber|Electrician|HairSalon|BeautySalon|Dentist|Restaurant)/i.test($(el).text()));

  const telLinks = new Set<string>();
  const emails = new Set<string>();
  const bookingLinks = new Set<string>();
  const internal = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!.trim();
    if (/^tel:/i.test(href)) {
      const d = phoneDigits(decodeURIComponent(href.slice(4)));
      if (d) telLinks.add(d);
      return;
    }
    if (/^mailto:/i.test(href)) {
      emails.add(decodeURIComponent(href.slice(7)).split("?")[0].toLowerCase());
      return;
    }
    const url = abs(href);
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return;
    if (BOOKING.test(url.hostname) || BOOKING.test(url.pathname)) bookingLinks.add(normaliseUrl(url));
    if (sameSite(url, base) && !SKIP_EXTENSIONS.test(url.pathname)) internal.add(normaliseUrl(url));
  });

  const forms = $("form")
    .toArray()
    .filter((el) => !/search|søk/i.test(`${$(el).attr("role") ?? ""} ${$(el).attr("action") ?? ""} ${$(el).find("input").attr("type") ?? ""}`)).length;

  // CTAs: button-looking links and buttons, plus links whose text reads like a call to action.
  const ctas: Cta[] = [];
  const seenCta = new Set<string>();
  $('a[href], button, [role="button"]').each((_, el) => {
    if (ctas.length >= MAX_CTAS) return;
    const node = $(el);
    const text = clean(node.text()) || clean(node.attr("aria-label") ?? "");
    if (!text || text.length > 60) return;
    const cls = node.attr("class") ?? "";
    const looksLikeButton = el.tagName === "button" || node.attr("role") === "button" || /btn|button|cta/i.test(cls);
    if (!looksLikeButton && !CTA_WORDS.test(text)) return;
    if (node.closest("form").length && el.tagName === "button" && /søk|search/i.test(text)) return;
    const href = el.tagName === "a" ? (node.attr("href") ?? null) : null;
    const key = `${text}|${href}`;
    if (seenCta.has(key)) return;
    seenCta.add(key);
    ctas.push({ text, href: href && abs(href) ? abs(href)!.toString() : href });
  });

  const images: Image[] = [];
  $("img").each((_, el) => {
    if (images.length >= MAX_IMAGES) return;
    const node = $(el);
    const src = node.attr("src") ?? node.attr("data-src") ?? node.attr("srcset")?.split(/\s+/)[0];
    const url = abs(src);
    if (!url || url.protocol === "data:") return;
    const alt = node.attr("alt");
    images.push({ src: url.toString(), alt: alt === undefined ? null : clean(alt) });
  });

  const headings: Heading[] = $("h1, h2, h3, h4")
    .toArray()
    .map((el) => ({ level: Number(el.tagName.slice(1)), text: clean($(el).text()) }))
    .filter((h) => h.text)
    .slice(0, 60);

  // Main text: <main> or <article> if present, otherwise the body without the chrome.
  const content = $("main").length ? $("main").first() : $("article").length ? $("article").first() : $("body");
  const copy = content.clone();
  copy.find("script, style, noscript, template, svg, iframe, nav, header, footer, form").remove();
  if (!$("main").length) copy.find('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  // Block elements become line breaks so headings and paragraphs don't run together.
  copy.find("h1, h2, h3, h4, h5, h6, p, li, br, div, section, tr").each((_, el) => {
    $(el).append("\n");
  });
  const mainText = copy
    .text()
    .split("\n")
    .map(clean)
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_TEXT);

  const bodyText = $("body").text();
  const unlinkedPhones = [...new Set((bodyText.match(PHONE) ?? []).map(phoneDigits).filter((d): d is string => !!d))].filter((d) => !telLinks.has(d));

  return {
    title,
    metaDescription,
    lang,
    headings,
    mainText,
    images,
    ctas,
    contacts: { phones: [...telLinks], unlinkedPhones, emails: [...emails], forms, bookingLinks: [...bookingLinks].slice(0, 10) },
    hasViewport,
    ogImage,
    hasLocalBusiness,
    internalLinks: [...internal],
  };
}
