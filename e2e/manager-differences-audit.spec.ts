import { expect, test, type Dialog, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon } from "./support/poseidon";

async function loginAsManager(page: Page) {
  await loginPoseidon(page, "user-encargado");
  await expect(page.getByRole("heading", { name: "Panel del encargado" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await resetPoseidon(page);
});

test("valida, corrige y audita una diferencia con detalle contable", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await loginAsManager(page);

  await page.getByRole("button", { name: "Ver diferencias", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Diferencias de caja" })).toBeVisible();
  await expect(page).toHaveURL(/\/diferencias$/);
  await expect(page.locator(".difference-table thead button")).toHaveCount(7);
  await expect(page.locator(".difference-table thead th[aria-sort]")).toHaveCount(7);

  await page.getByRole("button", { name: "Gestionar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Diferencia POSE-1", exact: true });
  await expect(dialog.getByRole("button", { name: "Cerrar", exact: true }).first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Gestionar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Diferencia POSE-1", exact: true });
  await dialog.getByRole("combobox").selectOption("CORREGIDA");

  const cashInput = dialog.getByLabel("Efectivo declarado corregido");
  const bankInput = dialog.getByLabel("Dinero en banco declarado corregido");
  const noteInput = dialog.getByPlaceholder("Observacion obligatoria");
  await cashInput.fill("");
  await cashInput.blur();
  await noteInput.fill("Prueba de validacion obligatoria");

  let unexpectedConfirmation = false;
  const unexpectedDialogHandler = async (confirmation: Dialog) => {
    unexpectedConfirmation = true;
    await confirmation.dismiss();
  };
  page.on("dialog", unexpectedDialogHandler);
  await dialog.getByRole("button", { name: "Guardar gestion", exact: true }).click();
  await expect(dialog.getByText("Completa importes validos de efectivo y banco para corregir la diferencia.")).toBeVisible();
  page.off("dialog", unexpectedDialogHandler);
  expect(unexpectedConfirmation).toBe(false);
  await expect(cashInput).toHaveValue("");

  await cashInput.fill("55000");
  await bankInput.fill("12000");
  await noteInput.fill("Correccion E2E auditada");
  page.once("dialog", (confirmation) => confirmation.accept());
  await dialog.getByRole("button", { name: "Guardar gestion", exact: true }).click();
  await expect(page.getByText("Diferencia gestionada y auditada.")).toBeVisible();

  await page.getByRole("button", { name: "Auditoria", exact: true }).click();
  await expect(page).toHaveURL(/\/auditoria$/);
  await expect(page.getByText("Se muestran solamente los locales asignados.")).toBeVisible();
  await expect(page.locator(".audit-table thead button")).toHaveCount(6);
  const auditRow = page.getByRole("row").filter({ hasText: "Gestionar diferencia de caja" });
  await auditRow.getByRole("button", { name: "Ver", exact: true }).click();

  const auditDialog = page.getByRole("dialog").filter({ hasText: "Gestionar diferencia de caja" });
  await expect(auditDialog.getByRole("heading", { name: "Saldos de cuentas" })).toBeVisible();
  await expect(auditDialog.getByRole("heading", { name: "Movimientos contables generados" })).toBeVisible();
  await expect(auditDialog).toContainText("Efectivo");
  await expect(auditDialog).toContainText("Banco");
  await expect(auditDialog).toContainText("Ajuste anterior");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
  expect(runtimeErrors).toEqual([]);
});
