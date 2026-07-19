import { expect, test } from "@playwright/test";
import { loginPoseidon, resetPoseidon, STORAGE_KEY, storedSnapshot } from "../support/poseidon";

type StoredData = {
  data: {
    accountMovements: Array<{
      accountId: string;
      direction: "ENTRADA" | "SALIDA";
      amount: number;
      status: string;
      sourceId: string;
    }>;
    treasuryTransfers: Array<{ id: string; type: string; status: string; note: string }>;
    periodicClosures: Array<{ visibleId: string; status: string; localId: string }>;
    users: Array<{ name: string; username: string }>;
    expenseCategories: Array<{ name: string; subcategories: string[] }>;
    audit: Array<{ action: string; entityId: string; actorRole?: string }>;
  };
};

const accountBalance = (snapshot: StoredData, accountId: string) =>
  snapshot.data.accountMovements
    .filter((movement) => movement.accountId === accountId && movement.status === "ACTIVO")
    .reduce(
      (total, movement) => total + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount),
      0,
    );

test.beforeEach(async ({ page }) => {
  await resetPoseidon(page);
});

test("tesoreria mueve fondos Caja Principal en ambos sentidos sin alterar el total conjunto", async ({ page }) => {
  await loginPoseidon(page, "user-encargado");
  await page.goto("/cuentas-corrientes");
  const before = await storedSnapshot<StoredData>(page);
  const localCashId = "account-local-1-efectivo";
  const principalCashId = "account-principal-efectivo-uyu";
  const combinedBefore = accountBalance(before, localCashId) + accountBalance(before, principalCashId);

  await page.getByRole("button", { name: "Mover fondos", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Mover fondos entre Caja y Principal" });
  await dialog.locator('select[name="type"]').selectOption("RETIRO_CAJA");
  await dialog.locator('select[name="medium"]').selectOption("EFECTIVO");
  await dialog.locator('input[name="amount"]').fill("1000");
  await dialog.locator('input[name="note"]').fill("E2E Caja a Principal");
  await dialog.getByRole("button", { name: "Registrar traspaso", exact: true }).click();
  await expect(page.getByText("Traspaso entre Caja y Principal registrado.")).toBeVisible();

  await page.getByRole("button", { name: "Mover fondos", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Mover fondos entre Caja y Principal" });
  await dialog.locator('select[name="type"]').selectOption("APORTE_CAJA");
  await dialog.locator('select[name="medium"]').selectOption("EFECTIVO");
  await dialog.locator('input[name="amount"]').fill("1000");
  await dialog.locator('input[name="note"]').fill("E2E Principal a Caja");
  await dialog.getByRole("button", { name: "Registrar traspaso", exact: true }).click();
  await expect(page.getByText("Traspaso entre Caja y Principal registrado.")).toBeVisible();

  const after = await storedSnapshot<StoredData>(page);
  expect(accountBalance(after, localCashId)).toBe(accountBalance(before, localCashId));
  expect(accountBalance(after, principalCashId)).toBe(accountBalance(before, principalCashId));
  expect(accountBalance(after, localCashId) + accountBalance(after, principalCashId)).toBe(combinedBefore);
  const transfers = after.data.treasuryTransfers.filter((transfer) => transfer.note.startsWith("E2E "));
  expect(transfers.map((transfer) => transfer.type).sort()).toEqual(["APORTE_CAJA", "RETIRO_CAJA"]);
  expect(
    after.data.audit
      .filter((event) => transfers.some((item) => item.id === event.entityId))
      .map((event) => event.action)
      .sort(),
  ).toEqual(["Aportar fondos desde principal a caja", "Retirar fondos de caja a principal"]);
});

test("encargado genera y anula una foto periodica auditable", async ({ page }) => {
  await loginPoseidon(page, "user-encargado");
  await page.goto("/cierres-periodicos");
  await expect(page.getByRole("heading", { name: "Cierre periodico" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar cierre", exact: true }).click();
  await expect(page.getByText("Cierre periodico generado y auditado.")).toBeVisible();

  const closureRow = page.getByRole("row").filter({ hasText: "PER-1" });
  await expect(closureRow).toContainText("GENERADO");
  page.once("dialog", (confirmation) => confirmation.accept());
  await closureRow.getByRole("button", { name: "Anular", exact: true }).click();
  await expect(page.getByText("Cierre periodico anulado.")).toBeVisible();
  await expect(closureRow).toContainText("ANULADO");

  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.periodicClosures[0]).toMatchObject({
    visibleId: "PER-1",
    localId: "1",
    status: "ANULADO",
  });
  expect(snapshot.data.audit.slice(0, 2).map((event) => event.action)).toEqual([
    "Anular cierre periodico",
    "Generar cierre periodico",
  ]);
  expect(snapshot.data.audit.slice(0, 2).every((event) => event.actorRole === "ENCARGADO")).toBe(true);
});

test("administrador persiste un usuario y una categoria con subcategoria", async ({ page }) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/administracion/usuarios");
  await page.getByLabel("Nombre").fill("Usuario E2E");
  await page.getByRole("textbox", { name: "Login", exact: true }).fill("usuario-e2e");
  await page.locator('form.form-stack select[name="role"]').selectOption("CAJERO");
  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Usuario E2E" })).toBeVisible();

  await page.goto("/administracion/categorias-gastos");
  await page.getByPlaceholder("Nueva categoria").fill("Categoria E2E");
  await page.locator("form.toolbar-row").getByRole("button", { name: "Agregar", exact: true }).click();
  const category = page.locator("article.category-card").filter({ hasText: "Categoria E2E" });
  await category.getByPlaceholder("Nueva subcategoria").fill("Subcategoria E2E");
  await category.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(category).toContainText("Subcategoria E2E");

  await page.reload();
  await expect(page.locator("article.category-card").filter({ hasText: "Categoria E2E" })).toContainText(
    "Subcategoria E2E",
  );
  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.users).toContainEqual(expect.objectContaining({ name: "Usuario E2E", username: "usuario-e2e" }));
  expect(snapshot.data.expenseCategories).toContainEqual(
    expect.objectContaining({ name: "Categoria E2E", subcategories: ["Subcategoria E2E"] }),
  );
});

test("importacion invalida informa el error y conserva exactamente el snapshot vigente", async ({ page }) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/administracion/datos-locales");
  const before = await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY);
  await page.getByLabel("Archivo JSON").setInputFiles("e2e/fixtures/poseidon-future-schema.json");
  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "Validar e importar", exact: true }).click();
  await expect(page.getByText("El respaldo usa una version futura (999) que esta aplicacion no puede leer.")).toBeVisible();
  const after = await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY);
  expect(after).toBe(before);
});
