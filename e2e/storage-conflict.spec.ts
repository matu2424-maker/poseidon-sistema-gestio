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

async function loginAdmin(page: Page) {
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption("user-admin");
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("evita que una pestana sobrescriba cambios guardados por otra", async ({ page, context }) => {
  await resetDemo(page);
  await loginAdmin(page);
  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await loginAdmin(secondPage);

  await page.goto("/administracion/categorias-gastos");
  await secondPage.goto("/administracion/categorias-gastos");
  await page.getByPlaceholder("Nueva categoria").fill("Cambio pestana principal");
  await page.locator("form").getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Cambio pestana principal", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey)?.includes("Cambio pestana principal") ?? false, STORAGE_KEY))
    .toBe(true);

  await secondPage.getByPlaceholder("Nueva categoria").fill("Cambio pestana desactualizada");
  await secondPage.locator("form").getByRole("button", { name: "Agregar", exact: true }).click();

  await expect(secondPage.getByRole("heading", { name: "Cambios de otra pestaña detectados" })).toBeVisible();
  await expect(secondPage.getByRole("button", { name: "Descargar respaldo pendiente" })).toBeEnabled();
  await expect(secondPage.getByRole("button", { name: "Usar version guardada" })).toBeVisible();
});
