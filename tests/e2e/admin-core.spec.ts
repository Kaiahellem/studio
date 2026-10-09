// Milestone 2 "done when": a real project can be created from scratch without touching the database.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createAdminWithTotp, loginAsAdmin, readLoginEmail, service } from "./helpers";

test.describe.configure({ mode: "serial" });

test("create a client, invite a user, create a project and work its steps", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Admin flow is covered on desktop; the client side is tested on mobile.");
  test.setTimeout(120_000);

  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);

  // Client
  const clientName = `Testbedrift ${randomUUID().slice(0, 6)}`;
  await page.getByRole("link", { name: "Ny kunde" }).first().click();
  await page.getByRole("textbox", { name: "Navn på bedriften" }).fill(clientName);
  await page.getByRole("textbox", { name: "Organisasjonsnummer" }).fill("123 456 789");
  await page.getByRole("textbox", { name: "Interne notater" }).fill("Kom via nettverket.");
  await page.getByRole("button", { name: "Opprett kunde" }).click();
  await expect(page.getByRole("heading", { level: 1, name: clientName })).toBeVisible();

  // Invite
  const inviteEmail = `invitert-${randomUUID().slice(0, 8)}@e2e.test`;
  const since = new Date();
  const members = page.getByRole("region", { name: "Brukere med tilgang" });
  await members.getByRole("textbox", { name: "E-postadresse" }).fill(inviteEmail);
  await members.getByRole("textbox", { name: "Navn", exact: true }).fill("Ida Invitert");
  await members.getByRole("button", { name: "Send invitasjon" }).click();
  await expect(page.getByText(`Invitasjon sendt til ${inviteEmail}.`)).toBeVisible();
  await expect(members.getByText("Ida Invitert", { exact: true })).toBeVisible();
  const invitation = await readLoginEmail(inviteEmail, since);
  expect(invitation.code).toMatch(/^\d{6}$/);

  // Project from template
  await page.getByRole("link", { name: "Nytt prosjekt" }).click();
  await expect(page.getByRole("combobox", { name: "Kunde" })).toHaveValue(/.+/);
  await page.getByRole("textbox", { name: "Navn på prosjektet" }).fill("Ny nettside");
  await page.getByRole("button", { name: "Opprett prosjekt" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ny nettside" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Tilbud/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Overlevering/ })).toBeVisible();

  const phase1 = page.getByRole("region", { name: /1\.\s*Tilbud/ });

  // Rename a step
  await phase1.locator("summary", { hasText: "Rediger «Signer avtalen»" }).click();
  const editForm = phase1.locator("details[open] form");
  await editForm.getByRole("textbox", { name: "Tittel" }).fill("Signer avtalen digitalt");
  await editForm.getByRole("button", { name: "Lagre steg" }).click();
  await expect(phase1.getByText("Signer avtalen digitalt", { exact: true })).toBeVisible();

  // Add a step
  await phase1.locator("summary", { hasText: /^Legg til steg$/ }).click();
  const addForm = phase1.locator("details[open] form").last();
  await addForm.getByRole("textbox", { name: "Tittel" }).fill("Send logo til trykkeriet");
  await addForm.getByRole("combobox", { name: "Hvem gjør steget" }).selectOption("studio");
  await addForm.getByRole("checkbox", { name: "Synlig for kunden" }).uncheck();
  await addForm.getByRole("button", { name: "Legg til steg" }).click();
  await expect(phase1.getByText("Send logo til trykkeriet", { exact: true })).toBeVisible();

  // Reorder: move the new step up
  await phase1.getByRole("button", { name: "Flytt «Send logo til trykkeriet» opp" }).click();
  const titles = phase1.locator("ol > li p.font-medium");
  await expect(titles.nth(3)).toHaveText("Send logo til trykkeriet");

  // Mark the active step done; the next one becomes active
  const first = phase1.locator("ol > li").first();
  await expect(first.getByText("Aktiv", { exact: true })).toBeVisible();
  await first.getByRole("button", { name: "Marker som fullført" }).click();
  await expect(first.getByText("Fullført", { exact: true })).toBeVisible();
  await expect(phase1.locator("ol > li").nth(1).getByText("Aktiv", { exact: true })).toBeVisible();

  // Project settings
  const settings = page.getByRole("region", { name: "Prosjektinnstillinger" });
  await settings.getByRole("textbox", { name: "Forhåndsvisning" }).fill("https://ny-nettside.vercel.app");
  await settings.getByRole("button", { name: "Lagre innstillinger" }).click();
  await expect(page.getByText("Innstillingene er lagret.")).toBeVisible();

  // Dashboard shows the project
  await page.getByRole("navigation").getByRole("link", { name: "Oversikt" }).click();
  await expect(page.getByRole("link", { name: clientName })).toBeVisible();

  const stored = await service.from("projects").select("staging_url").eq("name", "Ny nettside").order("created_at", { ascending: false }).limit(1).single();
  expect(stored.data?.staging_url).toBe("https://ny-nettside.vercel.app");
});
