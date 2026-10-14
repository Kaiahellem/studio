import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pickPageSpeedPages, summarisePageSpeed } from "@/features/analysis/pagespeed";

const json = JSON.parse(readFileSync(new URL("./fixtures/analysis/pagespeed.json", import.meta.url), "utf8"));

describe("PageSpeed summary", () => {
  const report = summarisePageSpeed("https://fjordlys.no", json);

  it("turns scores into percentages and keeps the core metrics", () => {
    expect(report.url).toBe("https://fjordlys.no/");
    expect(report.scores).toEqual({ performance: 42, accessibility: 81, seo: 90, bestPractices: null });
    expect(report.metrics).toEqual({ lcp: "6,2 s", cls: "0,01", tbt: "120 ms", fcp: "3,1 s" });
  });

  it("lists failing audits by weight, skipping informative and not-applicable ones", () => {
    expect(report.issues.map((i) => i.id)).toEqual([
      "largest-contentful-paint",
      "image-alt",
      "color-contrast",
      "meta-description",
      "render-blocking-resources",
      "first-contentful-paint",
    ]);
  });
});

describe("choosing pages for PageSpeed", () => {
  it("takes the front page, a contact page and the most linked-to page", () => {
    const pages = [
      { url: "https://a.no/", internalLinks: ["https://a.no/tjenester", "https://a.no/kontakt", "https://a.no/om"] },
      { url: "https://a.no/om", internalLinks: ["https://a.no/tjenester"] },
      { url: "https://a.no/kontakt", internalLinks: [] },
      { url: "https://a.no/tjenester", internalLinks: [] },
    ];
    expect(pickPageSpeedPages(pages)).toEqual(["https://a.no/", "https://a.no/kontakt", "https://a.no/tjenester"]);
    expect(pickPageSpeedPages([pages[0]])).toEqual(["https://a.no/"]);
    expect(pickPageSpeedPages([])).toEqual([]);
  });
});
