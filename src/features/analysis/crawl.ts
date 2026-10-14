import { extractPage, normaliseUrl, sameSite, type PageFacts } from "./extract";
import { FetchRefused, type FetchedPage } from "./net";
import { parseRobots } from "./robots";

// Reads a site breadth-first from the start page: same site only, robots.txt respected, one
// request at a time with a pause, up to the page limit (docs/PLAN-ANALYSIS.md §2, step 1).

export type Fetcher = (url: string) => Promise<FetchedPage>;

export type CrawledPage = { url: string; status: number; facts: PageFacts };
export type SkipReason = "robots" | "not_html" | "error" | "off_site" | "refused";
export type CrawlResult = {
  startUrl: string; // after redirects, e.g. http → https, bare → www
  pages: CrawledPage[];
  skipped: { url: string; reason: SkipReason }[];
  robotsDisallowAll: boolean;
  usesHttps: boolean;
  httpRedirectsToHttps: boolean | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function crawlSite({
  startUrl,
  pageLimit,
  fetcher,
  delayMs = 300,
  onPage,
}: {
  startUrl: string;
  pageLimit: number;
  fetcher: Fetcher;
  delayMs?: number;
  onPage?: (count: number) => Promise<void> | void;
}): Promise<CrawlResult> {
  const skipped: CrawlResult["skipped"] = [];
  const pages: CrawledPage[] = [];

  // The front page first: it decides the canonical origin (http → https, www or not).
  const first = await fetcher(normaliseUrl(new URL(startUrl)));
  const origin = new URL(first.url);

  const robotsUrl = new URL("/robots.txt", origin).toString();
  let robotsBody: string | null = null;
  let robotsDisallowAll = false;
  try {
    const robots = await fetcher(robotsUrl);
    // RFC 9309: 4xx means no rules; 5xx means assume everything is disallowed.
    if (robots.status >= 500) robotsDisallowAll = true;
    else if (robots.status < 300) robotsBody = robots.body;
  } catch (error) {
    if (error instanceof FetchRefused) throw error;
  }
  const robots = robotsDisallowAll ? null : parseRobots(robotsUrl, robotsBody);
  const pause = Math.max(delayMs, robots?.crawlDelayMs ?? 0);

  const queue: string[] = [normaliseUrl(origin)];
  const seen = new Set(queue);
  let prefetched: FetchedPage | null = first;

  while (queue.length > 0 && pages.length < pageLimit) {
    const url = queue.shift()!;
    if (!robots || !robots.allowed(url)) {
      skipped.push({ url, reason: "robots" });
      prefetched = null;
      continue;
    }

    let page: FetchedPage;
    try {
      if (prefetched) {
        page = prefetched;
        prefetched = null;
      } else {
        await sleep(pause);
        page = await fetcher(url);
      }
    } catch (error) {
      skipped.push({ url, reason: error instanceof FetchRefused ? "refused" : "error" });
      continue;
    }

    const finalUrl = new URL(page.url);
    if (!sameSite(finalUrl, origin)) {
      skipped.push({ url, reason: "off_site" });
      continue;
    }
    if (page.status >= 400) {
      skipped.push({ url, reason: "error" });
      continue;
    }
    if (!/html/i.test(page.contentType)) {
      skipped.push({ url, reason: "not_html" });
      continue;
    }

    const facts = extractPage(page.body, page.url);
    pages.push({ url: normaliseUrl(finalUrl), status: page.status, facts });
    await onPage?.(pages.length);

    for (const link of facts.internalLinks) {
      const key = normaliseUrl(new URL(link));
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(key);
      }
    }
  }

  const usesHttps = origin.protocol === "https:";
  let httpRedirectsToHttps: boolean | null = null;
  if (usesHttps) {
    try {
      const plain = new URL(origin);
      plain.protocol = "http:";
      httpRedirectsToHttps = new URL((await fetcher(plain.toString())).url).protocol === "https:";
    } catch {
      httpRedirectsToHttps = null;
    }
  }

  return { startUrl: normaliseUrl(origin), pages, skipped, robotsDisallowAll, usesHttps, httpRedirectsToHttps };
}
