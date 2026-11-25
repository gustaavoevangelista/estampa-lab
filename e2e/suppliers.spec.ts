import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("creates a supplier with validation, finds it and adds a price", async ({ page }) => {
  await login(page);
  await page.goto("/suppliers/new");

  const name = `Fornecedor Teste ${Date.now()}`;
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Categoria").selectOption({ label: "Embalagem" });
  await page.getByLabel("NIF / NIPC").fill("123456780"); // wrong check digit
  await page.getByRole("button", { name: "Criar fornecedor" }).click();
  await expect(page.getByText("NIF inválido (verifique os 9 dígitos).")).toBeVisible();

  await page.getByLabel("NIF / NIPC").fill("123456789");
  await page.getByLabel("Encomenda mínima (€, s/ IVA)").fill("1 250,50");
  await page.getByRole("button", { name: "Criar fornecedor" }).click();

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(/1\s250,50\s€ s\/ IVA/)).toBeVisible();

  await page.getByLabel("Artigo").fill("Caixa 30x20x10");
  await page.getByLabel("Custo (€ s/ IVA)").fill("0,85");
  await page.getByRole("button", { name: "Registar preço" }).click();
  await expect(page.getByRole("cell", { name: /Caixa 30x20x10/ })).toBeVisible();

  await page.goto("/suppliers");
  await page.getByLabel("Pesquisar").fill(name);
  await expect(page.getByRole("link", { name })).toBeVisible();
});
