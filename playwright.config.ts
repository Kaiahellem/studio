import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Same local Supabase keys as the app and the RLS tests.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Own port and build, so tests never hit a `pnpm dev` server you have running on 3000.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    locale: "nb-NO",
    timezoneId: "Europe/Oslo",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `${BASE_URL}/logg-inn`,
    reuseExistingServer: false,
    timeout: 240_000,
    // Login links in emails must point at this server.
    // Website analysis: fake PageSpeed and allow the local fixture site (ignored unless localhost).
    env: { NEXT_PUBLIC_SITE_URL: BASE_URL, ANALYSIS_FAKES: "1" },
  },
});
