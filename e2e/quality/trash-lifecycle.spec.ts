import { expect, test, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon, storedSnapshot } from "../support/poseidon";

type StoredData = {
  data: {
    staff: Array<{ id: string; firstName: string; lastName: string; documentId: string; status: string }>;
    clients: Array<{ id: string; name: string; documentId: string; status: string }>;
    salaryHistories: Array<{ staffId: string }>;
    audit: Array<{ action: string; entityId: string; actorRole?: string }>;
  };
};

function acceptConfirmation(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}

test.beforeEach(async ({ page }) => {
  await resetPoseidon(page);
});

test("elimina definitivamente y audita un cliente sin operaciones relacionadas", async ({ page }) => {
  const clientName = "Cliente E2E Eliminable";
  const documentId = "48765432";

  await loginPoseidon(page, "user-admin");
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar cliente" });
  await dialog.getByLabel("Nombre", { exact: true }).fill(clientName);
  await dialog
    .getByRole("combobox", { name: "Tipo documento", exact: true })
    .selectOption("CEDULA");
  await dialog.getByLabel("Documento", { exact: true }).fill(documentId);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

  let snapshot = await storedSnapshot<StoredData>(page);
  const clientId = snapshot.data.clients.find((client) => client.documentId === documentId)?.id;
  expect(clientId).toBeTruthy();

  const clientRow = page.getByRole("row").filter({ hasText: clientName });
  acceptConfirmation(page);
  await clientRow.getByRole("button", { name: "Papelera", exact: true }).click();

  await page.goto("/administracion/papelera");
  const clientSection = page
    .locator("section.embedded-panel")
    .filter({ has: page.getByRole("heading", { name: "Clientes", exact: true }) });
  const trashedRow = clientSection.getByRole("row").filter({ hasText: clientName });
  await expect(trashedRow).toBeVisible();
  acceptConfirmation(page);
  await trashedRow.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(trashedRow).toHaveCount(0);

  await page.reload();
  snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.clients.some((client) => client.id === clientId)).toBe(false);
  expect(
    snapshot.data.audit
      .filter((event) => event.entityId === clientId)
      .map((event) => event.action),
  ).toEqual(
    expect.arrayContaining([
      "Crear cliente",
      "Enviar cliente a papelera",
      "Eliminar definitivo cliente",
    ]),
  );
  expect(
    snapshot.data.audit
      .filter((event) => event.entityId === clientId)
      .every((event) => event.actorRole === "ADMINISTRADOR"),
  ).toBe(true);
});

test("un personal creado por UI queda bloqueado en papelera por su historial salarial inicial", async ({
  page,
}) => {
  const firstName = "Personal";
  const lastName = "E2E Bloqueado";
  const documentId = "47654321";

  await loginPoseidon(page, "user-admin");
  await page.goto("/personal");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar personal" });
  await dialog.getByLabel("Nombre *", { exact: true }).fill(firstName);
  await dialog.getByLabel("Apellido *", { exact: true }).fill(lastName);
  await dialog.getByLabel("Documento", { exact: true }).fill(documentId);
  await dialog
    .getByRole("combobox", { name: "Cargo *", exact: true })
    .selectOption("Limpieza");
  await dialog.getByRole("combobox", { name: "Local *", exact: true }).selectOption("1");
  await dialog
    .getByRole("combobox", { name: "Estado *", exact: true })
    .selectOption("ACTIVO");
  await dialog
    .getByRole("combobox", { name: "Tipo salario *", exact: true })
    .selectOption("MENSUAL");
  await dialog.getByLabel("Salario base *", { exact: true }).fill("39000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

  let snapshot = await storedSnapshot<StoredData>(page);
  const staffId = snapshot.data.staff.find((staff) => staff.documentId === documentId)?.id;
  expect(staffId).toBeTruthy();
  expect(snapshot.data.salaryHistories.filter((history) => history.staffId === staffId)).toHaveLength(1);

  const staffRow = page.getByRole("row").filter({ hasText: `${firstName} ${lastName}` });
  acceptConfirmation(page);
  await staffRow.getByRole("button", { name: "Papelera", exact: true }).click();

  await page.goto("/administracion/papelera");
  const staffSection = page
    .locator("section.embedded-panel")
    .filter({ has: page.getByRole("heading", { name: "Personal", exact: true }) });
  const trashedRow = staffSection.getByRole("row").filter({ hasText: `${firstName} ${lastName}` });
  await trashedRow.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByText(
      "No se puede eliminar definitivamente: conserva 1 historial salarial. Mantenelo en la papelera.",
      { exact: true },
    ),
  ).toBeVisible();

  await page.reload();
  await expect(
    page
      .locator("section.embedded-panel")
      .filter({ has: page.getByRole("heading", { name: "Personal", exact: true }) })
      .getByRole("row")
      .filter({ hasText: `${firstName} ${lastName}` }),
  ).toBeVisible();
  snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.staff.find((staff) => staff.id === staffId)?.status).toBe("PAPELERA");
  expect(
    snapshot.data.audit.some(
      (event) => event.entityId === staffId && event.action === "Eliminar definitivo personal",
    ),
  ).toBe(false);
});
