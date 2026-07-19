import { expect, test } from "@playwright/test";
import { loginPoseidon, resetPoseidon, STORAGE_KEY } from "./support/poseidon";

test("sincroniza una pestana pasiva y conserva el bloqueo de una version realmente desactualizada", async ({ page, context }) => {
  await resetPoseidon(page);
  await loginPoseidon(page, "user-admin");
  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await loginPoseidon(secondPage, "user-admin");

  await page.goto("/administracion/categorias-gastos");
  await secondPage.goto("/administracion/categorias-gastos");
  await page.getByPlaceholder("Nueva categoria").fill("Cambio pestana principal");
  await page.locator("form").getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Cambio pestana principal", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey)?.includes("Cambio pestana principal") ?? false, STORAGE_KEY))
    .toBe(true);
  await expect(secondPage.getByText("Cambio pestana principal", { exact: true })).toBeVisible();

  await secondPage.evaluate((storageKey) => {
    const snapshot = JSON.parse(localStorage.getItem(storageKey)!);
    snapshot.data.locals[0].tenantName = "Cambio externo sin evento en la pestana activa";
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, STORAGE_KEY);

  await secondPage.getByPlaceholder("Nueva categoria").fill("Cambio pestana desactualizada");
  await secondPage.locator("form").getByRole("button", { name: "Agregar", exact: true }).click();

  await expect(secondPage.getByRole("heading", { name: "Cambios de otra pestaña detectados" })).toBeVisible();
  await expect(secondPage.getByRole("button", { name: "Descargar respaldo pendiente" })).toBeEnabled();
  await expect(secondPage.getByRole("button", { name: "Usar version guardada" })).toBeVisible();
});
