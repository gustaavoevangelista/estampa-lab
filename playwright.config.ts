import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a real database seeded with `npm run db:seed`.
 * Credentials come from SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD in .env.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    trace: "off",
    // Optional: point at a preinstalled Chromium instead of `npx playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
