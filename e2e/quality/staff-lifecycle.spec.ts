import { expect, test, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon, storedSnapshot } from "../support/poseidon";

type StoredData = {
  data: {
    staff: Array<{
      id: string;
      firstName: string;
      lastName: string;
      documentId: string;
      phone: string;
      status: string;
      deletedAt?: string;
    }>;
    salaryHistories: Array<{ staffId: string }>;
    audit: Array<{ action: string; entityId: string; actorRole?: string }>;
  };
};

const FIRST_NAME = "Operador";
const LAST_NAME = "E2E";
const EDITED_LAST_NAME = "Lifecycle";
const DOCUMENT_ID = "45987612";

function acceptConfirmation(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}

test.beforeEach(async ({ page }) => {
  await resetPoseidon(page);
});

test("crea, edita, da de baja, envia a papelera y restaura personal descartable", async ({
  page,
}) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/personal");

  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Agregar personal" });
  await expect(dialog.getByText("Campos obligatorios marcados con *", { exact: true })).toBeVisible();
  await dialog.getByLabel("Nombre *", { exact: true }).fill(FIRST_NAME);
  await dialog.getByLabel("Apellido *", { exact: true }).fill(LAST_NAME);
  await dialog.getByLabel("Documento", { exact: true }).fill(DOCUMENT_ID);
  await dialog
    .getByRole("combobox", { name: "Cargo *", exact: true })
    .selectOption("Mantenimiento");
  await dialog.getByRole("combobox", { name: "Local *", exact: true }).selectOption("1");
  await dialog
    .getByRole("combobox", { name: "Estado *", exact: true })
    .selectOption("ACTIVO");
  await dialog
    .getByRole("combobox", { name: "Tipo salario *", exact: true })
    .selectOption("MENSUAL");
  await dialog.getByLabel("Salario base *", { exact: true }).fill("48000");
  await dialog.getByLabel("Notas", { exact: true }).fill("Alta descartable CAL-01");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

  let staffRow = page.getByRole("row").filter({ hasText: `${FIRST_NAME} ${LAST_NAME}` });
  await expect(staffRow).toContainText("ACTIVO");
  let snapshot = await storedSnapshot<StoredData>(page);
  const created = snapshot.data.staff.find((staff) => staff.documentId === DOCUMENT_ID);
  const staffId = created?.id;
  expect(staffId).toBeTruthy();
  expect(snapshot.data.salaryHistories.filter((history) => history.staffId === staffId)).toHaveLength(1);

  await staffRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: `Editar ${FIRST_NAME} ${LAST_NAME}` });
  await dialog.getByLabel("Apellido *", { exact: true }).fill(EDITED_LAST_NAME);
  await dialog.getByLabel("Telefono", { exact: true }).fill("099765432");
  await dialog
    .getByRole("textbox", { name: "Notas", exact: true })
    .fill("Edicion descartable CAL-01");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

  await page.reload();
  staffRow = page.getByRole("row").filter({ hasText: `${FIRST_NAME} ${EDITED_LAST_NAME}` });
  await expect(staffRow).toContainText("ACTIVO");

  acceptConfirmation(page);
  await staffRow.getByRole("button", { name: "Baja", exact: true }).click();
  await expect(staffRow).toContainText("BAJA");

  acceptConfirmation(page);
  await staffRow.getByRole("button", { name: "Papelera", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: `${FIRST_NAME} ${EDITED_LAST_NAME}` })).toHaveCount(0);

  await page.goto("/administracion/papelera");
  const staffSection = page
    .locator("section.embedded-panel")
    .filter({ has: page.getByRole("heading", { name: "Personal", exact: true }) });
  const trashedRow = staffSection.getByRole("row").filter({
    hasText: `${FIRST_NAME} ${EDITED_LAST_NAME}`,
  });
  await expect(trashedRow).toBeVisible();
  await trashedRow.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(trashedRow).toHaveCount(0);

  await page.goto("/personal");
  await page.reload();
  staffRow = page.getByRole("row").filter({ hasText: `${FIRST_NAME} ${EDITED_LAST_NAME}` });
  await expect(staffRow).toContainText("BAJA");

  snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.staff.find((staff) => staff.id === staffId)).toMatchObject({
    firstName: FIRST_NAME,
    lastName: EDITED_LAST_NAME,
    phone: "099765432",
    status: "BAJA",
  });
  expect(snapshot.data.staff.find((staff) => staff.id === staffId)?.deletedAt).toBeUndefined();
  const actions = snapshot.data.audit
    .filter((event) => event.entityId === staffId)
    .map((event) => event.action);
  expect(actions).toEqual(
    expect.arrayContaining([
      "Crear personal",
      "Editar personal",
      "Dar de baja personal",
      "Enviar personal a papelera",
      "Restaurar personal",
    ]),
  );
  expect(
    snapshot.data.audit
      .filter((event) => event.entityId === staffId)
      .every((event) => event.actorRole === "ADMINISTRADOR"),
  ).toBe(true);
});
