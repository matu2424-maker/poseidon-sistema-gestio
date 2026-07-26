import { expect, test, type Page } from "@playwright/test";
import { loginPoseidon, resetPoseidon, storedSnapshot } from "../support/poseidon";

type StoredData = {
  data: {
    clients: Array<{
      id: string;
      name: string;
      documentType: string;
      documentId: string;
      category: string;
      phone: string;
      status: string;
      deletedAt?: string;
    }>;
    transfers: Array<{ clientId?: string }>;
    gifts: Array<{ clientId?: string; clientIds?: string[] }>;
    audit: Array<{ action: string; entityId: string; actorRole?: string }>;
  };
};

const CLIENT_NAME = "Cliente E2E Alta";
const EDITED_CLIENT_NAME = "Cliente E2E Editado";
const DOCUMENT_ID = "49876543";

function acceptConfirmation(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}

test.beforeEach(async ({ page }) => {
  await resetPoseidon(page);
});

test("crea con documento, edita, envia a papelera y restaura un cliente descartable", async ({
  page,
}) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/clientes");

  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Agregar cliente" });
  await dialog.getByLabel("Nombre", { exact: true }).fill(CLIENT_NAME);
  await dialog
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("FRECUENTE");
  await dialog
    .getByRole("combobox", { name: "Tipo documento", exact: true })
    .selectOption("CEDULA");
  await dialog.getByLabel("Documento", { exact: true }).fill(DOCUMENT_ID);
  await dialog.getByLabel("Telefono", { exact: true }).fill("099456789");
  await dialog.getByLabel("Email", { exact: true }).fill("cliente-e2e@poseidon.local");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

  let clientRow = page.getByRole("row").filter({ hasText: CLIENT_NAME });
  await expect(clientRow).toContainText(DOCUMENT_ID);
  let snapshot = await storedSnapshot<StoredData>(page);
  const created = snapshot.data.clients.find((client) => client.documentId === DOCUMENT_ID);
  const clientId = created?.id;
  expect(clientId).toBeTruthy();

  await clientRow.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: `Editar ${CLIENT_NAME}` });
  await dialog.getByLabel("Nombre", { exact: true }).fill(EDITED_CLIENT_NAME);
  await dialog.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("VIP");
  await dialog.getByLabel("Telefono", { exact: true }).fill("098765432");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

  await page.reload();
  clientRow = page.getByRole("row").filter({ hasText: EDITED_CLIENT_NAME });
  await expect(clientRow).toContainText("VIP");

  acceptConfirmation(page);
  await clientRow.getByRole("button", { name: "Papelera", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: EDITED_CLIENT_NAME })).toHaveCount(0);

  await page.goto("/administracion/papelera");
  const clientSection = page
    .locator("section.embedded-panel")
    .filter({ has: page.getByRole("heading", { name: "Clientes", exact: true }) });
  const trashedRow = clientSection.getByRole("row").filter({ hasText: EDITED_CLIENT_NAME });
  await expect(trashedRow).toBeVisible();
  await trashedRow.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(trashedRow).toHaveCount(0);

  await page.goto("/clientes");
  await page.reload();
  clientRow = page.getByRole("row").filter({ hasText: EDITED_CLIENT_NAME });
  await expect(clientRow).toContainText("INACTIVO");

  snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.clients.find((client) => client.id === clientId)).toMatchObject({
    name: EDITED_CLIENT_NAME,
    documentType: "CEDULA",
    documentId: DOCUMENT_ID,
    category: "VIP",
    phone: "098765432",
    status: "INACTIVO",
  });
  expect(snapshot.data.clients.find((client) => client.id === clientId)?.deletedAt).toBeUndefined();
  const actions = snapshot.data.audit
    .filter((event) => event.entityId === clientId)
    .map((event) => event.action);
  expect(actions).toEqual(
    expect.arrayContaining([
      "Crear cliente",
      "Editar cliente",
      "Enviar cliente a papelera",
      "Restaurar cliente",
    ]),
  );
  expect(
    snapshot.data.audit
      .filter((event) => event.entityId === clientId)
      .every((event) => event.actorRole === "ADMINISTRADOR"),
  ).toBe(true);
});

test("bloquea la eliminacion definitiva de un cliente con regalos y transferencias", async ({
  page,
}) => {
  await loginPoseidon(page, "user-admin");
  await page.goto("/clientes");

  const clientRow = page.getByRole("row").filter({ hasText: "Cliente frecuente" });
  acceptConfirmation(page);
  await clientRow.getByRole("button", { name: "Papelera", exact: true }).click();

  await page.goto("/administracion/papelera");
  const clientSection = page
    .locator("section.embedded-panel")
    .filter({ has: page.getByRole("heading", { name: "Clientes", exact: true }) });
  const trashedRow = clientSection.getByRole("row").filter({ hasText: "Cliente frecuente" });
  await trashedRow.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByText(
      "No se puede eliminar definitivamente: conserva 1 regalos, 1 transferencias. Mantenelo en la papelera.",
      { exact: true },
    ),
  ).toBeVisible();

  await page.reload();
  await expect(
    page
      .locator("section.embedded-panel")
      .filter({ has: page.getByRole("heading", { name: "Clientes", exact: true }) })
      .getByRole("row")
      .filter({ hasText: "Cliente frecuente" }),
  ).toBeVisible();
  const snapshot = await storedSnapshot<StoredData>(page);
  expect(snapshot.data.clients.find((client) => client.id === "client-1")?.status).toBe("PAPELERA");
  expect(snapshot.data.transfers.some((transfer) => transfer.clientId === "client-1")).toBe(true);
  expect(
    snapshot.data.gifts.some(
      (gift) => gift.clientId === "client-1" || gift.clientIds?.includes("client-1"),
    ),
  ).toBe(true);
  expect(
    snapshot.data.audit.some(
      (event) => event.entityId === "client-1" && event.action === "Eliminar definitivo cliente",
    ),
  ).toBe(false);
});
