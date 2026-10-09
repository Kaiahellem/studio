// Milestone 6 "done when": the demo client can send a change request, I can handle it and log
// time, and the client sees status and hours used.
import { devices, expect, test } from "@playwright/test";
import { createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, service } from "./helpers";

test("change request from client to done, with time against the agreement", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "One run covers both: the client uses a phone viewport.");
  test.setTimeout(180_000);

  const user = await createClientUser("Vedlikehold AS");
  // A launched project.
  await service.from("projects").update({ live_url: "https://vedlikehold.no", cms_url: "https://vedlikehold.sanity.studio" }).eq("id", user.projectId);
  const { data: project } = await service.from("projects").select("client_id").eq("id", user.projectId).single();

  const admin = await createAdminWithTotp();
  const base = testInfo.project.use.baseURL!;
  const studio = await (await browser.newContext({ ...devices["Desktop Chrome"], baseURL: base })).newPage();
  const client = await (await browser.newContext({ ...devices["Pixel 7"], baseURL: base })).newPage();
  await loginAsAdmin(studio, admin);
  await loginAsClient(client, user.email);

  // --- The studio sets up the agreement on the client page -------------------------
  await studio.goto(`/studio/clients/${project!.client_id}`);
  const agreements = studio.getByRole("region", { name: "Vedlikeholdsavtale" });
  await agreements.locator("summary", { hasText: "Legg til avtale" }).click();
  await agreements.getByRole("combobox", { name: "Status" }).selectOption("active");
  await agreements.getByRole("textbox", { name: /Startdato/ }).fill("2020-01-01");
  await agreements.getByRole("button", { name: "Lagre avtale" }).click();
  await expect(agreements.getByText(/^0 min av 1 t$/)).toBeVisible();

  // --- The client sends a change request ---------------------------------------------
  await client.goto(`/p/${user.projectId}`);
  const maintenance = client.getByRole("region", { name: "Vedlikehold" });
  await expect(maintenance.getByText(/^0 min av 1 t$/)).toBeVisible();
  await maintenance.getByRole("link", { name: "Meld inn endring" }).click();

  await client.getByRole("textbox", { name: "Hva gjelder det?" }).fill("Nye åpningstider");
  await client.getByRole("textbox", { name: "Beskriv endringen" }).fill("Fra 1. november: 08–16 hverdager.");
  await client.getByRole("combobox", { name: "Hvor fort trengs det?" }).selectOption("urgent");
  await client.getByRole("button", { name: "Send inn" }).click();
  await expect(client.getByText("Takk! Vi har fått ønsket ditt")).toBeVisible();
  await expect(client.getByText("Mottatt", { exact: true })).toBeVisible();
  await expect(client.getByText("Inkludert i avtalen")).toBeVisible();

  await client.waitForLoadState("networkidle");
  await client.locator('input[type="file"]').setInputFiles({ name: "skilt.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") });
  await expect(client.getByText("skilt.png er lastet opp.")).toBeVisible();
  const requestUrl = client.url().replace(/\?.*$/, "");

  // --- The studio triages, logs time and finishes it -----------------------------------
  const requestId = requestUrl.split("/").pop()!;
  await studio.goto("/studio");
  await studio.locator(`a[href="/studio/change-requests/${requestId}"]`).click();
  await expect(studio.getByRole("heading", { level: 1, name: "Nye åpningstider" })).toBeVisible();
  await expect(studio.getByText("Haster", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(studio.getByRole("link", { name: "skilt.png" })).toBeVisible();

  const triage = studio.getByRole("region", { name: "Behandling" });
  await triage.getByRole("combobox", { name: "Status" }).selectOption("in_progress");
  await triage.getByRole("textbox", { name: "Anslått tid" }).fill("1,5");
  await triage.getByRole("button", { name: "Lagre" }).click();
  await expect(triage.getByText("Lagret.")).toBeVisible();

  const time = studio.getByRole("region", { name: "Tidsføring" });
  await time.getByRole("textbox", { name: "Tid" }).fill("45 min");
  await time.getByRole("textbox", { name: "Hva ble gjort" }).fill("Oppdaterte åpningstider i Sanity");
  await time.getByRole("button", { name: "Før tid" }).click();
  await expect(time.getByText("Totalt 45 min")).toBeVisible();

  await studio.getByRole("textbox", { name: "Skriv en kommentar" }).fill("Nå er åpningstidene oppdatert.");
  await studio.getByRole("button", { name: "Send" }).click();
  await expect(studio.getByText("Kommentaren er sendt.")).toBeVisible();

  await triage.getByRole("combobox", { name: "Status" }).selectOption("done");
  await triage.getByRole("button", { name: "Lagre" }).click();
  await expect(studio.getByRole("heading", { level: 1 }).locator("..").locator("..").getByText("Ferdig", { exact: true }).filter({ visible: true })).toBeVisible();

  // A routine maintenance entry as well.
  await studio.goto(`/studio/projects/${user.projectId}/maintenance`);
  await studio.getByRole("textbox", { name: "Hva ble gjort" }).fill("Oppdaterte avhengigheter og tok sikkerhetskopi");
  await studio.getByRole("textbox", { name: "Tid" }).fill("0:15");
  await studio.getByRole("button", { name: "Ny oppføring" }).click();
  await expect(studio.getByText("Oppføringen er lagt til.")).toBeVisible();

  // --- The client sees the outcome ----------------------------------------------------
  await client.goto(requestUrl);
  await expect(client.getByText("Ferdig", { exact: true })).toBeVisible();
  await expect(client.getByText("Nå er åpningstidene oppdatert.")).toBeVisible();
  await expect(client.getByText("1 t 30 min")).toBeVisible(); // estimate
  await expect(client.getByText("45 min", { exact: true })).toBeVisible(); // used
  await expect(client.getByText("Oppdaterte åpningstider i Sanity")).toHaveCount(0); // time entry details stay internal

  await client.goto(`/p/${user.projectId}/vedlikehold`);
  await expect(client.getByText(/^1 t av 1 t$/)).toBeVisible();
  await expect(client.getByText("Oppdaterte avhengigheter og tok sikkerhetskopi")).toBeVisible();

  await client.goto(`/p/${user.projectId}/endringer`);
  await expect(client.getByRole("link", { name: /Nye åpningstider/ })).toBeVisible();
});
