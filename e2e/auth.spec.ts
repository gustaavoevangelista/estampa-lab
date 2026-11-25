import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("redirects anonymous users to the login page", async ({ page }) => {
  await page.goto("/suppliers");
  await expect(page).toHaveURL(/\/login/);
});

test("rejects wrong credentials with a pt-PT message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ninguem@example.com");
  await page.getByLabel("Palavra-passe").fill("errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Email ou palavra-passe incorretos.")).toBeVisible();
});

test("logs in, navigates and logs out", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Fornecedores" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fornecedores" })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
});
