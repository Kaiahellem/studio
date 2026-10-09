// Milestone 4 "done when": the demo project can be walked through phases 1 to 6 end to end.
// The studio works on desktop, the client on a phone, both through the UI only.
import { devices, expect, test, type Page } from "@playwright/test";
import { createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, stepIdByTitle } from "./helpers";

const png = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex") });
const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF") });

test("phases 1 to 6, studio and client together", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "One run covers both: the client uses a phone viewport.");
  test.setTimeout(240_000);

  const user = await createClientUser("Gjennomgang AS");
  const admin = await createAdminWithTotp();
  const base = testInfo.project.use.baseURL!;

  const studio = await (await browser.newContext({ ...devices["Desktop Chrome"], baseURL: base })).newPage();
  const client = await (await browser.newContext({ ...devices["Pixel 7"], baseURL: base })).newPage();
  await loginAsAdmin(studio, admin);
  await loginAsClient(client, user.email);

  const projectUrl = `/studio/projects/${user.projectId}`;
  const stepUrl = async (title: string) => `${projectUrl}/steps/${await stepIdByTitle(user.projectId, title)}`;
  const dinTur = () => client.getByRole("region", { name: /^Din tur/ });

  async function clientOpensDinTur(title: string) {
    await client.goto(`/p/${user.projectId}`);
    const card = client.getByRole("region", { name: `Din tur: ${title}` });
    await expect(card).toBeVisible();
    await card.getByRole("link", { name: new RegExp(`: ${title.replace(/[()]/g, "\\$&")}$`) }).click();
    await expect(client.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }

  async function studioOpensRound(title: string, note: string) {
    await studio.goto(await stepUrl(title));
    await studio.getByRole("textbox", { name: "Melding til kunden" }).fill(note);
    await studio.getByRole("button", { name: "Del ny versjon med kunden" }).click();
    await expect(studio.getByText(/Runde \d+ venter på kunden\./)).toBeVisible();
  }

  async function studioCompletes(title: string) {
    await studio.goto(await stepUrl(title));
    await studio.getByRole("button", { name: "Marker som fullført" }).click();
    await expect(studio.getByText("Fullført", { exact: true }).first()).toBeVisible();
  }

  async function clientApproves() {
    await client.getByRole("button", { name: "Godkjenn" }).click();
    await client.getByRole("dialog").getByRole("button", { name: "Godkjenn" }).click();
    await expect(client.getByText(/Godkjent .* av Deg/)).toBeVisible();
  }

  async function clientUploads(page: Page, files: ReturnType<typeof png>[]) {
    await page.locator('input[type="file"]').setInputFiles(files);
    for (const f of files) await expect(page.getByText(`${f.name} er lastet opp.`)).toBeVisible();
  }

  // --- Phase 1: Tilbud -------------------------------------------------------
  await studio.goto(`${projectUrl}/documents`);
  const addDoc = studio.getByRole("region", { name: "Legg til dokument" });
  await addDoc.getByRole("textbox", { name: "Tittel" }).fill("Tilbud – ny nettside");
  await addDoc.locator('input[type="file"]').setInputFiles(pdf("tilbud.pdf"));
  await addDoc.getByRole("button", { name: "Legg til dokument" }).click();
  await expect(studio.getByText("Dokumentet er lagt til.")).toBeVisible();

  await studioOpensRound("Godta tilbudet", "Tilbudet ligger under Dokumenter.");

  await client.goto(`/p/${user.projectId}/dokumenter`);
  await expect(client.getByRole("link", { name: /Tilbud – ny nettside/ })).toBeVisible();

  await clientOpensDinTur("Godta tilbudet");
  await expect(client.getByText("Tilbudet ligger under Dokumenter.")).toBeVisible();
  await clientApproves();

  // "Signer avtalen" is completed by the studio when the signature arrives.
  await client.goto(`/p/${user.projectId}`);
  await dinTur().getByRole("link", { name: /Signer avtalen/ }).click();
  await expect(client.getByText("Vi markerer steget som fullført når det er gjort.")).toBeVisible();
  await studioCompletes("Signer avtalen");

  await clientOpensDinTur("Velg vedlikeholdsavtale (valgfritt)");
  await client.getByRole("button", { name: "Marker som gjort" }).click();
  await expect(client.getByRole("definition").filter({ hasText: /^Ferdig$/ })).toBeVisible();
  await studioCompletes("Faktura for depositum");

  // --- Phase 2: Oppstart -----------------------------------------------------
  await studioCompletes("Oppstartsmøte");
  await clientOpensDinTur("Fyll ut oppstartsskjemaet");
  await client.getByRole("textbox", { name: "Hva gjør dere?" }).fill("Rørleggertjenester i Bergen.");
  await client.getByRole("button", { name: "Lagre utkast" }).click();
  await expect(client.getByText("Lagret. Du kan fortsette når det passer.")).toBeVisible();
  // Submitting with required answers missing points to them.
  await client.getByRole("button", { name: "Send inn" }).click();
  await expect(client.getByText("Noe mangler. Se spørsmålene som er markert.")).toBeVisible();
  // Focus moves to the first unanswered required question.
  await expect(client.getByRole("textbox", { name: /Hva skiller dere/ })).toBeFocused();
  await expect(client.getByRole("textbox", { name: "Hva gjør dere?" })).toHaveValue("Rørleggertjenester i Bergen.");
  await client.getByRole("textbox", { name: /Hva skiller dere/ }).fill("Fast pris og ryddig arbeid.");
  await client.getByRole("textbox", { name: /Hvilke tjenester/ }).fill("Baderom\nVarmepumper");
  await client.getByRole("textbox", { name: /Hva skal nettsiden oppnå/ }).fill("Flere forespørsler på baderom.");
  await client.getByRole("group", { name: /Hvordan skal kundene ta kontakt/ }).getByRole("checkbox", { name: "Telefon" }).check();
  await client.getByRole("button", { name: "Send inn" }).click();
  await expect(client.getByRole("heading", { name: "Svarene dine" })).toBeVisible();

  await studio.goto(await stepUrl("Fyll ut oppstartsskjemaet"));
  await expect(studio.getByText("Fast pris og ryddig arbeid.")).toBeVisible();
  await expect(studio.getByText("Telefon", { exact: true })).toBeVisible();

  // --- Phase 3: Innhold (parallel) -------------------------------------------
  await clientOpensDinTur("Last opp logo");
  await clientUploads(client, [png("logo.png"), png("logo-hvit.png")]);
  await expect(client.getByRole("link", { name: "logo-hvit.png" })).toBeVisible();
  await client.getByRole("button", { name: "Fjern logo-hvit.png" }).click();
  await expect(client.getByRole("link", { name: "logo-hvit.png" })).toHaveCount(0);
  await client.getByRole("button", { name: "Jeg har lastet opp alt" }).click();
  await expect(client.getByRole("definition").filter({ hasText: /^Ferdig$/ })).toBeVisible();

  for (const [title, file] of [
    ["Last opp tekster", pdf("forside.pdf")],
    ["Last opp bilder", png("team.png")],
  ] as const) {
    await clientOpensDinTur(title);
    await clientUploads(client, [file]);
    await client.getByRole("button", { name: "Jeg har lastet opp alt" }).click();
    await expect(client.getByRole("definition").filter({ hasText: /^Ferdig$/ })).toBeVisible();
  }

  await clientOpensDinTur("Andre filer (valgfritt)");
  await client.getByRole("textbox", { name: "Skriv en kommentar" }).fill("Har ikke noe mer, men lurer på om vi trenger bilder av bilen?");
  await client.getByRole("button", { name: "Send" }).click();
  await expect(client.getByText("Kommentaren er sendt.")).toBeVisible();
  await client.getByRole("button", { name: "Jeg har lastet opp alt" }).click();

  // The studio answers, and leaves an internal note the client must never see.
  await studio.goto(await stepUrl("Andre filer (valgfritt)"));
  await expect(studio.getByText("lurer på om vi trenger bilder av bilen?")).toBeVisible();
  await studio.getByRole("textbox", { name: "Skriv en kommentar" }).fill("Gjerne ett bilde av bilen!");
  await studio.getByRole("button", { name: "Send" }).click();
  await expect(studio.getByText("Kommentaren er sendt.")).toBeVisible();
  await studio.getByRole("textbox", { name: "Skriv en kommentar" }).fill("Intern: husk å be om firmabil-bilde.");
  await studio.getByRole("checkbox", { name: /Intern kommentar/ }).check();
  await studio.getByRole("button", { name: "Send" }).click();
  await expect(studio.getByText("Intern: husk å be om firmabil-bilde.")).toBeVisible();

  await client.goto(`/p/${user.projectId}/steg/${await stepIdByTitle(user.projectId, "Andre filer (valgfritt)")}`);
  await expect(client.getByText("Gjerne ett bilde av bilen!")).toBeVisible();
  await expect(client.getByText(/husk å be om firmabil-bilde/)).toHaveCount(0);

  await clientOpensDinTur("Domene og tilganger");
  await client.getByRole("textbox", { name: /Domenenavn/ }).fill("gjennomgang.no");
  await client.getByRole("textbox", { name: /Hvor er domenet registrert/ }).fill("Domeneshop");
  await client.getByRole("textbox", { name: /Hvor ligger e-posten/ }).fill("Microsoft 365");
  await client.getByRole("button", { name: "Send inn" }).click();
  await expect(client.getByRole("heading", { name: "Svarene dine" })).toBeVisible();

  await client.goto(`/p/${user.projectId}/filer`);
  for (const name of ["logo.png", "forside.pdf", "team.png"]) await expect(client.getByRole("link", { name })).toBeVisible();

  // --- Phase 4: Struktur, with one round of changes ----------------------------
  await studioOpensRound("Godkjenn struktur", "Sidekart og skisser er klare.");
  await clientOpensDinTur("Godkjenn struktur");
  await expect(client.getByRole("region", { name: "Struktur" }).getByText("Runde 1 av 2", { exact: true })).toBeVisible();
  // Asking for changes needs a comment.
  await client.getByRole("button", { name: "Be om endringer" }).click();
  await expect(client.getByText("Skriv hva som bør endres før du ber om endringer.")).toBeVisible();
  await client.getByRole("textbox", { name: "Kommentar", exact: true }).fill("Flytt kontakt opp i menyen.");
  await client.getByRole("button", { name: "Be om endringer" }).click();
  await expect(client.getByText("Takk! Vi går gjennom endringene og sier fra når neste versjon er klar.")).toBeVisible();

  await client.goto(`/p/${user.projectId}`);
  await expect(client.getByRole("heading", { name: "Ingenting venter på deg nå" })).toBeVisible();

  await studioOpensRound("Godkjenn struktur", "Kontakt er flyttet opp.");
  await clientOpensDinTur("Godkjenn struktur");
  await expect(client.getByRole("region", { name: "Struktur" }).getByText("Runde 2 av 2", { exact: true })).toBeVisible();
  await expect(client.getByText(/Dette er den siste inkluderte runden/)).toBeVisible();
  await clientApproves();

  // --- Phase 5: Design ---------------------------------------------------------
  await studioOpensRound("Godkjenn design", "Design av forside og tjenesteside.");
  await clientOpensDinTur("Godkjenn design");
  await clientApproves();

  // --- Phase 6: Utvikling, with the staging link ----------------------------------
  await studio.goto(projectUrl);
  const settings = studio.getByRole("region", { name: "Prosjektinnstillinger" });
  await settings.getByRole("textbox", { name: "Forhåndsvisning" }).fill("https://gjennomgang.vercel.app");
  await settings.getByRole("button", { name: "Lagre innstillinger" }).click();
  await expect(studio.getByText("Innstillingene er lagret.")).toBeVisible();
  await studioOpensRound("Test og godkjenn nettsiden", "Alt er på plass på testlenken.");

  await client.goto(`/p/${user.projectId}`);
  await expect(client.getByRole("link", { name: /Åpne forhåndsvisningen/ })).toHaveAttribute("href", "https://gjennomgang.vercel.app");
  await clientOpensDinTur("Test og godkjenn nettsiden");
  await clientApproves();

  // --- Done with phases 1–6 -----------------------------------------------------
  await client.goto(`/p/${user.projectId}`);
  await expect(client.getByRole("heading", { name: "Ingenting venter på deg nå" })).toBeVisible();
  await expect(client.getByRole("definition").filter({ hasText: "Lansering (7 av 8)" })).toBeVisible();
  await expect(client.locator('li[aria-current="step"]').getByRole("button", { name: "Lansering" })).toHaveAttribute("aria-expanded", "true");

  await studio.goto(`${projectUrl}/activity`);
  for (const event of ["godkjente", "ba om endringer", "sendte inn et skjema", "lastet opp en fil", "delte en ny versjon"]) {
    await expect(studio.getByText(event).first()).toBeVisible();
  }
});
