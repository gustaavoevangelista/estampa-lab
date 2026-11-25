import { expect, test } from "@playwright/test";

import { login } from "./helpers";

const nb = (s: string) => new RegExp(s.replace(/ /g, "\\s"));

test("creates a product, sees live margin, uses what-if pricing", async ({ page }) => {
  await login(page);
  await page.goto("/products/new");

  const sku = `E2E-${Date.now()}`;
  await page.locator("#name").fill("Caneca teste e2e");
  await page.locator("#sku").fill(sku);
  await page.getByLabel("Categoria").selectOption({ label: "Canecas" });
  await page.getByLabel("Preço de venda (€ s/ IVA)").fill("10");

  // Default lines: blank, print, packaging, labour (5 min at 15 €/h = 1,25 €)
  await page.locator("#costItems\\.0\\.unitCostNetCents").fill("2");
  await page.locator("#costItems\\.1\\.unitCostNetCents").fill("1,50");
  await page.locator("#costItems\\.2\\.unitCostNetCents").fill("0,25");

  const summary = page.getByRole("complementary", { name: "Resumo de custos e margem" });
  await expect(summary.getByText(nb("5,00 €")).first()).toBeVisible(); // unit cost
  await expect(summary.getByText(nb("50 %")).first()).toBeVisible(); // margin

  await summary.getByLabel("Margem pretendida (%)").fill("60");
  await summary.getByRole("button", { name: "Usar este preço" }).click();
  await expect(page.getByLabel("Preço de venda (€ s/ IVA)")).toHaveValue("12,50");

  await page.getByRole("button", { name: "Adicionar escalão" }).click();
  await page.locator("#priceTiers\\.0\\.maxQty").fill("9");
  await page.locator("#priceTiers\\.0\\.unitPriceNetCents").fill("12,50");
  await page.getByRole("button", { name: "Adicionar escalão" }).click();
  await page.locator("#priceTiers\\.1\\.unitPriceNetCents").fill("5,50");

  await page.getByRole("button", { name: "Criar produto" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Caneca teste e2e" })).toBeVisible({ timeout: 20_000 }); // dev server compiles the page on first hit
  await expect(page.getByText("Margem baixa")).toBeVisible(); // 10+ tier is at 9 %
  await expect(page.getByRole("cell", { name: "10+" })).toBeVisible();
});

test("blocks overlapping tiers", async ({ page }) => {
  await login(page);
  await page.goto("/products/new");
  await page.getByRole("button", { name: "Adicionar escalão" }).click();
  await page.getByRole("button", { name: "Adicionar escalão" }).click();
  await page.locator("#priceTiers\\.0\\.maxQty").fill("10");
  await page.locator("#priceTiers\\.1\\.minQty").fill("10");
  await page.getByRole("button", { name: "Criar produto" }).click();
  await expect(page.getByText(/sobrepõem-se|não tem máximo/)).toBeVisible();
});
