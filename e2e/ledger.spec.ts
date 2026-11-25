import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("records an expense from the gross amount with a PDF receipt, then exports CSV", async ({ page }) => {
  await login(page);
  await page.goto("/ledger/new");

  const desc = `Compra teste ${Date.now()}`;
  await page.locator("#description").fill(desc);
  await page.locator("#categoryId").selectOption({ label: "Marketing" });
  await page.locator("#amount").fill("123");
  await page.locator("#vatRateBp").fill("23");
  // 123,00 € gross at 23 % → 100,00 € net + 23,00 € VAT
  await expect(page.getByText(/100,00\s€/)).toBeVisible();
  await page.locator("#supplierId").selectOption({ label: "EmbalaTudo" });
  await page.locator("#files").setInputFiles({ name: "recibo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await page.getByRole("button", { name: "Registar movimento" }).click();

  await expect(page).toHaveURL(/\/ledger$/);
  await page.locator("#f-q").fill(desc);
  await expect(page).toHaveURL(/q=Compra/);
  await page.getByRole("link", { name: desc }).click();
  await expect(page.getByRole("heading", { name: desc })).toBeVisible();
  await expect(page.getByText(/^23,00\s€$/)).toBeVisible();

  const [file] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: /recibo\.pdf/ }).click()]);
  await file.waitForLoadState();

  await page.goto("/ledger");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Exportar CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^movimentos_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
});

test("shows the year view with monthly totals", async ({ page }) => {
  await login(page);
  await page.goto("/ledger?view=year");
  await expect(page.getByRole("table", { name: /Resumo mensal/ })).toBeVisible();
});
