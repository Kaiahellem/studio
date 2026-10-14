import "server-only";
import type { Json } from "@/lib/db/types";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TechnicalReport } from "./bundle";
import { checkSite } from "./checks";
import { crawlSite, type Fetcher } from "./crawl";
import { FetchRefused, isPublicAddress, safeFetch } from "./net";
import { pickPageSpeedPages, runPageSpeed, type PageSpeedReport } from "./pagespeed";

// One run: crawl → checks → wait for the answer (manual mode). Runs after the response with the
// service client, because the admin's session isn't available there; every caller has already
// checked for admin (docs/PLAN-ANALYSIS.md §2).

// Structured values go into jsonb columns as they are.
const json = (value: unknown) => value as NonNullable<Json>;

export const WORKING = ["queued", "crawling", "checking", "analysing"] as const;
export const STALE_AFTER_MS = 10 * 60 * 1000;

export type RunError = "start_failed" | "refused" | "robots" | "no_pages" | "timeout" | "unknown";

// Fakes are for E2E only, and only ever when the app itself runs on localhost.
export function fakesEnabled() {
  const host = new URL(publicEnv.NEXT_PUBLIC_SITE_URL).hostname;
  return serverEnv().ANALYSIS_FAKES === "1" && (host === "localhost" || host === "127.0.0.1");
}

const userAgent = () => `PortalBot/1.0 (+${new URL("/bot", publicEnv.NEXT_PUBLIC_SITE_URL)})`;

function fetcher(): Fetcher {
  const fakes = fakesEnabled();
  return (url) =>
    safeFetch(url, {
      userAgent: userAgent(),
      ...(fakes ? { allowAddress: (ip: string) => ip === "127.0.0.1" || isPublicAddress(ip), allowAnyPort: true } : {}),
    });
}

function fakePageSpeed(url: string): PageSpeedReport {
  return {
    url,
    scores: { performance: 48, accessibility: 82, seo: 91, bestPractices: 100 },
    metrics: { lcp: "5,8 s", cls: "0,02", tbt: "310 ms", fcp: "2,9 s" },
    issues: [{ id: "largest-contentful-paint", title: "Største innholdsrike opptegning", displayValue: "5,8 s" }],
  };
}

export async function runAnalysis(runId: string) {
  const db = createAdminClient();
  const setStatus = (status: string, extra: Record<string, unknown> = {}) =>
    db.from("analysis_runs").update({ status, status_changed_at: new Date().toISOString(), ...extra }).eq("id", runId);
  const fail = (error: RunError) => setStatus("failed", { error, finished_at: new Date().toISOString() });

  try {
    const run = await db.from("analysis_runs").select("id, page_limit, site_analyses(url)").eq("id", runId).single();
    if (run.error || !run.data.site_analyses) return;

    await setStatus("crawling");
    let crawl;
    try {
      crawl = await crawlSite({
        startUrl: run.data.site_analyses.url,
        pageLimit: run.data.page_limit,
        fetcher: fetcher(),
        delayMs: fakesEnabled() ? 0 : 300,
        onPage: async (count) => {
          await db.from("analysis_runs").update({ pages_read: count }).eq("id", runId);
        },
      });
    } catch (error) {
      return await fail(error instanceof FetchRefused ? "refused" : "start_failed");
    }
    if (crawl.pages.length === 0) return await fail(crawl.robotsDisallowAll || crawl.skipped.some((s) => s.reason === "robots") ? "robots" : "no_pages");

    const pageRows = crawl.pages.map((p, position) => ({
      run_id: runId,
      position,
      url: p.url,
      status_code: p.status,
      title: p.facts.title,
      meta_description: p.facts.metaDescription,
      headings: json(p.facts.headings),
      main_text: p.facts.mainText,
      images: json(p.facts.images),
      ctas: json(p.facts.ctas),
      contacts: json(p.facts.contacts),
    }));
    const inserted = await db.from("analysis_pages").insert(pageRows);
    if (inserted.error) throw inserted.error;

    await setStatus("checking", { pages_read: crawl.pages.length });
    const checks = checkSite({
      startUrl: crawl.startUrl,
      usesHttps: crawl.usesHttps,
      httpRedirectsToHttps: crawl.httpRedirectsToHttps,
      pages: crawl.pages.map((p) => ({ url: p.url, facts: p.facts })),
    });

    const targets = pickPageSpeedPages(crawl.pages.map((p) => ({ url: p.url, internalLinks: p.facts.internalLinks })));
    const key = serverEnv().PAGESPEED_API_KEY;
    const speed = await Promise.allSettled(targets.map((url) => (fakesEnabled() ? Promise.resolve(fakePageSpeed(url)) : runPageSpeed(url, key))));
    const pagespeed = speed.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (speed.some((r) => r.status === "rejected")) console.error("PageSpeed failed for", runId, speed.filter((r) => r.status === "rejected"));

    const technical: TechnicalReport = {
      startUrl: crawl.startUrl,
      usesHttps: crawl.usesHttps,
      httpRedirectsToHttps: crawl.httpRedirectsToHttps,
      robotsDisallowAll: crawl.robotsDisallowAll,
      skipped: crawl.skipped,
      site: checks.site,
      pages: checks.pages,
      pagespeed,
      pagespeedFailed: pagespeed.length < targets.length,
    };

    // Manual mode: the run now waits for the answer pasted from Claude.
    await setStatus("awaiting_result", { technical: json(technical) });
  } catch (error) {
    console.error("analysis run failed:", runId, error);
    await fail("unknown");
  }
}
