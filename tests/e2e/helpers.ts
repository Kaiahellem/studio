import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/db/types";
import { totp } from "../totp";

export const service = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MAILPIT = "http://127.0.0.1:54324";

// Fresh users per run, so Supabase's per-email rate limit never interferes.
export async function createClientUser(clientName: string) {
  const email = `e2e-${randomUUID().slice(0, 8)}@e2e.test`;
  const { data, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const client = await service.from("clients").insert({ name: clientName }).select("id").single();
  if (client.error) throw client.error;
  const member = await service.from("client_members").insert({ client_id: client.data.id, user_id: data.user.id });
  if (member.error) throw member.error;
  const template = await service.from("process_templates").select("id").eq("key", "website").single();
  if (template.error) throw template.error;
  const project = await service.rpc("create_project_from_template", {
    p_client_id: client.data.id,
    p_template_id: template.data.id,
    p_name: `Nettside for ${clientName}`,
  });
  if (project.error) throw project.error;
  return { email, userId: data.user.id, projectId: project.data as string };
}

export async function createAdminUser() {
  const email = `e2e-admin-${randomUUID().slice(0, 8)}@e2e.test`;
  const { data, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const admin = await service.from("admins").insert({ user_id: data.user.id });
  if (admin.error) throw admin.error;
  return { email };
}

type MailpitMessage = { ID: string; Created: string };

// Waits for a login email in Mailpit sent after `since`, and returns the code and the link from it.
export async function readLoginEmail(email: string, since = new Date(0)): Promise<{ code: string; link: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await search.json()) as { messages: MailpitMessage[] };
    const fresh = (messages ?? []).filter((m) => new Date(m.Created) > since);
    if (fresh.length) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh[0].ID}`)).json()) as { HTML: string };
      const code = message.HTML.match(/>\s*(\d{6})\s*</)?.[1];
      const href = message.HTML.match(/href="([^"]*token_hash=[^"]*)"/)?.[1];
      if (!code || !href) throw new Error("Login email is missing the code or the link");
      return { code, link: href.replaceAll("&amp;", "&") };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No login email for ${email}`);
}

export async function requestLogin(page: Page, email: string, path = "/logg-inn") {
  await page.goto(path);
  await page.getByLabel("E-postadresse").fill(email);
  await page.getByRole("button", { name: "Send meg innloggingslenke" }).click();
  await expect(page.getByRole("heading", { name: "Sjekk e-posten din" })).toBeVisible();
}

// An admin who already has TOTP set up (via the API), so tests can go straight to the studio.
export async function createAdminWithTotp(): Promise<{ email: string; secret: string }> {
  const { email } = await createAdminUser();
  const link = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const user = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const verified = await user.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
  if (verified.error) throw verified.error;
  const factor = await user.auth.mfa.enroll({ factorType: "totp", friendlyName: "e2e" });
  if (factor.error) throw factor.error;
  const ok = await user.auth.mfa.challengeAndVerify({ factorId: factor.data.id, code: totp(factor.data.totp.secret) });
  if (ok.error) throw ok.error;
  // generateLink counts towards the per-email interval (5 s locally) for the UI login that follows.
  await new Promise((r) => setTimeout(r, 6_000));
  return { email, secret: factor.data.totp.secret };
}

// Logs in through the UI: email code, then TOTP.
export async function loginAsAdmin(page: Page, admin: { email: string; secret: string }) {
  const since = new Date();
  await requestLogin(page, admin.email);
  const { code } = await readLoginEmail(admin.email, since);
  await page.getByLabel("Sekssifret kode").fill(code);
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page.getByRole("heading", { name: "Bekreft at det er deg" })).toBeVisible();
  // The API enrollment used the current window's code; wait for a fresh one.
  const window = Math.floor(Date.now() / 30_000);
  while (Math.floor(Date.now() / 30_000) === window) await new Promise((r) => setTimeout(r, 250));
  await page.getByLabel("Kode fra autentiseringsappen").fill(totp(admin.secret));
  await page.getByRole("button", { name: "Bekreft" }).click();
  await expect(page.getByRole("heading", { name: "Oversikt" })).toBeVisible();
}

// Completes every step in phases before `position`, as the studio would.
export async function advanceToPhase(projectId: string, position: number) {
  for (let guard = 0; guard < 100; guard++) {
    const { data, error } = await service
      .from("project_steps")
      .select("id, project_phases!inner(position)")
      .eq("project_id", projectId)
      .eq("status", "active")
      .lt("project_phases.position", position)
      .limit(1);
    if (error) throw error;
    if (!data.length) return;
    const done = await service.rpc("complete_step", { p_step_id: data[0].id });
    if (done.error) throw done.error;
  }
  throw new Error("advanceToPhase did not finish");
}

export async function loginAsClient(page: Page, email: string) {
  const since = new Date();
  await requestLogin(page, email);
  const { code } = await readLoginEmail(email, since);
  await page.getByRole("textbox", { name: "Sekssifret kode" }).fill(code);
  await page.getByRole("button", { name: "Logg inn" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/logg-inn"));
}

export async function stepIdByTitle(projectId: string, title: string): Promise<string> {
  const { data, error } = await service.from("project_steps").select("id").eq("project_id", projectId).eq("title", title).single();
  if (error) throw error;
  return data.id;
}
