import { describe, expect, it } from "vitest";
import { commandContext } from "../application/command";
import { openCashCommand } from "../application/cash/openCash";
import {
  annulCapitalMovementCommand,
  createCapitalMovementCommand,
  createExpenseCommand,
  deleteExpenseCommand,
} from "../application/movements/operatingMovementCommands";
import { createSeedData, POSEIDON_LOCAL_ID } from "../data/appData";
import type { AppData, Role } from "../types";
import { managerCashActivityForBalance } from "./managerCashActivity";

function actorContext(data: AppData, username: string, actorRole: Role, timestamp: string) {
  const user = data.users.find((item) => item.username === username)!;
  let sequence = 0;
  return commandContext(user, actorRole, {
    now: () => timestamp,
    id: (prefix) => `${prefix}-${username}-${++sequence}`,
  });
}

function setupOpenCash() {
  const seed = createSeedData();
  const clean: AppData = {
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
      operatingDate: "2026-07-17",
      initialFund: 10_000,
      initialBankFund: 5_000,
      initialNote: "Prueba de intervenciones",
      openingCapitalPerson: "MATHIAS",
      firstOpening: true,
    },
    actorContext(clean, "cajero1", "CAJERO", "2026-07-17T12:00:00.000Z"),
  );
  if (!opened.ok) throw new Error(opened.error);
  return { data: opened.data, balanceId: opened.value.id };
}

describe("actividad del encargado durante una caja", () => {
  it("resume gastos, aportes y retiros vigentes por cuenta", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const manager = actorContext(setup.data, "encargado", "ENCARGADO", "2026-07-17T13:00:00.000Z");
    const expense = createExpenseCommand(
      setup.data,
      {
        balanceId: setup.balanceId,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 1_000,
        description: "Compra del encargado",
      },
      manager,
    );
    expect(expense.ok).toBe(true);
    if (!expense.ok) return;
    const bankContribution = createCapitalMovementCommand(
      expense.data,
      {
        balanceId: setup.balanceId,
        type: "APORTE",
        medium: "TRANSFERENCIA",
        person: "RICARDO",
        amount: 500,
        note: "Aporte bancario",
      },
      manager,
    );
    expect(bankContribution.ok).toBe(true);
    if (!bankContribution.ok) return;
    const cashWithdrawal = createCapitalMovementCommand(
      bankContribution.data,
      {
        balanceId: setup.balanceId,
        type: "RETIRO",
        medium: "EFECTIVO",
        person: "MATHIAS",
        amount: 2_000,
        note: "Retiro operativo",
      },
      manager,
    );
    expect(cashWithdrawal.ok).toBe(true);
    if (!cashWithdrawal.ok) return;

    const activity = managerCashActivityForBalance(cashWithdrawal.data, setup.balanceId);
    expect(activity).toMatchObject({ cashNet: -3_000, bankNet: 500, activeCount: 3, annulledCount: 0 });
    expect(activity.items.map((item) => item.kind).sort()).toEqual(["APORTE", "GASTO", "RETIRO"]);
    expect(activity.items.every((item) => item.userName === "Encargado")).toBe(true);
  });

  it("conserva intervenciones anuladas sin sumarlas y excluye movimientos solo del cajero", () => {
    const setup = setupOpenCash();
    const category = setup.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const cashier = actorContext(setup.data, "cajero1", "CAJERO", "2026-07-17T13:00:00.000Z");
    const manager = actorContext(setup.data, "encargado", "ENCARGADO", "2026-07-17T14:00:00.000Z");
    const managerWithdrawal = createCapitalMovementCommand(
      setup.data,
      {
        balanceId: setup.balanceId,
        type: "RETIRO",
        medium: "EFECTIVO",
        person: "MATHIAS",
        amount: 1_000,
        note: "Luego anulado por cajero",
      },
      manager,
    );
    expect(managerWithdrawal.ok).toBe(true);
    if (!managerWithdrawal.ok) return;
    const annulledWithdrawal = annulCapitalMovementCommand(
      managerWithdrawal.data,
      setup.balanceId,
      managerWithdrawal.value.id,
      cashier,
    );
    expect(annulledWithdrawal.ok).toBe(true);
    if (!annulledWithdrawal.ok) return;
    const cashierExpense = createExpenseCommand(
      annulledWithdrawal.data,
      {
        balanceId: setup.balanceId,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 600,
        description: "Eliminado por encargado",
      },
      cashier,
    );
    expect(cashierExpense.ok).toBe(true);
    if (!cashierExpense.ok) return;
    const removedByManager = deleteExpenseCommand(
      cashierExpense.data,
      setup.balanceId,
      cashierExpense.value.id,
      manager,
    );
    expect(removedByManager.ok).toBe(true);
    if (!removedByManager.ok) return;
    const cashierOnlyExpense = createExpenseCommand(
      removedByManager.data,
      {
        balanceId: setup.balanceId,
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 300,
        description: "Solo cajero",
      },
      cashier,
    );
    expect(cashierOnlyExpense.ok).toBe(true);
    if (!cashierOnlyExpense.ok) return;

    const activity = managerCashActivityForBalance(cashierOnlyExpense.data, setup.balanceId);
    expect(activity).toMatchObject({ cashNet: 0, bankNet: 0, activeCount: 0, annulledCount: 2 });
    expect(activity.items).toHaveLength(2);
    expect(activity.items.every((item) => item.status === "ANULADO")).toBe(true);
    expect(activity.items.some((item) => item.detail.includes("Solo cajero"))).toBe(false);
  });
});
