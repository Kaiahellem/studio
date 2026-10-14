import { expect, test } from "@playwright/test";
import { createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, service } from "./helpers";

test("the studio downloads the project brief; a client cannot", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Studio is used on desktop.");
  const user = await createClientUser("Brief Rørlegger AS");
  await service.from("site_details").upsert({ project_id: user.projectId, domain_name: "brief-rorlegger.no" });
  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);

  await page.goto(`/studio/projects/${user.projectId}`);
  const link = page.getByRole("link", { name: "Last ned prosjektbrief" });
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain('filename="prosjektbrief-brief-rorlegger-as.md"');
  const text = await response.text();
  expect(text).toContain("# Prosjektbrief:");
  expect(text).toContain("Brief Rørlegger AS");
  expect(text).toContain("- **Domenenavn:** brief-rorlegger.no");
  expect(text).toContain("### Oppstartsskjema");

  const client = await (await browser.newContext({ baseURL: testInfo.project.use.baseURL })).newPage();
  await loginAsClient(client, user.email);
  const denied = await client.request.get(`/studio/projects/${user.projectId}/brief`, { maxRedirects: 0 });
  expect(denied.status()).not.toBe(200);
  expect(await denied.text()).not.toContain("Prosjektbrief");
});
