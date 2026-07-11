import { describe, expect, it } from "vitest";
import { createSeedData, POSEIDON_LOCAL_ID } from "../../data/appData";
import { accountTotals, localAccountBalances, TRANSFER_ACCOUNT_ID } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { openCashCommand } from "../cash/openCash";
import {
  annulCapitalMovementCommand,
  annulTransferCommand,
  createCapitalMovementCommand,
  createExpenseCommand,
  createGiftCommand,
  createTransferCommand,
  deleteExpenseCommand,
  deleteGiftCommand,
} from "./operatingMovementCommands";

function setupOpenCash() {
  const seed = createSeedData();
  const user = seed.users.find((item) => item.username === "cajero1")!;
  let sequence = 0;
  const context = commandContext(user, "CAJERO", {
    now: () => "2026-07-11T12:00:00.000Z",
    id: (prefix) => `${prefix}-test-${++sequence}`,
  });
  const clean = {
    ...seed,
    balances: [],
    readings: [],
    expenses: [],
    transfers: [],
    gifts: [],
    capitalMovements: [],
    accountMovements: [],
    audit: [],
  };
  const opened = openCashCommand(
    clean,
    {
      localId: POSEIDON_LOCAL_ID,
      operatingDate: "2026-07-11",
      initialFund: 10_000,
      initialBankFund: 5_000,
      initialNote: "Prueba",
      openingCapitalPerson: "MATHIAS",
      firstOpening: true,
    },
    context,
  );
  if (!opened.ok) throw new Error(opened.error);
  return { data: opened.data, balance: opened.value, context };
}

describe("comandos de movimientos operativos", () => {
  it("crea y elimina gasto/regalo manteniendo cuenta local y auditoria", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const expenseResult = createExpenseCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 1_000,
        description: "Insumos",
      },
      setup.context,
    );
    expect(expenseResult.ok).toBe(true);
    if (!expenseResult.ok) return;

    const client = expenseResult.data.clients.find((item) => item.status === "ACTIVO")!;
    const giftResult = createGiftCommand(
      expenseResult.data,
      {
        balanceId: setup.balance.id,
        clientIds: [client.id],
        amount: 500,
        reference: "Cajero",
        description: "Atencion",
      },
      setup.context,
    );
    expect(giftResult.ok).toBe(true);
    if (!giftResult.ok) return;
    expect(localAccountBalances(giftResult.data, POSEIDON_LOCAL_ID).cash).toBe(8_500);

    const expenseDeleted = deleteExpenseCommand(
      giftResult.data,
      setup.balance.id,
      expenseResult.value.id,
      setup.context,
    );
    expect(expenseDeleted.ok).toBe(true);
    if (!expenseDeleted.ok) return;
    const giftDeleted = deleteGiftCommand(
      expenseDeleted.data,
      setup.balance.id,
      giftResult.value.id,
      setup.context,
    );
    expect(giftDeleted.ok).toBe(true);
    if (!giftDeleted.ok) return;
    expect(localAccountBalances(giftDeleted.data, POSEIDON_LOCAL_ID).cash).toBe(10_000);
    expect(giftDeleted.data.expenses).toHaveLength(0);
    expect(giftDeleted.data.gifts).toHaveLength(0);
    expect(giftDeleted.data.audit[0]).toMatchObject({
      action: "Eliminar regalo antes de cierre",
      createdAt: "2026-07-11T12:00:00.000Z",
    });
  });

  it("crea y anula transferencia con contramovimientos en ambas cuentas", () => {
    const setup = setupOpenCash();
    const transferResult = createTransferCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        receipt: "TRX-1",
        name: "Cobro banco",
        amount: 2_000,
        account: "Cuenta unica inicial",
      },
      setup.context,
    );
    expect(transferResult.ok).toBe(true);
    if (!transferResult.ok) return;
    expect(localAccountBalances(transferResult.data, POSEIDON_LOCAL_ID).bank).toBe(7_000);
    expect(accountTotals(transferResult.data, TRANSFER_ACCOUNT_ID).balance).toBe(2_000);

    const annulled = annulTransferCommand(
      transferResult.data,
      setup.balance.id,
      transferResult.value.id,
      setup.context,
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(localAccountBalances(annulled.data, POSEIDON_LOCAL_ID).bank).toBe(5_000);
    expect(accountTotals(annulled.data, TRANSFER_ACCOUNT_ID).balance).toBe(0);
    expect(annulled.data.accountMovements.filter((item) => item.reversalOf)).toHaveLength(2);
  });

  it("registra aportes/retiros y anula mediante reverso sin borrar historial", () => {
    const setup = setupOpenCash();
    const contribution = createCapitalMovementCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        type: "APORTE",
        medium: "EFECTIVO",
        person: "RICARDO",
        amount: 2_000,
        note: "Refuerzo",
      },
      setup.context,
    );
    expect(contribution.ok).toBe(true);
    if (!contribution.ok) return;
    const withdrawal = createCapitalMovementCommand(
      contribution.data,
      {
        balanceId: setup.balance.id,
        type: "RETIRO",
        medium: "EFECTIVO",
        person: "MATHIAS",
        amount: 1_000,
        note: "Retiro parcial",
      },
      setup.context,
    );
    expect(withdrawal.ok).toBe(true);
    if (!withdrawal.ok) return;
    expect(localAccountBalances(withdrawal.data, POSEIDON_LOCAL_ID).cash).toBe(11_000);

    const annulled = annulCapitalMovementCommand(
      withdrawal.data,
      setup.balance.id,
      withdrawal.value.id,
      setup.context,
    );
    expect(annulled.ok).toBe(true);
    if (!annulled.ok) return;
    expect(localAccountBalances(annulled.data, POSEIDON_LOCAL_ID).cash).toBe(12_000);
    expect(annulled.data.capitalMovements.find((item) => item.id === withdrawal.value.id)?.status).toBe("ANULADO");
    expect(annulled.data.accountMovements.some((item) => item.reversalOf)).toBe(true);
  });

  it("rechaza operaciones sin funcion cajero o con caja cerrada", () => {
    const setup = setupOpenCash();
    const managerContext = { ...setup.context, actorRole: "ENCARGADO" as const };
    const denied = createTransferCommand(
      setup.data,
      {
        balanceId: setup.balance.id,
        receipt: "TRX-2",
        name: "No permitido",
        amount: 100,
        account: "Banco",
      },
      managerContext,
    );
    expect(denied).toEqual({ ok: false, error: "Para operar movimientos hay que trabajar con la funcion Cajero." });

    const closedData = {
      ...setup.data,
      balances: setup.data.balances.map((item) =>
        item.id === setup.balance.id ? { ...item, status: "CERRADO" as const } : item,
      ),
    };
    const closed = createGiftCommand(
      closedData,
      {
        balanceId: setup.balance.id,
        clientIds: [setup.data.clients[0].id],
        amount: 100,
        reference: "Cajero",
        description: "",
      },
      setup.context,
    );
    expect(closed).toEqual({ ok: false, error: "La caja ya no esta abierta." });
  });
});
