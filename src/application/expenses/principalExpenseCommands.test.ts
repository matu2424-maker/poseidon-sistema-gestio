import { describe, expect, it } from "vitest";
import { clearOperationalData, createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { principalAccountBalances } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { createPartnerMovementCommand } from "../treasury/treasuryCommands";
import { annulPrincipalExpenseCommand, createPrincipalExpenseCommand } from "./principalExpenseCommands";

function setupWithPrincipalCash(amount: number) {
  const data = clearOperationalData(createSeedData());
  const manager = data.users.find((user) => user.role === "ENCARGADO")!;
  let sequence = 0;
  const context = commandContext(manager, "ENCARGADO", {
    now: () => "2026-07-17T12:00:00.000Z",
    id: (prefix) => `${prefix}-test-${++sequence}`,
  });
  const contribution = createPartnerMovementCommand(
    data,
    {
      localId: POSEIDON_LOCAL_ID,
      partner: "MATHIAS",
      type: "APORTE_SOCIO",
      medium: "EFECTIVO",
      amount,
      note: "Fondo para gastos principales",
    },
    context,
  );
  if (!contribution.ok) throw new Error(contribution.error);
  return { data: contribution.data, context };
}

describe("gastos desde Principal", () => {
  it("acepta el disponible exacto y conserva local, cuenta, moneda y auditoria", () => {
    const setup = setupWithPrincipalCash(2_000);
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const result = createPrincipalExpenseCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        paymentAccountId: "account-principal-efectivo-uyu",
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 2_000,
        description: "Pago central",
      },
      setup.context,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      localId: POSEIDON_LOCAL_ID,
      paymentAccountId: "account-principal-efectivo-uyu",
      currency: "UYU",
    });
    expect(result.value).not.toHaveProperty("balanceId");
    expect(principalAccountBalances(result.data).cash).toBe(0);
    expect(result.data.audit[0]).toMatchObject({ action: "Crear gasto desde Principal", actorRole: "ENCARGADO" });
  });

  it("rechaza excedentes sin mutar y anula con un reverso auditado", () => {
    const setup = setupWithPrincipalCash(1_000);
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const before = JSON.stringify(setup.data);
    const rejected = createPrincipalExpenseCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        paymentAccountId: "account-principal-efectivo-uyu",
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 1_001,
        description: "Sin fondos",
      },
      setup.context,
    );
    expect(rejected).toMatchObject({ ok: false });
    expect(JSON.stringify(setup.data)).toBe(before);

    const created = createPrincipalExpenseCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        paymentAccountId: "account-principal-efectivo-uyu",
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 400,
        description: "Anular despues",
      },
      setup.context,
    );
    if (!created.ok) throw new Error(created.error);
    const annulled = annulPrincipalExpenseCommand(created.data, created.value.id, "Carga equivocada", setup.context);
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(principalAccountBalances(annulled.data).cash).toBe(1_000);
    expect(annulled.value.status).toBe("ANULADO");
    expect(annulled.data.accountMovements.some((movement) => movement.reversalOf)).toBe(true);
  });

  it("rechaza la suplantacion de funcion antes de mutar", () => {
    const setup = setupWithPrincipalCash(1_000);
    const cashier = setup.data.users.find((user) => user.role === "CAJERO")!;
    const spoofedContext = commandContext(cashier, "ENCARGADO", {
      now: () => "2026-07-17T12:30:00.000Z",
      id: (prefix) => `${prefix}-spoofed`,
    });
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const before = JSON.stringify(setup.data);
    const rejected = createPrincipalExpenseCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        paymentAccountId: "account-principal-efectivo-uyu",
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 100,
        description: "No autorizado",
      },
      spoofedContext,
    );
    expect(rejected).toEqual({ ok: false, error: "La funcion activa no corresponde al usuario autenticado." });
    expect(JSON.stringify(setup.data)).toBe(before);
  });
});
