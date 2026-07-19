import { expect, test, type Locator, type Page } from "@playwright/test";

const STORAGE_KEY = "poseidon-sistema-gestion-v2";
const OPERATING_DATE = "2026-07-11";

const numericText = async (cell: Locator) =>
  Number((await cell.textContent())?.replace(/[^0-9-]/g, "") ?? 0);

const numericInputValue = async (input: Locator) =>
  Number((await input.inputValue()).replace(/[^0-9-]/g, "") || 0);

const numericValueFromText = (value: string | null) =>
  Number((value ?? "").replace(/[^0-9-]/g, "") || 0);

async function loginAsCashier(page: Page) {
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption("user-cajero1");
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Panel del cajero" })).toBeVisible();
}

async function openCash(page: Page, operatingDate = OPERATING_DATE) {
  if (!/\/panel$/.test(page.url())) {
    await page.goto("/panel");
  }
  await page.getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page).toHaveURL(/\/caja\/abrir$/);
  await expect(page.getByRole("heading", { name: "Nueva caja diaria" })).toBeVisible();
  await page.getByLabel("Fecha operativa").fill(operatingDate);
  await page.locator("form.open-cash-form").getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page.getByText("Caja abierta correctamente.")).toBeVisible();
}

async function waitForOpenBalanceReadingsSaved(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate((storageKey) => {
          const raw = localStorage.getItem(storageKey);
          if (!raw) return false;
          const snapshot = JSON.parse(raw);
          const openBalance = snapshot.data.balances.find((balance: { status: string }) => balance.status === "EN_PROCESO");
          if (!openBalance) return false;
          return snapshot.data.readings
            .filter((reading: { balanceId: string }) => reading.balanceId === openBalance.id)
            .every((reading: { status: string }) => reading.status !== "PENDIENTE");
        }, STORAGE_KEY),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), STORAGE_KEY);
  await page.reload();
});

test("abre, opera y cierra una caja conservando la recaudacion", async ({ page }) => {
  await loginAsCashier(page);
  await expect(page).toHaveURL(/\/panel$/);
  await openCash(page);

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
  await waitForOpenBalanceReadingsSaved(page);
  await page.getByRole("button", { name: "Volver al panel" }).click();
  await expect(page.getByText("3/3 recaudadas - 0 pendientes")).toBeVisible();
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

test("bloquea un cierre con efectivo negativo y permite cubrir Caja desde Principal", async ({ page, context }) => {
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
  await waitForOpenBalanceReadingsSaved(page);

  await page.goto("/caja/cerrar");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("el efectivo esperado es -$ 24.000");
  await expect(page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true })).toBeDisabled();

  const managerPage = await context.newPage();
  await managerPage.goto("/");
  await managerPage.getByRole("button", { name: "Ingresar", exact: true }).click();
  await managerPage.getByLabel("Entrar como").selectOption("user-encargado");
  await managerPage.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await managerPage.goto("/cuentas-corrientes");
  await managerPage.getByRole("button", { name: "Movimiento de socio", exact: true }).click();
  const partnerModal = managerPage.getByRole("dialog", { name: "Aporte o retiro de socio" });
  await partnerModal.locator('select[name="partner"]').selectOption("MATHIAS");
  await partnerModal.locator('select[name="type"]').selectOption("APORTE_SOCIO");
  await partnerModal.locator('select[name="medium"]').selectOption("EFECTIVO");
  await partnerModal.locator('input[name="amount"]').fill("24000");
  await partnerModal.locator('input[name="note"]').fill("Fondos reales para cubrir la caja");
  await partnerModal.getByRole("button", { name: "Registrar movimiento", exact: true }).click();
  await expect(managerPage.getByText("Aporte de socio registrado.")).toBeVisible();

  await expect
    .poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey)?.includes("Fondos reales para cubrir la caja") ?? false, STORAGE_KEY))
    .toBe(true);
  await page.reload();

  await page.getByRole("button", { name: "Mover fondos", exact: true }).click();
  await expect(page).toHaveURL(/\/caja\/fondos$/);
  const createRow = page.locator("tr.create-row");
  await createRow.locator('select[name="type"]').selectOption("APORTE_CAJA");
  await createRow.locator('select[name="medium"]').selectOption("EFECTIVO");
  await createRow.locator('input[name="amount"]').fill("24000");
  await createRow.locator('input[name="note"]').fill("Traspaso para cubrir resultado negativo de maquinas");
  await createRow.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Fondos aportados a Caja.")).toBeVisible();

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

test("bloquea una caja desincronizada y no ofrece un aporte como reparacion", async ({ page }) => {
  await loginAsCashier(page);
  await openCash(page);
  await page.waitForFunction((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const snapshot = JSON.parse(raw);
    return snapshot.data.balances.some((balance: { status: string }) => balance.status === "EN_PROCESO");
  }, STORAGE_KEY);

  await page.evaluate((storageKey) => {
    const snapshot = JSON.parse(localStorage.getItem(storageKey)!);
    const balance = snapshot.data.balances.find((item: { status: string }) => item.status === "EN_PROCESO");
    snapshot.data.accountMovements.unshift({
      id: "account-movement-e2e-cash-mismatch",
      accountId: `account-local-${balance.localId}-efectivo`,
      localId: balance.localId,
      balanceId: balance.id,
      sourceType: "MIGRACION",
      sourceId: "e2e-cash-mismatch",
      direction: "SALIDA",
      concept: "INCONSISTENCIA_TECNICA",
      amount: 14_000,
      currency: "UYU",
      detail: "Desacople controlado para E2E",
      status: "ACTIVO",
      userId: "system",
      createdAt: "2026-07-11T18:00:00.000Z",
    });
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole("alert")).toContainText("Diferencia tecnica");
  await expect(page.getByText("No conciliado", { exact: true })).toBeVisible();
  await page.goto("/caja/cerrar");
  await expect(
    page.getByRole("alert").filter({ hasText: "La caja no esta conciliada" }),
  ).toContainText("un traspaso comun no corrige este desacople");
  await expect(page.getByRole("button", { name: "Mover fondos", exact: true })).toHaveCount(0);
  await expect(page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true })).toBeDisabled();
});

test("preserva formularios rechazados, muestra Caja / Efectivo y conserva gastos anulados visibles", async ({ page }) => {
  await loginAsCashier(page);
  await openCash(page, "2026-07-12");

  await page.getByRole("button", { name: /Gastos/i }).click();
  await expect(page).toHaveURL(/\/caja\/gastos$/);
  await expect(page.getByText("Caja / Efectivo actual")).toBeVisible();
  await expect(page.getByText("Toda salida de gastos sale de Caja / Efectivo.")).toBeVisible();

  const availableCash = numericValueFromText(await page.locator(".cash-availability-notice strong").textContent());
  const descriptionInput = page.locator('input[name="description"]');
  const amountInput = page.locator('input[name="amount"]');
  await descriptionInput.fill("Gasto UI preservado");
  await amountInput.fill(String(availableCash + 1));
  await page.getByRole("button", { name: "Agregar", exact: true }).click();

  await expect(page.getByText("No hay fondos suficientes en Caja / Efectivo")).toBeVisible();
  await expect(descriptionInput).toHaveValue("Gasto UI preservado");
  await expect.poll(() => numericInputValue(amountInput)).toBe(availableCash + 1);

  await amountInput.fill("100");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Gasto guardado.")).toBeVisible();

  const expenseRow = page.locator(".movement-data-table tbody tr").filter({ hasText: "Gasto UI preservado" }).first();
  await expect(expenseRow).toContainText("ACTIVO");
  page.once("dialog", (dialog) => dialog.accept());
  await expenseRow.getByRole("button", { name: "Anular", exact: true }).click();
  await expect(page.getByText("Gasto anulado.")).toBeVisible();
  await expect(expenseRow).toContainText("ANULADO");
  await expect(expenseRow.getByRole("button", { name: "Anular", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Volver al panel", exact: true }).click();
  await page.getByRole("button", { name: /Transferencias/i }).click();
  await expect(page.getByText("Caja / Efectivo actual")).toBeVisible();
  await page.getByRole("button", { name: "Volver al panel", exact: true }).click();

  await page.getByRole("button", { name: /Regalos/i }).click();
  await expect(page.getByText("Caja / Efectivo actual")).toBeVisible();
  await page.getByRole("button", { name: "Volver al panel", exact: true }).click();

  await page.getByRole("button", { name: /Salarios/i }).click();
  await expect(page.getByText("Caja / Efectivo actual")).toBeVisible();
  await expect(page.getByText("Este pago sale de Caja / Efectivo.")).toBeVisible();
  await page.getByRole("button", { name: "Volver al panel", exact: true }).click();

  await page.getByRole("button", { name: /Principal a Caja/i }).click();
  await expect(page.getByText("Caja / Efectivo actual")).toBeVisible();
});

test("mantiene scroll interno en resumen de cajas y bloquea el cierre con maquinas pendientes", async ({ page }) => {
  await loginAsCashier(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recaudaciones");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ innerWidth: 390, scrollWidth: 390 });

  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator(".recent-cashes-panel .table-wrap")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ innerWidth: 1366, scrollWidth: 1366 });

  await page.goto("/panel");
  await openCash(page, "2026-07-13");
  await page.getByRole("main").getByRole("button", { name: "Cerrar caja", exact: true }).click();
  await expect(page).toHaveURL(/\/caja\/cerrar$/);
  await expect(page.getByText("Hay 3 maquinas pendientes sin observacion. Para cerrar, cargalas o deja una observacion.")).toBeVisible();
  await expect(page.locator("form.close-form").getByRole("button", { name: "Cerrar caja", exact: true })).toBeDisabled();
});
