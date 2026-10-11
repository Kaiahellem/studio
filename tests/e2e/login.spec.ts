import { expect, test, type Page } from "@playwright/test";
import { totp } from "../totp";
import { createAdminUser, createClientUser, logOut, readLoginEmail, requestLogin } from "./helpers";

test.describe("client login", () => {
  test("with the code from the email", async ({ page }) => {
    const user = await createClientUser("Kode AS");
    await requestLogin(page, user.email);
    const { code } = await readLoginEmail(user.email);

    await page.getByLabel("Sekssifret kode").fill(code);
    await page.getByRole("button", { name: "Logg inn" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Nettside for Kode AS" })).toBeVisible();
  });

  test("with the link from the email, which only logs in after the button is pressed", async ({ page, request }) => {
    const user = await createClientUser("Lenke AS");
    await requestLogin(page, user.email);
    const { link } = await readLoginEmail(user.email);

    // A link scanner only GETs the page; that must not use up the token.
    expect((await request.get(link)).ok()).toBe(true);

    await page.context().clearCookies();
    await page.goto(link);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Nettside for Lenke AS" })).toBeVisible();
  });

  test("a wrong code shows an error tied to the field", async ({ page }) => {
    const user = await createClientUser("Feil AS");
    await requestLogin(page, user.email);

    const field = page.getByLabel("Sekssifret kode");
    await field.fill("000000");
    await page.getByRole("button", { name: "Logg inn" }).click();

    await expect(page.getByText("Koden stemmer ikke")).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
  });

  test("an unknown email gets the same response as a known one", async ({ page }) => {
    await requestLogin(page, "finnes-ikke@e2e.test");
    await expect(page.getByText("Hvis finnes-ikke@e2e.test har tilgang")).toBeVisible();
  });

  test("logged-out visitors are sent to login and returned afterwards", async ({ page }) => {
    await page.goto("/studio");
    await expect(page).toHaveURL(/\/logg-inn\?next=%2Fstudio$/);
  });

  test("a client cannot open the studio", async ({ page }) => {
    const user = await createClientUser("Nysgjerrig AS");
    await requestLogin(page, user.email);
    const { code } = await readLoginEmail(user.email);
    await page.getByLabel("Sekssifret kode").fill(code);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Nettside for Nysgjerrig AS" })).toBeVisible();

    await page.goto("/studio");
    await expect(page).toHaveURL(new RegExp(`/p/${user.projectId}$`));
  });
});

// Waits for a fresh 30-second TOTP window, so a code is never reused.
async function freshTotp(secret: string): Promise<string> {
  const window = Math.floor(Date.now() / 30_000);
  while (Math.floor(Date.now() / 30_000) === window) await new Promise((r) => setTimeout(r, 250));
  return totp(secret);
}

async function loginWithCode(page: Page, email: string) {
  const since = new Date();
  await requestLogin(page, email);
  const { code } = await readLoginEmail(email, since);
  await page.getByLabel("Sekssifret kode").fill(code);
  await page.getByRole("button", { name: "Logg inn" }).click();
}

test("admin sets up TOTP on first login, and needs it on the next", async ({ page }) => {
  test.setTimeout(180_000);
  const admin = await createAdminUser();

  await loginWithCode(page, admin.email);
  await expect(page.getByRole("heading", { name: "Sikkerhet" })).toBeVisible();

  await page.getByLabel("Navn på enheten").fill("Testtelefon");
  await page.getByRole("button", { name: "Start oppsett" }).click();
  await expect(page.getByRole("img", { name: /QR-kode/ })).toBeVisible();
  const secret = (await page.getByText(/^[A-Z2-7]{16,}$/).textContent())!.trim();

  await page.getByLabel("Kode fra autentiseringsappen").fill(totp(secret));
  await page.getByRole("button", { name: "Bekreft og aktiver" }).click();
  await expect(page.getByRole("heading", { name: "Oversikt" })).toBeVisible();

  await logOut(page);
  await expect(page.getByRole("heading", { name: "Logg inn" })).toBeVisible();

  // Supabase sends at most one login email per address per interval (5 s locally).
  await page.waitForTimeout(6_000);

  await loginWithCode(page, admin.email);
  await expect(page.getByRole("heading", { name: "Bekreft at det er deg" })).toBeVisible();

  // Without TOTP, the studio is out of reach.
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/studio\/mfa/);

  await page.getByLabel("Kode fra autentiseringsappen").fill(await freshTotp(secret));
  await page.getByRole("button", { name: "Bekreft" }).click();
  await expect(page.getByRole("heading", { name: "Oversikt" })).toBeVisible();
});
