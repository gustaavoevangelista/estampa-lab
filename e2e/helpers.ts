import { expect, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "admin@estampalab.pt";
export const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Palavra-passe").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/", { timeout: 20_000 }); // first hit compiles the dashboard
}
