import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
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
