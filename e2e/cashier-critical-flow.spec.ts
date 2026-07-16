import { expect, test, type Locator, type Page } from "@playwright/test";

const STORAGE_KEY = "poseidon-sistema-gestion-v2";
const OPERATING_DATE = "2026-07-11";

const numericText = async (cell: Locator) =>
  Number((await cell.textContent())?.replace(/[^0-9-]/g, "") ?? 0);

const numericInputValue = async (input: Locator) =>
  Number((await input.inputValue()).replace(/[^0-9-]/g, "") || 0);

async function loginAsCashier(page: Page) {
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption("user-cajero1");
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Panel del cajero" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), STORAGE_KEY);
  await page.reload();
});

test("abre, opera y cierra una caja conservando la recaudacion", async ({ page }) => {
  await loginAsCashier(page);
  await expect(page).toHaveURL(/\/panel$/);

  await page.getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page).toHaveURL(/\/caja\/abrir$/);
  await expect(page.getByRole("heading", { name: "Nueva caja diaria" })).toBeVisible();
  await page.getByLabel("Fecha operativa").fill(OPERATING_DATE);
  await page.locator("form.open-cash-form").getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page.getByText("Caja abierta correctamente.")).toBeVisible();

  await page.getByRole("button", { name: /Resultado de maquinas/i }).click();
  await expect(page).toHaveURL(/\/caja\/contadores$/);
  await expect(page.getByRole("heading", { name: "Cargar contadores" })).toBeVisible();
  const counterRows = page.locator(".counters-page tbody tr");
  await expect(counterRows).toHaveCount(3);

  for (let index = 0; index < 3; index += 1) {
    const row = counterRows.nth(index);
    const previousIn = await numericText(row.locator("td").nth(3));
    const previousOut = await numericText(row.locator("td").nth(5));
    await row.locator("input").nth(0).fill(String(previousIn + 1_000));
    await row.locator("input").nth(1).fill(String(previousOut + 250));
    await row.locator("select").selectOption("CARGADA");
  }

  await page.getByRole("button", { name: "Guardar contadores" }).click();
  await expect(page.getByText("Contadores guardados.").first()).toBeVisible();
  await page.getByRole("button", { name: "Volver al panel" }).click();
  await page.getByRole("main").getByRole("button", { name: "Cerrar caja", exact: true }).click();
  await expect(page).toHaveURL(/\/caja\/cerrar$/);
  await expect(page.getByRole("heading", { name: "Control de cierre" })).toBeVisible();

  const expectedCash = await page.getByLabel("Efectivo esperado final").inputValue();
  const expectedBank = await page.getByLabel("Dinero en banco esperado final").inputValue();
  await page.getByLabel("Efectivo declarado final").fill(expectedCash);
  await page.getByLabel("Dinero banco declarado final").fill(expectedBank);
  await page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true }).click();

  await expect(page.getByText("Caja cerrada correctamente.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumen de cajas" })).toBeVisible();
  await expect(page).toHaveURL(/\/recaudaciones$/);
  await expect(page.locator(".recent-cash-table tbody")).toContainText(OPERATING_DATE);

  await page.reload();
  await expect(page).toHaveURL(/\/recaudaciones$/);
  await expect(page.getByRole("heading", { name: "Resumen de cajas" })).toBeVisible();
  await expect(page.locator(".recent-cash-table tbody")).toContainText(OPERATING_DATE);
});

test("bloquea un cierre con efectivo negativo y permite resolverlo con un aporte real", async ({ page }) => {
  await loginAsCashier(page);

  await page.getByRole("button", { name: "Abrir caja", exact: true }).click();
  const initialCash = await numericInputValue(page.getByLabel("Saldo inicial efectivo"));
  await page.getByLabel("Fecha operativa").fill(OPERATING_DATE);
  await page.locator("form.open-cash-form").getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page.getByText("Caja abierta correctamente.")).toBeVisible();

  await page.getByRole("button", { name: /Resultado de maquinas/i }).click();
  const counterRows = page.locator(".counters-page tbody tr");
  await expect(counterRows).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    const row = counterRows.nth(index);
    const previousIn = await numericText(row.locator("td").nth(3));
    const previousOut = await numericText(row.locator("td").nth(5));
    await row.locator("input").nth(0).fill(String(previousIn));
    await row.locator("input").nth(1).fill(String(previousOut + (index === 0 ? initialCash + 24_000 : 0)));
    await row.locator("select").selectOption("CARGADA");
  }
  await page.getByRole("button", { name: "Guardar contadores" }).click();
  await expect(page.getByText("Contadores guardados.").first()).toBeVisible();

  await page.goto("/caja/cerrar");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("el efectivo esperado es -$ 24.000");
  await expect(page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Registrar aporte", exact: true }).click();
  await expect(page).toHaveURL(/\/caja\/capital$/);
  const createRow = page.locator("tr.create-row");
  await createRow.locator('select[name="type"]').selectOption("APORTE");
  await createRow.locator('select[name="medium"]').selectOption("EFECTIVO");
  await createRow.locator('input[name="amount"]').fill("24000");
  await createRow.locator('input[name="note"]').fill("Cubre resultado negativo de maquinas");
  await createRow.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Aporte de capital registrado.")).toBeVisible();

  await page.goto("/caja/cerrar");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true })).toBeEnabled();
  const expectedCash = await page.getByLabel("Efectivo esperado final").inputValue();
  const expectedBank = await page.getByLabel("Dinero en banco esperado final").inputValue();
  await page.getByLabel("Efectivo declarado final").fill(expectedCash);
  await page.getByLabel("Dinero banco declarado final").fill(expectedBank);
  await page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true }).click();
  await expect(page.getByText("Caja cerrada correctamente.")).toBeVisible();
  await expect(page).toHaveURL(/\/recaudaciones$/);
});
