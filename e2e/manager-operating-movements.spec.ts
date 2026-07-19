import { expect, test } from "@playwright/test";
import { loginPoseidon, resetPoseidon, STORAGE_KEY } from "./support/poseidon";

test("encargado paga un gasto desde Principal sin alterar la Caja activa", async ({ page, context }) => {
  await resetPoseidon(page);
  await loginPoseidon(page, "user-cajero1");
  await expect
    .poll(() => page.evaluate((storageKey) => Boolean(localStorage.getItem(storageKey)), STORAGE_KEY))
    .toBe(true);

  const managerPage = await context.newPage();
  await managerPage.goto("/");
  await loginPoseidon(managerPage, "user-encargado");

  await page.getByRole("button", { name: "Abrir caja", exact: true }).click();
  await page.getByLabel("Fecha operativa").fill("2026-07-17");
  await page.locator("form.open-cash-form").getByRole("button", { name: "Abrir caja", exact: true }).click();
  await expect(page.getByText("Caja abierta correctamente.")).toBeVisible();

  const balancesBefore = await page.evaluate((storageKey) => {
    const snapshot = JSON.parse(localStorage.getItem(storageKey)!);
    const localId = snapshot.data.balances.find((item: { status: string }) => item.status === "EN_PROCESO").localId;
    const total = (accountId: string) => snapshot.data.accountMovements
      .filter((movement: { accountId: string; status: string }) => movement.accountId === accountId && movement.status === "ACTIVO")
      .reduce((sum: number, movement: { direction: string; amount: number }) => sum + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount), 0);
    return {
      cash: total(`account-local-${localId}-efectivo`),
      principal: total("account-principal-efectivo-uyu"),
    };
  }, STORAGE_KEY);

  await managerPage.goto("/control/gastos");
  await managerPage.getByRole("button", { name: "Agregar gasto", exact: true }).click();
  const expenseModal = managerPage.getByRole("dialog", { name: "Agregar gasto desde Principal" });
  await expenseModal.getByLabel("Cuenta de pago").selectOption("account-principal-efectivo-uyu");
  await expenseModal.getByLabel("Monto").fill("1000");
  await expenseModal.getByLabel("Descripcion").fill("Compra administrativa desde Principal");
  await expenseModal.getByRole("button", { name: "Guardar gasto", exact: true }).click();
  await expect(managerPage.getByText("Gasto registrado desde la cuenta Principal.")).toBeVisible();
  await expect(managerPage.getByText("Compra administrativa desde Principal", { exact: true })).toBeVisible();

  await expect
    .poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey)?.includes("Compra administrativa desde Principal") ?? false, STORAGE_KEY))
    .toBe(true);

  const result = await managerPage.evaluate((storageKey) => {
    const snapshot = JSON.parse(localStorage.getItem(storageKey)!);
    const expense = snapshot.data.expenses.find((item: { description: string }) => item.description === "Compra administrativa desde Principal");
    const total = (accountId: string) => snapshot.data.accountMovements
      .filter((movement: { accountId: string; status: string }) => movement.accountId === accountId && movement.status === "ACTIVO")
      .reduce((sum: number, movement: { direction: string; amount: number }) => sum + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount), 0);
    const localId = snapshot.data.balances.find((item: { status: string }) => item.status === "EN_PROCESO").localId;
    return {
      expense,
      audit: snapshot.data.audit.find((event: { action: string; entityId: string }) => event.action === "Crear gasto desde Principal" && event.entityId === expense.id),
      cash: total(`account-local-${localId}-efectivo`),
      principal: total("account-principal-efectivo-uyu"),
    };
  }, STORAGE_KEY);
  expect(result.expense).toMatchObject({
    paymentAccountId: "account-principal-efectivo-uyu",
    userId: "user-encargado",
  });
  expect(result.expense.balanceId).toBeUndefined();
  expect(result.audit).toMatchObject({
    userId: "user-encargado",
    actualRole: "ENCARGADO",
    actorRole: "ENCARGADO",
  });
  expect(result.cash).toBe(balancesBefore.cash);
  expect(result.principal).toBe(balancesBefore.principal - 1_000);
});
