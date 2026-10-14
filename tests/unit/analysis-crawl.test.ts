import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkPage, checkSite } from "@/features/analysis/checks";
import { crawlSite, type Fetcher } from "@/features/analysis/crawl";
import { extractPage } from "@/features/analysis/extract";
import { assertPublicHost, checkUrlShape, FetchRefused, isPublicAddress, safeFetch } from "@/features/analysis/net";
import { parseRobots } from "@/features/analysis/robots";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/analysis/${name}`, import.meta.url), "utf8");

describe("address guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"])(
    "refuses %s",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );
  it.each(["93.184.216.34", "172.32.0.1", "8.8.8.8", "2606:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) => expect(isPublicAddress(ip)).toBe(true));

  it("only accepts http(s) on standard ports without credentials", () => {
    expect(checkUrlShape("https://example.no/side").hostname).toBe("example.no");
    for (const bad of ["ftp://example.no", "file:///etc/passwd", "http://example.no:8080", "https://user:pw@example.no", "ikke en adresse"]) {
      expect(() => checkUrlShape(bad)).toThrow(FetchRefused);
    }
  });

  it("refuses a host when any of its addresses is private", async () => {
    await expect(assertPublicHost(new URL("https://intern.example"), async () => ["93.184.216.34", "10.0.0.5"])).rejects.toThrow(FetchRefused);
    await expect(assertPublicHost(new URL("https://ok.example"), async () => ["93.184.216.34"])).resolves.toBeUndefined();
    await expect(assertPublicHost(new URL("http://[::1]/"))).rejects.toThrow(FetchRefused);
  });
});

describe("safeFetch against a local server", () => {
  let server: Server;
  let base: string;
  const local = (ip: string) => ip === "127.0.0.1";

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/to-metadata") {
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" }).end();
      } else if (req.url === "/big") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("x".repeat(5000));
      } else if (req.url === "/image") {
        res.writeHead(200, { "content-type": "image/png" }).end("binary");
      } else {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end("<title>Hei</title>");
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("refuses the local server by default", async () => {
    await expect(safeFetch(`${base}/`, { userAgent: "test", allowAnyPort: true })).rejects.toThrow(FetchRefused);
  });

  it("refuses a redirect to the metadata address, even when the first host is allowed", async () => {
    await expect(fetchLocal(`${base}/to-metadata`)).rejects.toThrow(FetchRefused);
  });

  it("stops reading at the size limit and skips the body of non-text responses", async () => {
    expect((await fetchLocal(`${base}/big`, 1000)).body.length).toBeLessThanOrEqual(1000);
    expect((await fetchLocal(`${base}/image`)).body).toBe("");
    expect((await fetchLocal(`${base}/`)).body).toContain("Hei");
  });

  // The test server runs on 127.0.0.1 and a random port, so allow exactly that.
  function fetchLocal(url: string, maxBytes?: number) {
    return safeFetch(url, { userAgent: "test", maxBytes, allowAddress: local, allowAnyPort: true });
  }
});

describe("extracting a page", () => {
  const facts = extractPage(fixture("front.html"), "https://www.fjordlys.no/");

  it("reads title, headings, text and language", () => {
    expect(facts.title).toBe("Fjordlys Rørlegger");
    expect(facts.lang).toBe("nb");
    expect(facts.headings).toEqual([
      { level: 1, text: "Rørlegger i Bergen" },
      { level: 3, text: "Døgnvakt" },
    ]);
    expect(facts.mainText).toContain("Vi har fikset rør i Bergen siden 1998.");
    expect(facts.mainText).not.toContain("secret");
    expect(facts.mainText).not.toContain("Hjem");
    expect(facts.hasLocalBusiness).toBe(true);
    expect(facts.hasViewport).toBe(true);
  });

  it("finds contacts, and phone numbers that are not links", () => {
    expect(facts.contacts.phones).toEqual(["55123457"]);
    expect(facts.contacts.unlinkedPhones).toEqual(["55123456"]); // not the org number
    expect(facts.contacts.emails).toEqual(["post@fjordlys.no"]);
  });

  it("lists internal pages only, without files, anchors or duplicates", () => {
    expect(facts.internalLinks.sort()).toEqual(["https://fjordlys.no/om-oss", "https://www.fjordlys.no/", "https://www.fjordlys.no/kontakt", "https://www.fjordlys.no/tjenester"]);
  });

  it("collects images with and without alt text, and calls to action", () => {
    expect(facts.images).toEqual([
      { src: "https://www.fjordlys.no/bilder/bil.jpg", alt: "Servicebilen vår" },
      { src: "https://www.fjordlys.no/bilder/team.jpg", alt: null },
    ]);
    expect(facts.ctas.map((c) => c.text)).toEqual(expect.arrayContaining(["Be om tilbud", "Ring vakttelefonen"]));
  });

  it("flags the expected issues", () => {
    expect(checkPage(facts).map((i) => i.code)).toEqual(["no_meta_description", "heading_skip", "images_without_alt", "unlinked_phone"]);
  });

  it("copes with a page that needs JavaScript", () => {
    const empty = extractPage(fixture("js-only.html"), "https://spa.example/");
    expect(empty.mainText).toBe("");
    expect(checkPage(empty).map((i) => i.code)).toEqual(expect.arrayContaining(["no_h1", "no_viewport", "no_meta_description"]));
  });
});

describe("site checks", () => {
  const front = extractPage(fixture("front.html"), "https://fjordlys.no/");
  it("reports site-wide issues", () => {
    const result = checkSite({
      startUrl: "https://fjordlys.no/",
      usesHttps: true,
      httpRedirectsToHttps: false,
      pages: [
        { url: "https://fjordlys.no/", facts: front },
        { url: "https://fjordlys.no/b", facts: { ...front, hasLocalBusiness: false } },
      ],
    });
    expect(result.site.map((i) => i.code)).toEqual(["no_http_redirect", "no_og_image", "duplicate_titles"]);
  });
});

describe("robots.txt", () => {
  it("follows rules for our bot and for everyone", () => {
    const robots = parseRobots("https://a.no/robots.txt", "User-agent: *\nDisallow: /admin\n\nUser-agent: PortalBot\nDisallow: /privat\nCrawl-delay: 2");
    expect(robots.allowed("https://a.no/")).toBe(true);
    expect(robots.allowed("https://a.no/privat/side")).toBe(false);
    expect(robots.crawlDelayMs).toBe(2000);
    expect(parseRobots("https://a.no/robots.txt", null).allowed("https://a.no/x")).toBe(true);
  });
});

describe("crawling", () => {
  const site: Record<string, { status?: number; type?: string; body: string; redirect?: string }> = {
    "http://fjordlys.no/": { redirect: "https://fjordlys.no/", body: "" },
    "https://fjordlys.no/": { body: `<title>Forside</title><a href="/a">A</a><a href="/b">B</a><a href="/hemmelig">H</a><a href="https://annen.no/">Ute</a>` },
    "https://fjordlys.no/robots.txt": { type: "text/plain", body: "User-agent: *\nDisallow: /hemmelig" },
    "https://fjordlys.no/a": { body: `<title>A</title><a href="/c">C</a><a href="/">Hjem</a>` },
    "https://fjordlys.no/b": { status: 404, body: "borte" },
    "https://fjordlys.no/c": { body: `<title>C</title>` },
  };
  const fetcher: Fetcher = async (url) => {
    let current = url;
    for (let i = 0; i < 3 && site[current]?.redirect; i++) current = site[current].redirect!;
    const page = site[current];
    if (!page) return { url: current, status: 404, contentType: "text/html", body: "" };
    return { url: current, status: page.status ?? 200, contentType: page.type ?? "text/html", body: page.body };
  };

  it("reads the site breadth-first, within the limit, respecting robots.txt", async () => {
    const result = await crawlSite({ startUrl: "http://fjordlys.no", pageLimit: 10, fetcher, delayMs: 0 });
    expect(result.startUrl).toBe("https://fjordlys.no/");
    expect(result.pages.map((p) => p.url)).toEqual(["https://fjordlys.no/", "https://fjordlys.no/a", "https://fjordlys.no/c"]);
    expect(result.skipped).toEqual([
      { url: "https://fjordlys.no/b", reason: "error" },
      { url: "https://fjordlys.no/hemmelig", reason: "robots" },
    ]);
    expect(result.usesHttps).toBe(true);
    expect(result.httpRedirectsToHttps).toBe(true);
  });

  it("stops at the page limit", async () => {
    const result = await crawlSite({ startUrl: "https://fjordlys.no/", pageLimit: 2, fetcher, delayMs: 0 });
    expect(result.pages).toHaveLength(2);
  });

  it("reads nothing when robots.txt is unavailable (5xx)", async () => {
    const down: Fetcher = async (url) =>
      url.endsWith("robots.txt") ? { url, status: 503, contentType: "text/plain", body: "" } : fetcher(url);
    const result = await crawlSite({ startUrl: "https://fjordlys.no/", pageLimit: 5, fetcher: down, delayMs: 0 });
    expect(result.robotsDisallowAll).toBe(true);
    expect(result.pages).toEqual([]);
  });
});
