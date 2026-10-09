// Milestone 5 "done when": the demo project can be completed through phase 8.
// Phases 1–6 are covered by walkthrough.spec.ts; this starts at launch.
import { randomUUID } from "node:crypto";
import { devices, expect, test } from "@playwright/test";
import { advanceToPhase, createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, service } from "./helpers";

test("launch checklist, handover page, public link and a finished project", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "One run covers both: the client uses a phone viewport.");
  test.setTimeout(240_000);

  const user = await createClientUser("Lansering AS");
  await advanceToPhase(user.projectId, 7);

  // A logo the client delivered earlier.
  const { data: project } = await service.from("projects").select("client_id").eq("id", user.projectId).single();
  const logoPath = `${project!.client_id}/${user.projectId}/${randomUUID()}-logo.png`;
  await service.storage.from("project-files").upload(logoPath, Buffer.from("89504e470d0a1a0a", "hex"), { contentType: "image/png" });
  await service.from("files").insert({
    client_id: project!.client_id,
    project_id: user.projectId,
    uploaded_by: user.userId,
    storage_path: logoPath,
    name: "logo.png",
    size_bytes: 8,
    mime_type: "image/png",
  });

  const admin = await createAdminWithTotp();
  const base = testInfo.project.use.baseURL!;
  const studio = await (await browser.newContext({ ...devices["Desktop Chrome"], baseURL: base })).newPage();
  const client = await (await browser.newContext({ ...devices["Pixel 7"], baseURL: base })).newPage();
  await loginAsAdmin(studio, admin);
  await loginAsClient(client, user.email);
  const projectUrl = `/studio/projects/${user.projectId}`;

  // --- Phase 7: the client sees no checklist, only that we are working -----------
  await client.goto(`/p/${user.projectId}`);
  await expect(client.getByRole("heading", { name: "Ingenting venter på deg nå" })).toBeVisible();
  await expect(client.getByText("MX-poster")).toHaveCount(0);

  // Site details first: they are what makes the DNS change safe.
  await studio.goto(`${projectUrl}/site`);
  await studio.getByRole("textbox", { name: "Domenenavn" }).fill("lansering.no");
  await studio.getByRole("textbox", { name: "Registrar" }).fill("Domeneshop");
  await studio.getByRole("combobox", { name: "Hvem eier domenet" }).selectOption("client");
  await studio.getByRole("textbox", { name: "Hostingleverandør" }).fill("Vercel");
  await studio.getByRole("combobox", { name: "Hvem eier hostingkontoen" }).selectOption("studio");
  await studio.getByRole("textbox", { name: "E-postleverandør" }).fill("Google Workspace");
  await studio.getByRole("button", { name: "Lagre" }).click();
  await expect(studio.getByText("Lagret.")).toBeVisible();

  // Work through the launch checklist in the project editor.
  await studio.goto(projectUrl);
  const launch = studio.getByRole("region", { name: /7\.\s*Lansering/ });
  for (let i = 0; i < 13; i++) {
    const button = launch.getByRole("button", { name: "Marker som fullført" }).first();
    await button.click();
    await expect(launch.getByRole("button", { name: "Marker som fullført" })).toHaveCount(12 - i);
  }

  const settings = studio.getByRole("region", { name: "Prosjektinnstillinger" });
  await settings.getByRole("textbox", { name: "Adresse til nettsiden" }).fill("https://lansering.no");
  await settings.getByRole("textbox", { name: "Lenke til CMS" }).fill("https://lansering.sanity.studio");
  await settings.getByRole("button", { name: "Lagre innstillinger" }).click();
  await expect(studio.getByText("Innstillingene er lagret.")).toBeVisible();

  // --- Phase 8: handover -----------------------------------------------------------
  const phase8 = studio.getByRole("region", { name: /8\.\s*Overlevering/ });
  await phase8.getByRole("button", { name: "Marker som fullført" }).first().click(); // Opplæring
  await expect(phase8.getByRole("button", { name: "Gjenåpne" })).toHaveCount(1);

  await studio.goto(`${projectUrl}/handover`);
  await studio.getByRole("button", { name: "Lag overleveringsside" }).click();

  const sections = studio.getByRole("region", { name: "Seksjoner" });
  await sections.locator("summary", { hasText: "Rediger «Logo»" }).click();
  await sections.getByRole("checkbox", { name: /logo\.png/ }).check();
  await sections.getByRole("button", { name: "Lagre seksjon" }).first().click();
  await expect(studio.getByText("Seksjonen er lagret.")).toBeVisible();

  await studio.reload();
  await sections.locator("summary", { hasText: "Rediger «Farger»" }).click();
  await sections.getByRole("textbox", { name: "Farger" }).fill("Fjordblå | #1F4E79\nSand #E8DCC4");
  await sections.locator("details[open]").getByRole("button", { name: "Lagre seksjon" }).click();
  await expect(studio.getByText("Seksjonen er lagret.")).toBeVisible();

  await studio.getByRole("button", { name: "Publiser for kunden" }).click();
  await expect(studio.getByText(/Publisert for kunden/)).toBeVisible();
  await studio.getByRole("button", { name: "Slå på offentlig lenke" }).click();
  await expect(studio.getByText("Lenken er aktiv.", { exact: false })).toBeVisible();
  const publicUrl = (await studio.locator("p.font-mono").textContent())!.trim();

  await studio.goto(projectUrl);
  await phase8.getByRole("button", { name: "Marker som fullført" }).first().click(); // Overleveringsside
  await expect(phase8.getByRole("button", { name: "Gjenåpne" })).toHaveCount(2);

  // Client confirms access, then approves the maintenance agreement.
  await client.goto(`/p/${user.projectId}`);
  const dinTur = client.getByRole("region", { name: "Din tur: Bekreft at du har fått tilgangene" });
  await expect(dinTur).toBeVisible();
  await dinTur.getByRole("link", { name: /Bekreft at du har fått tilgangene$/ }).click();
  await client.getByRole("button", { name: "Marker som gjort" }).click();
  await expect(client.getByText(/Fullført \d+\./)).toBeVisible();

  await studio.goto(`${projectUrl}/steps/${(await service.from("project_steps").select("id").eq("project_id", user.projectId).eq("title", "Bekreft vedlikeholdsavtalen").single()).data!.id}`);
  await studio.getByRole("textbox", { name: "Melding til kunden" }).fill("Avtalen ligger under Dokumenter.");
  await studio.getByRole("button", { name: "Del ny versjon med kunden" }).click();
  await expect(studio.getByText("Runde 1 venter på kunden.")).toBeVisible();

  await client.goto(`/p/${user.projectId}`);
  await client.getByRole("region", { name: /^Din tur/ }).getByRole("link", { name: /Bekreft vedlikeholdsavtalen$/ }).click();
  await client.getByRole("button", { name: "Godkjenn" }).click();
  await client.getByRole("dialog").getByRole("button", { name: "Godkjenn" }).click();
  await expect(client.getByText(/Godkjent .* av Deg/)).toBeVisible();

  // --- Finished: the client's home shows the live site, CMS and handover -------------
  await client.goto(`/p/${user.projectId}`);
  await expect(client.getByRole("heading", { name: "Prosjektet er ferdig" })).toBeVisible();
  await expect(client.getByRole("link", { name: /lansering\.no/ })).toHaveAttribute("href", "https://lansering.no");
  await expect(client.getByRole("link", { name: /Rediger nettsiden/ })).toHaveAttribute("href", "https://lansering.sanity.studio");
  await expect(client.getByRole("link", { name: /Åpne forhåndsvisningen/ })).toHaveCount(0);

  await client.getByRole("link", { name: "Se overleveringssiden" }).click();
  await expect(client.getByRole("heading", { level: 1, name: "Overlevering" })).toBeVisible();
  await expect(client.getByText("#1F4E79").first()).toBeVisible();
  await expect(client.getByRole("button", { name: "Kopier fargekoden #1F4E79 for Fjordblå" })).toBeVisible();
  await expect(client.getByRole("link", { name: /Last ned logo\.png/ })).toBeVisible();
  await expect(client.getByText("lansering.no").first()).toBeVisible();
  await expect(client.getByText("Domeneshop")).toBeVisible();

  // --- Public link: works without login, stops when switched off --------------------
  const visitor = await (await browser.newContext({ baseURL: base })).newPage();
  await visitor.goto(publicUrl);
  await expect(visitor.getByRole("heading", { level: 1, name: "Overlevering" })).toBeVisible();
  await expect(visitor.getByText("Lansering AS")).toBeVisible();
  await expect(visitor.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");

  await studio.goto(`${projectUrl}/handover`);
  await studio.getByRole("button", { name: "Slå av offentlig lenke" }).click();
  await expect(studio.getByText("Lenken er slått av.")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("Denne lenken virker ikke.", { exact: false })).toBeVisible();
});
