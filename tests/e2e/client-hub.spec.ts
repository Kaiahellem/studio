// Milestone 3 "done when": the demo client sees exactly what they need to do next, on mobile and desktop.
import { expect, test } from "@playwright/test";
import { advanceToPhase, createClientUser, loginAsClient, service, stepIdByTitle } from "./helpers";

test("content phase: the first open item is the client's turn, the rest are listed", async ({ page }) => {
  const user = await createClientUser("Innhold AS");
  await advanceToPhase(user.projectId, 3);
  await service.rpc("complete_step", { p_step_id: await stepIdByTitle(user.projectId, "Last opp logo") });

  await loginAsClient(page, user.email);
  await expect(page.getByRole("heading", { level: 1, name: "Nettside for Innhold AS" })).toBeVisible();

  const card = page.getByRole("region", { name: "Din tur" });
  await expect(card.getByText("Last opp tekster", { exact: true })).toBeVisible();
  await expect(card.getByText("3 ting til venter på deg:")).toBeVisible();
  for (const title of ["Last opp bilder", "Andre filer (valgfritt)", "Domene og tilganger"]) {
    await expect(card.getByRole("link", { name: title })).toBeVisible();
  }

  // Timeline: phase 3 is current and marked for assistive tech, not only visually.
  const timeline = page.getByRole("region", { name: "Slik ligger vi an" });
  // Steps appear in the order the studio set.
  await expect(timeline.locator('li[aria-current="step"] ul a')).toHaveText([
    "Last opp logo", "Last opp tekster", "Last opp bilder", "Andre filer (valgfritt)", "Domene og tilganger",
  ]);
  const current = timeline.locator('li[aria-current="step"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText("Fase 3 av 8 · Pågår nå");
  await expect(current).toContainText("Innhold");
  await expect(timeline.getByText("Fase 1 av 8 · Fullført")).toBeVisible();

  // The studio-only launch checklist never reaches the client.
  await expect(page.getByText("MX-poster")).toHaveCount(0);

  // The action button leads to the step.
  await card.getByRole("link", { name: /Last opp: Last opp tekster/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Last opp tekster" })).toBeVisible();
});

test("waiting on the studio: no action, what we work on and when they hear from us", async ({ page }) => {
  const user = await createClientUser("Venter AS");
  await advanceToPhase(user.projectId, 4);
  const structure = await stepIdByTitle(user.projectId, "Godkjenn struktur");
  await service.from("project_steps").update({ due_date: "2030-03-14" }).eq("id", structure);

  await loginAsClient(page, user.email);
  await expect(page.getByRole("heading", { name: "Ingenting venter på deg nå" })).toBeVisible();
  await expect(page.getByText("Vi jobber med sidekart og skisser.")).toBeVisible();
  await expect(page.getByText("Du hører fra oss senest 14. mars 2030.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Din tur" })).toHaveCount(0);
});

test("an open approval round becomes the client's turn", async ({ page }) => {
  const user = await createClientUser("Godkjenn AS");
  await advanceToPhase(user.projectId, 4);
  const structure = await stepIdByTitle(user.projectId, "Godkjenn struktur");
  await service.from("approval_rounds").insert({ step_id: structure, round: 1, note: "Sidekart og skisser er klare.", link: "https://example.com/skisser" });
  await service.from("projects").update({ staging_url: "https://godkjenn-staging.example.com" }).eq("id", user.projectId);

  await loginAsClient(page, user.email);
  const card = page.getByRole("region", { name: "Din tur" });
  await expect(card.getByText("Godkjenn struktur", { exact: true })).toBeVisible();
  await card.getByRole("link", { name: /Se og godkjenn/ }).click();
  await expect(page.getByRole("heading", { name: "Runde 1 av 2" })).toBeVisible();
  await expect(page.getByText("Sidekart og skisser er klare.")).toBeVisible();

  await page.getByRole("link", { name: "Til oversikten" }).click();
  await expect(page.getByRole("link", { name: /Åpne testversjonen/ })).toHaveAttribute("href", "https://godkjenn-staging.example.com");
});
