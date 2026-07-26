import { expect, test, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon, storedSnapshot } from "../support/poseidon";

type StoredData = {
  data: {
    locals: Array<{ id: string; name: string; status: string }>;
    machines: Array<{
      id: string;
      name: string;
      localId: string;
      location: string;
      status: string;
      notes: string;
    }>;
    readings: Array<{ machineId: string }>;
    currentAccounts: Array<{ entityId?: string }>;
    machineLocalHistory: Array<{ machineId: string; action: string }>;
    audit: Array<{ action: string; entity: string; entityId: string; actorRole?: string }>;
  };
};

const LOCAL_ID = "91";
const LOCAL_NAME = "Local E2E Norte";
const EDITED_LOCAL_NAME = "Local E2E Sur";
const MACHINE_NAME = "Maquina E2E Ciclo";
const EDITED_MACHINE_NAME = "Maquina E2E Taller";

function acceptConfirmation(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}

test.beforeEach(async ({ page }) => {
  await resetPoseidon(page);
});

test("crea, ordena, edita y cierra un local sin referencias con auditoria persistida", async ({
  page,
}) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/locales");

  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Agregar local" });
  await dialog.getByLabel("ID", { exact: true }).fill(LOCAL_ID);
  await dialog.getByLabel("Local", { exact: true }).fill(LOCAL_NAME);
  await dialog.getByLabel("Locatario", { exact: true }).fill("Locatario E2E");
  await dialog.getByLabel("Telefono", { exact: true }).fill("099123456");
  await dialog.getByLabel("Email", { exact: true }).fill("local-e2e@poseidon.local");
  await dialog.getByLabel("Direccion", { exact: true }).fill("Direccion E2E 91");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Local creado.", { exact: true })).toBeVisible();

  const localHeader = page
    .getByRole("columnheader")
    .filter({ has: page.getByRole("button", { name: /^Local/ }) });
  await localHeader.getByRole("button", { name: /^Local/ }).click();
  await expect(localHeader).toHaveAttribute("aria-sort", "ascending");
  await page.getByPlaceholder("Buscar local, locatario, telefono...").fill("Local E2E");

  let localRow = page.getByRole("row").filter({ hasText: LOCAL_NAME });
  await expect(localRow).toBeVisible();
  await localRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: `Editar local ${LOCAL_NAME}` });
  await dialog.getByLabel("Local", { exact: true }).fill(EDITED_LOCAL_NAME);
  await dialog.getByRole("combobox", { name: "Estado", exact: true }).selectOption("INACTIVO");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Local modificado.", { exact: true })).toBeVisible();

  await page.reload();
  localRow = page.getByRole("row").filter({ hasText: EDITED_LOCAL_NAME });
  await expect(localRow).toContainText("INACTIVO");

  await localRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: `Editar local ${EDITED_LOCAL_NAME}` });
  await dialog.getByRole("combobox", { name: "Estado", exact: true }).selectOption("CERRADO");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Local cerrado y maquinas enviadas al taller.", { exact: true })).toBeVisible();
  await expect(localRow).toContainText("CERRADO");

  await page.reload();
  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.locals.find((local) => local.id === LOCAL_ID)).toMatchObject({
    name: EDITED_LOCAL_NAME,
    status: "CERRADO",
  });
  expect(snapshot.data.currentAccounts.some((account) => account.entityId === LOCAL_ID)).toBe(true);
  const actions = snapshot.data.audit
    .filter((event) => event.entityId === LOCAL_ID)
    .map((event) => event.action);
  expect(actions).toEqual(expect.arrayContaining(["Crear local", "Modificar local", "Cerrar local"]));
  expect(
    snapshot.data.audit
      .filter((event) => event.entityId === LOCAL_ID)
      .every((event) => event.actorRole === "ADMINISTRADOR"),
  ).toBe(true);
});

test("quita un local sin referencias y conserva la auditoria", async ({ page }) => {
  test.fail(
    true,
    "FALLO_CONFIRMADO CAL-01: la auditoria conserva el ID del local quitado y la validacion rechaza el snapshot.",
  );

  await loginPoseidon(page, "user-admin");
  await page.goto("/locales");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Agregar local" });
  await dialog.getByLabel("ID", { exact: true }).fill("92");
  await dialog.getByLabel("Local", { exact: true }).fill("Local E2E Eliminable");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Local creado.", { exact: true })).toBeVisible();

  const localRow = page.getByRole("row").filter({ hasText: "Local E2E Eliminable" });
  await localRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Editar local Local E2E Eliminable" });
  await expect(dialog.getByRole("button", { name: "Quitar local", exact: true })).toBeEnabled();
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Quitar local", exact: true }).click();
  await expect(page.getByText("Local quitado.", { exact: true })).toBeVisible();

  await page.reload();
  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.locals.some((local) => local.id === "92")).toBe(false);
  expect(
    snapshot.data.audit.some(
      (event) => event.entityId === "92" && event.action === "Quitar local",
    ),
  ).toBe(true);
});

test("crea una maquina en Taller, la asigna, edita, devuelve, marca Desuso y elimina", async ({
  page,
}) => {
  test.fail(
    true,
    "FALLO_CONFIRMADO CAL-01: crear o mover una maquina hacia Taller genera auditoria con localId taller y el snapshot se rechaza.",
  );

  await loginPoseidon(page, "user-admin");
  await page.goto("/maquinas");

  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Agregar maquina" });
  await dialog.getByLabel("Maquina", { exact: true }).fill(MACHINE_NAME);
  await dialog.getByLabel("Observacion", { exact: true }).fill("Alta descartable CAL-01");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Maquina creada.", { exact: true })).toBeVisible();

  let snapshot = await storedSnapshot<StoredData>(page);
  const created = snapshot.data.machines.find((machine) => machine.name === MACHINE_NAME);
  expect(created).toMatchObject({
    localId: "taller",
    location: "Taller",
    status: "ACTIVA",
  });
  const machineId = created?.id;
  expect(machineId).toBeTruthy();

  await page.goto("/locales");
  const poseidonRow = page.getByRole("row").filter({ hasText: "Poseidon" }).first();
  await poseidonRow.getByRole("button", { name: /^\d+$/ }).click();
  const localMachinesDialog = page.getByRole("dialog", { name: "Maquinas de Poseidon" });
  await localMachinesDialog.getByRole("button", { name: "Agregar maquina", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Asignar maquinas a Poseidon" });
  await picker.getByPlaceholder("Buscar maquina").fill(MACHINE_NAME);
  const pickerRow = picker.getByRole("row").filter({ hasText: MACHINE_NAME });
  await pickerRow.getByRole("checkbox").check();
  acceptConfirmation(page);
  await picker.getByRole("button", { name: "Asignar seleccionadas", exact: true }).click();
  await expect(page.getByText("1 maquina(s) asignada(s) a Poseidon.", { exact: true })).toBeVisible();
  await expect(localMachinesDialog.getByRole("row").filter({ hasText: MACHINE_NAME })).toBeVisible();
  await localMachinesDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

  await page.goto("/maquinas");
  let machineRow = page.getByRole("row").filter({ hasText: MACHINE_NAME });
  await expect(machineRow).toContainText("Poseidon");
  await machineRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: /^Editar maquina/ });
  await dialog.getByLabel("Maquina", { exact: true }).fill(EDITED_MACHINE_NAME);
  await dialog
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("MANTENIMIENTO");
  await dialog.getByLabel("Ubicacion", { exact: true }).fill("Salon E2E");
  await dialog.getByLabel("Observacion", { exact: true }).fill("Edicion descartable CAL-01");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Maquina modificada.", { exact: true })).toBeVisible();

  await page.reload();
  machineRow = page.getByRole("row").filter({ hasText: EDITED_MACHINE_NAME });
  await expect(machineRow).toContainText("MANTENIMIENTO");
  await expect(machineRow).toContainText("Poseidon");

  await machineRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: /^Editar maquina/ });
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Enviar al taller", exact: true }).click();
  await expect(page.getByText("Maquina enviada al taller.", { exact: true })).toBeVisible();

  await page.goto("/taller");
  machineRow = page.getByRole("row").filter({ hasText: EDITED_MACHINE_NAME });
  await expect(machineRow).toContainText("MANTENIMIENTO");
  await machineRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: /^Editar maquina/ });
  await dialog.getByRole("combobox", { name: "Estado", exact: true }).selectOption("DESUSO");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Maquina modificada.", { exact: true })).toBeVisible();

  await page.reload();
  const disusedSection = page
    .locator("section.embedded-panel")
    .filter({ has: page.getByRole("heading", { name: "Maquinas en desuso" }) });
  const disusedRow = disusedSection.getByRole("row").filter({ hasText: EDITED_MACHINE_NAME });
  await expect(disusedRow).toBeVisible();

  snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.machines.find((machine) => machine.id === machineId)).toMatchObject({
    localId: "taller",
    status: "DESUSO",
    name: EDITED_MACHINE_NAME,
  });

  await disusedRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: /^Editar maquina/ });
  await expect(dialog.getByRole("button", { name: "Eliminar maquina", exact: true })).toBeEnabled();
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Eliminar maquina", exact: true }).click();
  await expect(page.getByText("Maquina eliminada.", { exact: true })).toBeVisible();
  await page.reload();

  snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.machines.some((machine) => machine.id === machineId)).toBe(false);
  expect(
    snapshot.data.machineLocalHistory
      .filter((event) => event.machineId === machineId)
      .map((event) => event.action),
  ).toEqual(expect.arrayContaining(["AGREGADA", "MOVIDA", "MODIFICADA", "QUITADA"]));
  expect(
    snapshot.data.audit
      .filter((event) => event.entityId === machineId)
      .map((event) => event.action),
  ).toEqual(
    expect.arrayContaining([
      "Crear maquina",
      "Modificar maquina",
      "Enviar maquina al taller",
      "Eliminar maquina",
    ]),
  );
});

test("edita una maquina existente sin cambiarla de local y persiste la auditoria", async ({ page }) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/maquinas");

  let machineRow = page.getByRole("row").filter({ hasText: "Poseidon Roja" });
  await machineRow.getByRole("button", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar maquina 2" });
  await dialog.getByLabel("Maquina", { exact: true }).fill("Poseidon Roja E2E");
  await dialog
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("MANTENIMIENTO");
  await dialog.getByLabel("Ubicacion", { exact: true }).fill("Salon E2E");
  await dialog.getByLabel("Observacion", { exact: true }).fill("Edicion independiente CAL-01");
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Maquina modificada.", { exact: true })).toBeVisible();

  await page.reload();
  machineRow = page.getByRole("row").filter({ hasText: "Poseidon Roja E2E" });
  await expect(machineRow).toContainText("MANTENIMIENTO");
  await expect(machineRow).toContainText("Poseidon");

  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.machines.find((machine) => machine.id === "machine-2")).toMatchObject({
    name: "Poseidon Roja E2E",
    localId: "1",
    location: "Salon E2E",
    status: "MANTENIMIENTO",
    notes: "Edicion independiente CAL-01",
  });
  expect(
    snapshot.data.audit.some(
      (event) => event.entityId === "machine-2" && event.action === "Modificar maquina",
    ),
  ).toBe(true);
});

test("mantiene bloqueada la eliminacion de una maquina con recaudaciones", async ({ page }) => {
  test.fail(
    true,
    "FALLO_CONFIRMADO CAL-01: devolver la maquina con recaudaciones a Taller se rechaza antes de poder verificar el boton de eliminacion.",
  );

  await loginPoseidon(page, "user-admin");
  await page.goto("/maquinas");

  const machineRow = page.getByRole("row").filter({ hasText: "Poseidon Azul" });
  await machineRow.getByRole("button", { name: "Editar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Editar maquina 1" });
  acceptConfirmation(page);
  await dialog.getByRole("button", { name: "Enviar al taller", exact: true }).click();
  await expect(page.getByText("Maquina enviada al taller.", { exact: true })).toBeVisible();

  await page.goto("/taller");
  await page.getByRole("row").filter({ hasText: "Poseidon Azul" }).getByRole("button", {
    name: "Editar",
    exact: true,
  }).click();
  dialog = page.getByRole("dialog", { name: "Editar maquina 1" });
  await expect(dialog.getByRole("button", { name: "Eliminar maquina", exact: true })).toBeDisabled();

  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.machines.find((machine) => machine.id === "machine-1")).toMatchObject({
    localId: "taller",
  });
  expect(snapshot.data.readings.some((reading) => reading.machineId === "machine-1")).toBe(true);
  expect(
    snapshot.data.audit.some(
      (event) => event.entityId === "machine-1" && event.action === "Eliminar maquina",
    ),
  ).toBe(false);
});
