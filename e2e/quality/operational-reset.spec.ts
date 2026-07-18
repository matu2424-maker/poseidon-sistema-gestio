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

async function loginAsAdmin(page: Page) {
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption("user-admin");
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("Administrador respalda y crea una base operativa limpia", async ({ page }) => {
  await resetDemo(page);
  await loginAsAdmin(page);
  await page.goto("/administracion/datos-locales");

  const masterCountsBefore = await page.evaluate((storageKey) => {
    const data = JSON.parse(localStorage.getItem(storageKey)!).data;
    return {
      users: data.users.length,
      locals: data.locals.length,
      machines: data.machines.length,
      staff: data.staff.length,
      clients: data.clients.length,
    };
  }, STORAGE_KEY);

  page.once("dialog", (dialog) => dialog.accept());
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Respaldar y reiniciar", exact: true }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^poseidon-respaldo-antes-reinicio-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText("Base operativa limpia creada. Las cuentas, contadores y operaciones quedaron en cero.")).toBeVisible();

  const result = await page.evaluate((storageKey) => {
    const snapshot = JSON.parse(localStorage.getItem(storageKey)!);
    const data = snapshot.data;
    const balance = (accountId: string) => data.accountMovements
      .filter((movement: { accountId: string; status: string }) => movement.accountId === accountId && movement.status === "ACTIVO")
      .reduce(
        (sum: number, movement: { direction: string; amount: number }) =>
          sum + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount),
        0,
      );
    return {
      masterCounts: {
        users: data.users.length,
        locals: data.locals.length,
        machines: data.machines.length,
        staff: data.staff.length,
        clients: data.clients.length,
      },
      operations: {
        balances: data.balances.length,
        readings: data.readings.length,
        expenses: data.expenses.length,
        transfers: data.transfers.length,
        gifts: data.gifts.length,
        salarySettlements: data.salarySettlements.length,
        accountMovements: data.accountMovements.length,
      },
      accountBalances: data.currentAccounts.map((account: { id: string }) => balance(account.id)),
      countersAtZero: data.machines.every((machine: { lastIn: number; lastOut: number }) => machine.lastIn === 0 && machine.lastOut === 0),
      audit: data.audit,
    };
  }, STORAGE_KEY);

  expect(result.masterCounts).toEqual(masterCountsBefore);
  expect(result.operations).toEqual({
    balances: 0,
    readings: 0,
    expenses: 0,
    transfers: 0,
    gifts: 0,
    salarySettlements: 0,
    accountMovements: 0,
  });
  expect(result.accountBalances.every((value: number) => value === 0)).toBe(true);
  expect(result.countersAtZero).toBe(true);
  expect(result.audit).toHaveLength(1);
  expect(result.audit[0]).toMatchObject({
    userId: "user-admin",
    actorRole: "ADMINISTRADOR",
    action: "Crear base operativa limpia",
    entity: "Sistema",
    entityId: "operational-data",
  });
});
