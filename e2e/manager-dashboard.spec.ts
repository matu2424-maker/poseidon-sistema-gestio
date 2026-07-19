import { expect, test, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon } from "./support/poseidon";

async function openManagerPanel(page: Page) {
  await resetPoseidon(page);
  await loginPoseidon(page, "user-encargado");
  await expect(page.getByRole("heading", { name: "Panel del encargado", exact: true })).toBeVisible();
}

test("resume el control financiero y navega sin accesos duplicados", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openManagerPanel(page);

  await expect(page.getByText("Requiere atencion", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver diferencias", exact: true })).toContainText("1 pendiente");
  const economicTotals = page.locator(".manager-economic-totals");
  await expect(economicTotals).toContainText("$ 35.000");
  await expect(economicTotals).toContainText("$ 23.000");
  await expect(economicTotals).toContainText("$ 12.000");

  const financialButtons = page.locator(".manager-summary-surface").getByRole("button");
  await expect(financialButtons).toHaveCount(3);
  const shortcutButtons = page.locator(".manager-shortcuts").getByRole("button");
  await expect(shortcutButtons).toHaveCount(6);
  await expect(page.locator(".manager-shortcuts").getByRole("button", { name: "Control de gastos", exact: true })).toHaveCount(1);

  const activityTable = page.locator(".manager-activity-table");
  await expect(activityTable.locator("thead button")).toHaveCount(6);
  await expect(activityTable.locator("thead th[aria-sort]")).toHaveCount(6);
  await activityTable.getByRole("button", { name: "Cuenta", exact: true }).click();
  await expect(activityTable.locator("thead th:nth-child(3)")).toHaveAttribute("aria-sort", "ascending");

  const pageOverflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(pageOverflows).toBe(false);

  await page.getByRole("button", { name: "Ver diferencias", exact: true }).click();
  await expect(page).toHaveURL(/\/diferencias$/);
  await page.goto("/panel");
  await page.getByRole("button", { name: "Abrir cuentas corrientes de efectivo", exact: true }).click();
  await expect(page).toHaveURL(/\/cuentas-corrientes$/);
});

test("mantiene la jerarquia del panel en viewport movil", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await openManagerPanel(page);

  await expect(page.locator(".manager-summary-item")).toHaveCount(3);
  await expect(page.locator(".manager-economic-totals > div")).toHaveCount(3);
  await expect(page.locator(".manager-shortcuts").getByRole("button")).toHaveCount(6);
  const pageOverflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(pageOverflows).toBe(false);
  expect(runtimeErrors).toEqual([]);
});
