// Milestone 8: export and permanent delete of a client.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { createAdminWithTotp, createClientUser, loginAsAdmin, loginAsClient, requestLogin, service } from "./helpers";

test("export everything about a client, then delete it for good", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Studio feature, covered on desktop.");
  test.setTimeout(120_000);

  const user = await createClientUser(`Slettes AS ${randomUUID().slice(0, 4)}`);
  const { data: project } = await service.from("projects").select("client_id, clients(name)").eq("id", user.projectId).single();
  const clientId = project!.client_id;
  const clientName = project!.clients!.name;
  const path = `${clientId}/${user.projectId}/${randomUUID()}-logo.png`;
  await service.storage.from("project-files").upload(path, Buffer.from("89504e470d0a1a0a", "hex"), { contentType: "image/png" });
  await service.from("files").insert({ client_id: clientId, project_id: user.projectId, storage_path: path, name: "logo.png", size_bytes: 8, mime_type: "image/png", uploaded_by: user.userId });

  // Clients can't export; anonymous visitors are sent to login.
  const clientPage = await (await browser.newContext({ baseURL: testInfo.project.use.baseURL })).newPage();
  await loginAsClient(clientPage, user.email);
  expect((await clientPage.request.get(`/api/export/${clientId}`)).status()).toBe(403);
  const anon = await (await browser.newContext({ baseURL: testInfo.project.use.baseURL })).newPage();
  await anon.goto(`/api/export/${clientId}`);
  await expect(anon).toHaveURL(/\/logg-inn/);

  const admin = await createAdminWithTotp();
  await loginAsAdmin(page, admin);
  await page.goto(`/studio/clients/${clientId}`);

  // Export: a zip with data.json and the files.
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Last ned zip-fil" }).click();
  const file = await (await download).path();
  const zip = unzipSync(new Uint8Array(await (await import("node:fs/promises")).readFile(file)));
  const data = JSON.parse(strFromU8(zip["data.json"])) as { client: { name: string }; members: { email: string }[]; projects: unknown[]; project_steps: unknown[] };
  expect(data.client.name).toBe(clientName);
  expect(data.members.map((m) => m.email)).toEqual([user.email]);
  expect(data.projects).toHaveLength(1);
  expect(data.project_steps.length).toBeGreaterThan(20);
  expect(Object.keys(zip).some((k) => k.startsWith("filer/") && k.endsWith("logo.png"))).toBe(true);

  // Delete: needs the exact name.
  const privacy = page.getByRole("region", { name: "Personvern" });
  await privacy.getByRole("textbox", { name: /for å bekrefte/ }).fill("feil navn");
  await privacy.getByRole("button", { name: "Slett permanent" }).click();
  await expect(privacy.getByText("Navnet stemmer ikke.", { exact: false })).toBeVisible();

  await privacy.getByRole("textbox", { name: /for å bekrefte/ }).fill(clientName);
  await privacy.getByRole("button", { name: "Slett permanent" }).click();
  await expect(page.getByText(`${clientName} er slettet.`)).toBeVisible();

  expect((await service.from("clients").select("id").eq("id", clientId)).data).toEqual([]);
  expect((await service.storage.from("project-files").download(path)).error).not.toBeNull();
  expect((await service.auth.admin.getUserById(user.userId)).data.user).toBeNull();

  // The deleted user's session no longer reaches anything.
  await clientPage.goto(`/p/${user.projectId}`);
  await expect(clientPage.getByRole("heading", { name: /Logg inn|Fant ikke siden/ })).toBeVisible();
  await requestLogin(anon, user.email);
});
