import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("dashboard shows KPIs, switches range and opens a chart table", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Receitas", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Este ano" }).click();
  await expect(page).toHaveURL(/range=ytd/);
  await page.getByRole("button", { name: "Ver dados em tabela" }).first().click();
  await expect(page.getByRole("table").first()).toBeVisible();
});
