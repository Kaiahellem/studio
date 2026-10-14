import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { createAdminWithTotp, loginAsAdmin } from "./helpers";

// Website analysis, manual mode (docs/PLAN-ANALYSIS.md): a small local site is crawled, the
// bundle is downloaded, Claude's answer is pasted back. PageSpeed is faked (ANALYSIS_FAKES).

const pages: Record<string, string> = {
  "/": `<!doctype html><html lang="nb"><head><title>Fjordlys Rørlegger</title><meta name="viewport" content="width=device-width"></head>
    <body><nav><a href="/tjenester">Tjenester</a> <a href="/kontakt">Kontakt</a></nav>
    <main><h1>Rørlegger i Bergen</h1><p>Vi har fikset rør siden 1998. Ring 55 12 34 56.</p><img src="/bil.jpg"></main></body></html>`,
  "/tjenester": `<!doctype html><html><head><title>Tjenester</title></head><body><main><h1>Tjenester</h1><p>Baderom og varmepumper.</p></main></body></html>`,
  "/kontakt": `<!doctype html><html><head><title>Kontakt</title></head><body><main><h1>Kontakt oss</h1><form><input name="navn"></form></main></body></html>`,
  "/robots.txt": "User-agent: *\nDisallow: /admin",
};

let server: Server;
let site: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const body = pages[req.url ?? "/"];
    if (!body) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": req.url === "/robots.txt" ? "text/plain" : "text/html; charset=utf-8" }).end(body);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  site = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(() => new Promise<void>((r) => server.close(() => r())));

const answer = (urls: { front: string; contact: string }, title = "Telefonnummeret er ikke klikkbart") => `Her er analysen:

\`\`\`json
${JSON.stringify(
  {
    summary: "En ryddig side der kontaktinformasjonen er vanskelig å bruke på mobil.",
    findings: [
      {
        title,
        clientSaid: "For få henvendelser",
        siteToday: "Telefonnummeret på forsiden er bare tekst.",
        recommendation: "Gjør nummeret til en lenke og legg det i toppen på mobil.",
        impact: "high",
        sourceUrls: [urls.front],
      },
      {
        title: "Kontaktskjemaet er bare på kontaktsiden",
        clientSaid: null,
        siteToday: "Skjemaet finnes bare på én side.",
        recommendation: "Legg kontaktmuligheter på tjenestesidene.",
        impact: "medium",
        sourceUrls: [urls.contact, "https://oppdiktet.no/"],
      },
    ],
    keep: [{ kind: "text", description: "Historien om bedriften", excerpt: "Vi har fikset rør siden 1998.", sourceUrl: urls.front }],
    limitations: [],
  },
  null,
  2,
)}
\`\`\``;

test("analyse a website by hand: crawl, bundle, paste the answer, re-run and compare", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Studio is used on desktop.");
  test.setTimeout(180_000);
  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);

  // Create
  await page.goto("/studio/analyses");
  await page.getByRole("link", { name: "Ny analyse" }).click();
  await page.getByRole("textbox", { name: "Nettadresse" }).fill(site);
  await page.getByRole("textbox", { name: "Bedriftens navn" }).fill("Fjordlys Rørlegger");
  await page.getByRole("textbox", { name: "Hva sier de at ikke fungerer?" }).fill("For få henvendelser");
  await page.getByRole("button", { name: "Start analyse" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fjordlys Rørlegger" })).toBeVisible();
  const analysisUrl = page.url();

  // Crawl and checks finish; the run waits for Claude.
  await expect(page.getByRole("heading", { name: "Fullfør analysen i Claude" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Sider som ble lest (3)")).toBeVisible();
  await expect(page.getByText("1 telefonnummer er ikke klikkbart")).toBeVisible();
  await expect(page.getByText("1 bilde uten alt-tekst")).toBeVisible();

  // The bundle downloads as Markdown with the notes, the pages and the answer format.
  const href = await page.getByRole("link", { name: "Last ned som fil" }).getAttribute("href");
  const bundle = await page.request.get(href!);
  expect(bundle.headers()["content-disposition"]).toContain('filename="analyse-fjordlys-rorlegger.md"');
  const text = await bundle.text();
  expect(text).toContain("Det de sier ikke fungerer: For få henvendelser");
  expect(text).toContain("Vi har fikset rør siden 1998.");
  expect(text).toContain('"sourceUrls"');
  const front = `${site}/`;
  const contact = `${site}/kontakt`;

  // A broken answer is explained, not saved.
  const answerBox = page.getByRole("textbox", { name: "Svaret fra Claude" });
  await answerBox.fill("Beklager, jeg kan ikke hjelpe med det.");
  await page.getByRole("button", { name: "Lagre svaret" }).click();
  await expect(page.getByText("Fant ingen JSON i svaret.")).toBeVisible();

  // A good answer is saved; the finding citing an unknown page keeps only the known one.
  await answerBox.fill(answer({ front, contact }));
  await page.getByRole("button", { name: "Lagre svaret" }).click();
  await expect(page.getByRole("heading", { name: "Telefonnummeret er ikke klikkbart" })).toBeVisible();
  await expect(page.getByText("Stor effekt")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dette kan gjenbrukes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fullfør analysen i Claude" })).toHaveCount(0);

  // New instructions version, then a second run that uses it.
  await page.goto("/studio/settings");
  const instructions = page.getByRole("textbox", { name: /Instruksjoner til Claude/ });
  await instructions.fill(`${await instructions.inputValue()}\nSkriv kort.`);
  await page.getByRole("button", { name: "Lagre ny versjon" }).click();
  await expect(page.getByText(/Versjon \d+ er lagret\./)).toBeVisible();
  const version = (await page.getByText(/Versjon \d+ er lagret\./).textContent())!.match(/\d+/)![0];

  await page.goto(analysisUrl);
  await page.getByRole("button", { name: "Kjør på nytt" }).click();
  await expect(page.getByRole("heading", { name: "Fullfør analysen i Claude" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("definition").filter({ hasText: `Versjon ${version}` })).toBeVisible();
  await page.getByRole("textbox", { name: "Svaret fra Claude" }).fill(answer({ front, contact }, "Telefonen er gjemt"));
  await page.getByRole("button", { name: "Lagre svaret" }).click();
  await expect(page.getByRole("heading", { name: "Telefonen er gjemt" })).toBeVisible();

  // Compare with the first run.
  await page.getByRole("link", { name: "Sammenlign med forrige" }).click();
  const compare = page.getByRole("region", { name: "Sammenligning" });
  await expect(compare.getByRole("heading", { name: "Telefonen er gjemt" })).toBeVisible();
  await expect(compare.getByRole("heading", { name: "Telefonnummeret er ikke klikkbart" })).toBeVisible();
});

test("an internal address is refused", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Studio is used on desktop.");
  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);
  await page.goto("/studio/analyses/new");
  await page.getByRole("textbox", { name: "Nettadresse" }).fill("http://169.254.169.254/latest/meta-data/");
  await page.getByRole("textbox", { name: "Bedriftens navn" }).fill("Metadata");
  await page.getByRole("button", { name: "Start analyse" }).click();
  await expect(page.getByText("Adressen kan ikke leses av Portal (intern eller ugyldig adresse).")).toBeVisible({ timeout: 30_000 });
});
