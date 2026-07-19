import { expect, test, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon } from "./support/poseidon";

async function loginAsManager(page: Page) {
  await loginPoseidon(page, "user-encargado");
  await page.goto("/liquidacion-salarios");
  await expect(page.getByRole("heading", { name: "Liquidacion de salarios" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await resetPoseidon(page);
});

test("cierra el periodo y registra una revision correctiva sin alterar la foto original", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await loginAsManager(page);
  await expect(page.locator(".salary-main-panel thead th[aria-sort]")).toHaveCount(9);
  await expect(page.locator(".salary-closures-panel thead th[aria-sort]")).toHaveCount(12);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cerrar liquidacion", exact: true }).click();
  await expect(page.getByText("LS-1: cierre salarial definitivo guardado.", { exact: true })).toBeVisible();
  await expect(page.getByText("Periodo cerrado por LS-1.", { exact: false })).toBeVisible();

  const employeeRow = page.getByRole("row").filter({ hasText: "Martin Pereira" });
  await employeeRow.getByRole("button", { name: "Detalle", exact: true }).click();
  let employeeDialog = page.getByRole("dialog", { name: "Detalle de Martin Pereira", exact: true });
  await expect(employeeDialog.getByText("Periodo cerrado", { exact: true })).toBeVisible();
  await expect(employeeDialog.getByRole("button", { name: "Agregar liquidacion", exact: true })).toHaveCount(0);
  await employeeDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

  const originalClosureRow = page.getByRole("row").filter({ hasText: "LS-1" });
  await originalClosureRow.getByRole("button", { name: "Ver foto", exact: true }).click();
  let snapshotDialog = page.getByRole("dialog", { name: "Foto salarial LS-1", exact: true });
  const originalSnapshotRow = snapshotDialog.getByRole("row").filter({ hasText: "Martin Pereira" });
  await expect(originalSnapshotRow.locator("td").nth(2)).toHaveText("$ 0");
  await snapshotDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

  await page.getByRole("button", { name: "Iniciar ajuste correctivo", exact: true }).click();
  const correctionDialog = page.getByRole("dialog", { name: "Ajuste correctivo de LS-1", exact: true });
  await correctionDialog.getByLabel("Motivo del ajuste *").fill("Premio omitido en el cierre");
  await correctionDialog.getByRole("button", { name: "Abrir ajuste correctivo", exact: true }).click();
  await expect(page.getByText("Ajuste LS-2 abierto sobre LS-1.", { exact: false })).toBeVisible();

  await employeeRow.getByRole("button", { name: "Detalle", exact: true }).click();
  employeeDialog = page.getByRole("dialog", { name: "Detalle de Martin Pereira", exact: true });
  await employeeDialog.getByRole("button", { name: "Agregar correccion", exact: true }).click();
  const editorDialog = page.getByRole("dialog", { name: "Agregar liquidacion", exact: true });
  await editorDialog.getByLabel("Concepto principal").selectOption("EXTRA");
  await editorDialog.getByLabel("Monto").fill("500");
  await editorDialog.getByLabel("Notas").fill("Premio correctivo");
  await editorDialog.getByRole("button", { name: "Guardar liquidacion", exact: true }).click();
  await expect(editorDialog).toBeHidden();
  await employeeDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cerrar ajuste correctivo", exact: true }).click();
  await expect(page.getByText("LS-2: ajuste correctivo cerrado y nueva foto guardada.", { exact: true })).toBeVisible();

  const correctiveClosureRow = page.getByRole("row").filter({ hasText: "LS-2" });
  await expect(correctiveClosureRow).toContainText("Correctivo");
  await expect(correctiveClosureRow).toContainText("R1");
  await correctiveClosureRow.getByRole("button", { name: "Ver foto", exact: true }).click();
  snapshotDialog = page.getByRole("dialog", { name: "Foto salarial LS-2", exact: true });
  await expect(snapshotDialog.locator("thead th[aria-sort]")).toHaveCount(9);
  const correctiveSnapshotRow = snapshotDialog.getByRole("row").filter({ hasText: "Martin Pereira" });
  await expect(correctiveSnapshotRow.locator("td").nth(2)).toHaveText("$ 500");
  await snapshotDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

  await originalClosureRow.getByRole("button", { name: "Ver foto", exact: true }).click();
  snapshotDialog = page.getByRole("dialog", { name: "Foto salarial LS-1", exact: true });
  await expect(snapshotDialog.getByRole("row").filter({ hasText: "Martin Pereira" }).locator("td").nth(2)).toHaveText("$ 0");
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
  expect(runtimeErrors).toEqual([]);
});
