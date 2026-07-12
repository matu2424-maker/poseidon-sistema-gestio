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

test.beforeEach(async ({ page }) => {
  await resetDemo(page);
});

test("una ruta directa retoma el modulo despues de identificar al usuario", async ({ page }) => {
  await page.goto("/ruta-inexistente");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "POSEIDON" })).toBeVisible();

  await page.goto("/diferencias");
  await expect(page).toHaveURL(/\/diferencias$/);
  await expect(page.getByRole("heading", { name: "Ingreso al sistema" })).toBeVisible();

  await page.getByLabel("Entrar como").selectOption("user-encargado");
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/diferencias$/);
  await expect(page.getByRole("heading", { name: "Diferencias de caja" })).toBeVisible();
});

test("cajero conserva la ruta y bloquea una operacion sin caja", async ({ page }) => {
  await login(page, "user-cajero1");

  await page.goto("/caja/clientes");
  await expect(page).toHaveURL(/\/caja\/clientes$/);
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();

  await page.goto("/caja/contadores");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.locator(".cashier-notice")).toHaveText("Necesita abrir una nueva caja para poder operar.");
});

test("encargado usa URL directa, recarga y navegacion historica", async ({ page }) => {
  await login(page, "user-encargado");

  const differenceCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Diferencias", exact: true }) });
  await differenceCard.getByRole("button", { name: "Ver diferencias", exact: true }).click();
  await expect(page).toHaveURL(/\/diferencias$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Diferencias de caja" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Panel del encargado" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/diferencias$/);
  await expect(page.getByRole("heading", { name: "Diferencias de caja" })).toBeVisible();

  await page.goto("/locales");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByText("No tenes acceso a esa pantalla con la funcion activa.")).toBeVisible();
});

test("administrador conserva una ruta administrativa al recargar", async ({ page }) => {
  await login(page, "user-admin");

  await page.goto("/locales");
  await expect(page).toHaveURL(/\/locales$/);
  await expect(page.getByRole("heading", { name: "Locales" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Locales" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Reportes y administracion" })).toBeVisible();

  await page.getByRole("button", { name: "Trabajar como cajero", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Panel del cajero" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Panel del cajero" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Modo administrador", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Modo administrador", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reportes y administracion" })).toBeVisible();
});
