// A client can't reach another client's pages, even with the exact URLs.
import { expect, test } from "@playwright/test";
import { advanceToPhase, createClientUser, loginAsClient, service, stepIdByTitle } from "./helpers";

test("another client's project, step and change request are not found", async ({ page }) => {
  const mine = await createClientUser("Min AS");
  const theirs = await createClientUser("Deres AS");
  await advanceToPhase(theirs.projectId, 3);
  const { data: p } = await service.from("projects").select("client_id").eq("id", theirs.projectId).single();
  const { data: request } = await service
    .from("change_requests")
    .insert({ client_id: p!.client_id, project_id: theirs.projectId, title: "Hemmelig ønske" })
    .select("id")
    .single();
  const step = await stepIdByTitle(theirs.projectId, "Last opp logo");

  await loginAsClient(page, mine.email);
  for (const url of [
    `/p/${theirs.projectId}`,
    `/p/${theirs.projectId}/steg/${step}`,
    `/p/${theirs.projectId}/endringer/${request!.id}`,
    `/p/${theirs.projectId}/vedlikehold`,
    `/p/${theirs.projectId}/dokumenter`,
    `/p/${theirs.projectId}/filer`,
    `/p/${theirs.projectId}/overlevering`,
    `/p/${theirs.projectId}/endringer`,
    `/p/${theirs.projectId}/endringer/ny`,
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Fant ikke siden" }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Hemmelig ønske")).toHaveCount(0);
    await expect(page.getByText("Nettside for Deres AS")).toHaveCount(0);
  }
});
