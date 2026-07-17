import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "poseidon-sistema-gestion-v2";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    localStorage.removeItem(storageKey);
    sessionStorage.clear();
  }, STORAGE_KEY);
  await page.reload();
}

async function login(page: Page, userId: string) {
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption(userId);
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("encargado registra un gasto en la caja activa y el cajero recibe el movimiento", async ({ page, context }) => {
  await resetDemo(page);
  await login(page, "user-cajero1");
  await expect
    .poll(() => page.evaluate((storageKey) => Boolean(localStorage.getItem(storageKey)), STORAGE_KEY))
    .toBe(true);

  const managerPage = await context.newPage();
  await managerPage.goto("/");
  await login(managerPage, "user-encargado");
  await expect(managerPage.getByRole("button", { name: "Registrar gasto", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Abrir caja", exact: true }).click();
  await page.getByLabel("Fecha operativa").fill("2026-07-17");
  await page.locator("form.open-cash-form").getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page.getByText("Caja abierta correctamente.")).toBeVisible();

  const registerExpense = managerPage.getByRole("button", { name: "Registrar gasto", exact: true });
  await expect(registerExpense).toBeEnabled();
  await registerExpense.click();
  await expect(managerPage).toHaveURL(/\/caja\/gastos$/);
  await expect(managerPage.getByLabel("Contexto de la caja activa")).toContainText("Encargado");

  const createRow = managerPage.locator("tr.create-row");
  await createRow.locator('input[name="description"]').fill("Compra operativa del encargado");
  await createRow.locator('input[name="amount"]').fill("1000");
  await createRow.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(managerPage.getByText("Gasto guardado.")).toBeVisible();
  await expect(managerPage.getByText("Compra operativa del encargado", { exact: true })).toBeVisible();

  await expect
    .poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey)?.includes("Compra operativa del encargado") ?? false, STORAGE_KEY))
    .toBe(true);
  await page.goto("/caja/gastos");
  await expect(page.getByText("Compra operativa del encargado", { exact: true })).toBeVisible();
  await page.goto("/caja/cerrar");
  const managerActivity = page.getByRole("region", { name: "Movimientos del encargado" });
  await expect(managerActivity).toContainText("Compra operativa del encargado");
  await expect(managerActivity).toContainText("Encargado");
  await expect(managerActivity.getByText("-$ 1.000", { exact: true })).toBeVisible();

  const audit = await managerPage.evaluate((storageKey) => {
    const snapshot = JSON.parse(localStorage.getItem(storageKey)!);
    return snapshot.data.audit.find((event: { action: string }) => event.action === "Crear gasto");
  }, STORAGE_KEY);
  expect(audit).toMatchObject({
    userId: "user-encargado",
    actualRole: "ENCARGADO",
    actorRole: "ENCARGADO",
  });
});
