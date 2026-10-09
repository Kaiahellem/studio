// Automated WCAG 2.1 AA checks (axe) on the pages clients and the studio use most.
// Manual testing with NVDA and JAWS is still needed; axe catches roughly a third of issues.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { advanceToPhase, createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, requestLogin, service, stepIdByTitle } from "./helpers";

async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Pages Next keeps hidden for back navigation are not part of what the user sees.
    .exclude('[hidden], [style*="display: none"]')
    .analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, label).toEqual([]);
}

test("login pages", async ({ page }) => {
  await page.goto("/logg-inn");
  await audit(page, "logg-inn");
  const user = await createClientUser("Axe Login AS");
  await requestLogin(page, user.email);
  await audit(page, "kode");
  await page.goto("/personvern");
  await audit(page, "personvern");
});

test("client pages", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await createClientUser("Axe AS");
  await advanceToPhase(user.projectId, 2);
  await service.rpc("complete_step", { p_step_id: await stepIdByTitle(user.projectId, "Oppstartsmøte") });
  await loginAsClient(page, user.email);

  await page.goto(`/p/${user.projectId}`);
  await audit(page, "oversikt");
  await page.goto(`/p/${user.projectId}/steg/${await stepIdByTitle(user.projectId, "Fyll ut oppstartsskjemaet")}`);
  await audit(page, "skjema");
  await page.getByRole("button", { name: "Send inn" }).click();
  await expect(page.getByText("Noe mangler.", { exact: false })).toBeVisible();
  await audit(page, "skjema med feil");

  await advanceToPhase(user.projectId, 4);
  const structure = await stepIdByTitle(user.projectId, "Godkjenn struktur");
  await service.from("approval_rounds").insert({ step_id: structure, round: 1, note: "Klar." });
  await page.goto(`/p/${user.projectId}/steg/${structure}`);
  await audit(page, "godkjenning");
  await page.getByRole("button", { name: "Be om endringer" }).click();
  await expect(page.getByText("Skriv hva som bør endres", { exact: false })).toBeVisible();
  await audit(page, "godkjenning, feil uten kommentar");

  await page.goto(`/p/${user.projectId}/steg/${await stepIdByTitle(user.projectId, "Last opp logo")}`);
  await audit(page, "opplasting");
  for (const sub of ["dokumenter", "filer", "overlevering"]) {
    await page.goto(`/p/${user.projectId}/${sub}`);
    await audit(page, sub);
  }

  await service.from("projects").update({ live_url: "https://axe.no", cms_url: "https://axe.sanity.studio" }).eq("id", user.projectId);
  for (const sub of ["", "/endringer", "/endringer/ny", "/vedlikehold"]) {
    await page.goto(`/p/${user.projectId}${sub}`);
    await audit(page, `etter lansering ${sub || "/"}`);
  }
});

test("studio pages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Studio is used on desktop.");
  test.setTimeout(120_000);
  const user = await createClientUser("Axe Studio AS");
  const { data: project } = await service.from("projects").select("client_id").eq("id", user.projectId).single();
  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);

  for (const path of [
    "/studio",
    "/studio/clients",
    "/studio/clients/new",
    `/studio/clients/${project!.client_id}`,
    "/studio/projects/new",
    `/studio/projects/${user.projectId}`,
    `/studio/projects/${user.projectId}/steps/${await stepIdByTitle(user.projectId, "Godta tilbudet")}`,
    `/studio/projects/${user.projectId}/documents`,
    `/studio/projects/${user.projectId}/site`,
    `/studio/projects/${user.projectId}/handover`,
    `/studio/projects/${user.projectId}/maintenance`,
    `/studio/projects/${user.projectId}/activity`,
    "/studio/change-requests",
    "/studio/plans",
    "/studio/settings",
    "/studio/sikkerhet",
  ]) {
    await page.goto(path);
    await audit(page, path);
  }
});
