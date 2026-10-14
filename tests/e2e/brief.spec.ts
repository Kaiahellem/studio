import { expect, test } from "@playwright/test";
import { createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, service } from "./helpers";

test("the studio downloads the project brief; a client cannot", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Studio is used on desktop.");
  test.setTimeout(90_000);
  const user = await createClientUser("Brief Rørlegger AS");
  await service.from("site_details").upsert({ project_id: user.projectId, domain_name: "brief-rorlegger.no" });
  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);

  // Before any analysis, the project page says so.
  await page.goto(`/studio/projects/${user.projectId}`);
  await expect(page.getByRole("definition").filter({ hasText: "Ingen. Koble en analyse til prosjektet eller kunden." })).toBeVisible();

  // An analysis linked only to the client, with a finished run, goes into the brief.
  const { data: project } = await service.from("projects").select("client_id").eq("id", user.projectId).single();
  const { data: prompt } = await service.from("prompt_templates").select("id").eq("key", "site_analysis").order("version").limit(1).single();
  const { data: analysis } = await service
    .from("site_analyses")
    .insert({ url: "https://brief-rorlegger.no", business_name: "Brief Rørlegger", client_id: project!.client_id })
    .select("id")
    .single();
  await service.from("analysis_runs").insert({
    analysis_id: analysis!.id,
    status: "done",
    page_limit: 15,
    prompt_version_id: prompt!.id,
    result: {
      summary: "Telefonnummeret er gjemt på mobil.",
      findings: [{ title: "Skjult telefon", clientSaid: null, siteToday: "Nummeret er tekst.", recommendation: "Gjør det klikkbart.", impact: "high", sourceUrls: ["https://brief-rorlegger.no/"] }],
      keep: [],
      limitations: [],
    },
  });
  await page.reload();
  await expect(page.getByRole("link", { name: /Brief Rørlegger, kjørt .* \(via kunden\)/ })).toBeVisible();
  const link = page.getByRole("link", { name: "Last ned prosjektbrief" });
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain('filename="prosjektbrief-brief-rorlegger-as.md"');
  const text = await response.text();
  expect(text).toContain("# Prosjektbrief:");
  expect(text).toContain("Brief Rørlegger AS");
  expect(text).toContain("- **Domenenavn:** brief-rorlegger.no");
  expect(text).toContain("### Oppstartsskjema");
  expect(text).toContain("Telefonnummeret er gjemt på mobil.");
  expect(text).toContain("**Skjult telefon** (Stor effekt)");

  const client = await (await browser.newContext({ baseURL: testInfo.project.use.baseURL })).newPage();
  await loginAsClient(client, user.email);
  const denied = await client.request.get(`/studio/projects/${user.projectId}/brief`, { maxRedirects: 0 });
  expect(denied.status()).not.toBe(200);
  expect(await denied.text()).not.toContain("Prosjektbrief");
});
