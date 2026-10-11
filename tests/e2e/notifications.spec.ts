// Milestone 7: notifications and reminders. Emails are read from Mailpit.
import { devices, expect, test } from "@playwright/test";
import { advanceToPhase, countEmails, createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, openAddRow, service, stepIdByTitle, waitForEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test("turns, approvals, comments and change requests notify the right side", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Notifications don't depend on the device.");
  test.setTimeout(180_000);

  const user = await createClientUser("Varsel AS");
  const admin = await createAdminWithTotp();
  const base = testInfo.project.use.baseURL!;
  const studio = await (await browser.newContext({ ...devices["Desktop Chrome"], baseURL: base })).newPage();
  const client = await (await browser.newContext({ ...devices["Pixel 7"], baseURL: base })).newPage();
  await loginAsAdmin(studio, admin);
  await loginAsClient(client, user.email);

  // The studio shares a version → the client gets "Din tur" with a direct link.
  let since = new Date();
  const proposal = await stepIdByTitle(user.projectId, "Godta tilbudet");
  await studio.goto(`/studio/projects/${user.projectId}/steps/${proposal}`);
  await openAddRow(studio, "Del ny versjon med kunden");
  await studio.getByRole("textbox", { name: "Melding til kunden" }).fill("Tilbudet er klart.");
  await studio.getByRole("button", { name: "Del ny versjon med kunden" }).click();
  const turn = await waitForEmail(user.email, "Din tur: Godta tilbudet", since);
  expect(turn.Text).toContain("Runde 1 er klar til gjennomgang.");
  expect(turn.Text).toContain(`/p/${user.projectId}/steg/${proposal}`);

  // The client approves → the studio is told.
  since = new Date();
  await client.goto(`/p/${user.projectId}/steg/${proposal}`);
  await client.getByRole("button", { name: "Godkjenn" }).click();
  await client.getByRole("dialog").getByRole("button", { name: "Godkjenn" }).click();
  await waitForEmail(admin.email, "Varsel AS godkjente «Godta tilbudet»", since);
  // …and the next client step became theirs.
  await waitForEmail(user.email, "Din tur: Signer avtalen", since);

  // A whole parallel phase opening is one email, not five.
  await advanceToPhase(user.projectId, 2);
  await service.rpc("complete_step", { p_step_id: await stepIdByTitle(user.projectId, "Oppstartsmøte") });
  since = new Date();
  await studio.goto(`/studio/projects/${user.projectId}/steps/${await stepIdByTitle(user.projectId, "Fyll ut oppstartsskjemaet")}`);
  await studio.getByRole("button", { name: "Hopp over" }).click();
  const content = await waitForEmail(user.email, "ting venter på deg", since);
  for (const title of ["Last opp logo", "Last opp tekster", "Last opp bilder", "Domene og tilganger"]) expect(content.Text).toContain(title);

  // A client comment reaches the studio; a reply reaches the client; internal notes reach nobody.
  const logo = await stepIdByTitle(user.projectId, "Last opp logo");
  since = new Date();
  await client.goto(`/p/${user.projectId}/steg/${logo}`);
  await client.getByRole("textbox", { name: "Skriv en kommentar" }).fill("Holder det med PNG?");
  await client.getByRole("button", { name: "Send" }).click();
  await waitForEmail(admin.email, "Ny kommentar fra Varsel AS på «Last opp logo»", since);

  since = new Date();
  await studio.goto(`/studio/projects/${user.projectId}/steps/${logo}`);
  await studio.getByRole("textbox", { name: "Skriv en kommentar" }).fill("Intern: be om SVG.");
  await studio.getByRole("checkbox", { name: /Intern kommentar/ }).check();
  await studio.getByRole("button", { name: "Send" }).click();
  await expect(studio.getByText("Intern: be om SVG.")).toBeVisible();
  await studio.getByRole("textbox", { name: "Skriv en kommentar" }).fill("PNG går fint!");
  await studio.getByRole("button", { name: "Send" }).click();
  const reply = await waitForEmail(user.email, "Nytt svar: Last opp logo", since);
  expect(reply.Text).not.toContain("Intern");
  expect(await countEmails(user.email, "Nytt svar", since)).toBe(1);

  // An urgent change request reaches the studio at once; a status change reaches the client.
  await service.from("projects").update({ live_url: "https://varsel.no" }).eq("id", user.projectId);
  since = new Date();
  await client.goto(`/p/${user.projectId}/endringer/ny`);
  await client.getByRole("textbox", { name: "Hva gjelder det?" }).fill("Skjemaet virker ikke");
  await client.getByRole("combobox", { name: "Hvor fort trengs det?" }).selectOption("urgent");
  await client.getByRole("button", { name: "Send inn" }).click();
  await waitForEmail(admin.email, "Haster: Varsel AS – «Skjemaet virker ikke»", since);
  const requestId = client.url().split("/").pop()!.split("?")[0];

  since = new Date();
  await studio.goto(`/studio/change-requests/${requestId}`);
  const triage = studio.getByRole("region", { name: "Behandling" });
  await triage.getByRole("combobox", { name: "Status" }).selectOption("in_progress");
  await triage.getByRole("button", { name: "Lagre" }).click();
  const status = await waitForEmail(user.email, "Endringsønsket «Skjemaet virker ikke» er oppdatert", since);
  expect(status.Text).toContain("Under arbeid");
});

test("daily job: reminders once a week, per-project switch, renewals and hours", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Notifications don't depend on the device.");
  test.setTimeout(120_000);
  const cron = (secret?: string) =>
    request.get("/api/cron/daily", secret ? { headers: { authorization: `Bearer ${secret}` } } : {});

  expect((await cron()).status()).toBe(401);
  expect((await cron("feil-hemmelighet-som-er-lang-nok")).status()).toBe(401);

  // A client step waiting for 6 days.
  const waiting = await createClientUser("Påminnelse AS");
  await advanceToPhase(waiting.projectId, 2);
  const meeting = await stepIdByTitle(waiting.projectId, "Oppstartsmøte");
  await service.rpc("complete_step", { p_step_id: meeting });
  const form = await stepIdByTitle(waiting.projectId, "Fyll ut oppstartsskjemaet");
  await service.from("project_steps").update({ activated_at: new Date(Date.now() - 6 * 86_400_000).toISOString() }).eq("id", form);

  // The same, but with reminders switched off.
  const quiet = await createClientUser("Stille AS");
  await advanceToPhase(quiet.projectId, 2);
  await service.rpc("complete_step", { p_step_id: await stepIdByTitle(quiet.projectId, "Oppstartsmøte") });
  await service.from("project_steps").update({ activated_at: new Date(Date.now() - 6 * 86_400_000).toISOString() }).eq("project_id", quiet.projectId).eq("status", "active");
  await service.from("projects").update({ reminders_enabled: false }).eq("id", quiet.projectId);

  // A domain renewing in 20 days, and an agreement above 80 %.
  const renew = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  await service.from("site_details").update({ domain_name: "paminnelse.no", domain_renewal_date: renew }).eq("project_id", waiting.projectId);
  const { data: project } = await service.from("projects").select("client_id").eq("id", waiting.projectId).single();
  const { data: plan } = await service.from("maintenance_plans").select("id").limit(1).single();
  await service.from("maintenance_agreements").insert({ client_id: project!.client_id, project_id: waiting.projectId, plan_id: plan!.id, start_date: "2020-01-01", status: "active", minutes_override: 60 });
  const { data: log } = await service.from("maintenance_log").insert({ client_id: project!.client_id, project_id: waiting.projectId, title: "Feilretting" }).select("id").single();
  await service.from("time_entries").insert({ maintenance_log_id: log!.id, minutes: 55 });

  const secret = process.env.CRON_SECRET!;
  const since = new Date();
  expect((await cron(secret)).ok()).toBe(true);

  const reminder = await waitForEmail(waiting.email, "Påminnelse: Fyll ut oppstartsskjemaet", since);
  expect(reminder.Text).toContain("har ventet på deg i 6 dager");
  const { data: admins } = await service.from("admins").select("user_id").limit(1);
  const adminEmail = (await service.auth.admin.getUserById(admins![0].user_id)).data.user!.email!;
  await waitForEmail(adminEmail, "Domenet paminnelse.no fornyes", since);
  await waitForEmail(adminEmail, "Påminnelse AS har brukt 55 min av 1 t denne måneden", since);

  // Running again the same day sends nothing new; the quiet project never gets one.
  expect((await cron(secret)).ok()).toBe(true);
  await new Promise((r) => setTimeout(r, 1500));
  expect(await countEmails(waiting.email, "Påminnelse", since)).toBe(1);
  expect(await countEmails(adminEmail, "Domenet paminnelse.no fornyes", since)).toBe(1);
  expect(await countEmails(adminEmail, "Påminnelse AS har brukt", since)).toBe(1);
  expect(await countEmails(quiet.email, "Påminnelse", since)).toBe(0);
});
