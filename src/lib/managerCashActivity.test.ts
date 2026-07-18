import { describe, expect, it } from "vitest";
import { commandContext } from "../application/command";
import { openCashCommand } from "../application/cash/openCash";
import { createExpenseCommand } from "../application/movements/operatingMovementCommands";
import {
  annulTreasuryTransferCommand,
  createPartnerMovementCommand,
  createTreasuryTransferCommand,
} from "../application/treasury/treasuryCommands";
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
    treasuryTransfers: [],
    partnerMovements: [],
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
  it("resume los traspasos vigentes entre Caja y Principal por cuenta", () => {
    const setup = setupOpenCash();
    const manager = actorContext(setup.data, "encargado", "ENCARGADO", "2026-07-17T13:00:00.000Z");
    const principalFunding = createPartnerMovementCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        partner: "RICARDO",
        type: "APORTE_SOCIO",
        medium: "BANCO",
        amount: 500,
        note: "Fondos para Caja / Banco",
      },
      manager,
    );
    expect(principalFunding.ok).toBe(true);
    if (!principalFunding.ok) return;
    const bankContribution = createTreasuryTransferCommand(
      principalFunding.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setup.balanceId,
        type: "APORTE_CAJA",
        medium: "BANCO",
        amount: 500,
        note: "Principal a Caja",
      },
      manager,
    );
    expect(bankContribution.ok).toBe(true);
    if (!bankContribution.ok) return;
    const cashWithdrawal = createTreasuryTransferCommand(
      bankContribution.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setup.balanceId,
        type: "RETIRO_CAJA",
        medium: "EFECTIVO",
        amount: 2_000,
        note: "Caja a Principal",
      },
      manager,
    );
    expect(cashWithdrawal.ok).toBe(true);
    if (!cashWithdrawal.ok) return;

    const activity = managerCashActivityForBalance(cashWithdrawal.data, setup.balanceId);
    expect(activity).toMatchObject({ cashNet: -2_000, bankNet: 500, activeCount: 2, annulledCount: 0 });
    expect(activity.items.map((item) => item.kind).sort()).toEqual(["CAJA_A_PRINCIPAL", "PRINCIPAL_A_CAJA"]);
    expect(activity.items.every((item) => item.userName === "Encargado")).toBe(true);
  });

  it("conserva un traspaso anulado y excluye movimientos hechos solo por el cajero", () => {
    const setup = setupOpenCash();
    const cashier = actorContext(setup.data, "cajero1", "CAJERO", "2026-07-17T13:00:00.000Z");
    const manager = actorContext(setup.data, "encargado", "ENCARGADO", "2026-07-17T14:00:00.000Z");
    const managerWithdrawal = createTreasuryTransferCommand(
      setup.data,
      {
        localId: POSEIDON_LOCAL_ID,
        balanceId: setup.balanceId,
        type: "RETIRO_CAJA",
        medium: "EFECTIVO",
        amount: 1_000,
        note: "Luego anulado",
      },
      manager,
    );
    expect(managerWithdrawal.ok).toBe(true);
    if (!managerWithdrawal.ok) return;
    const annulledWithdrawal = annulTreasuryTransferCommand(
      managerWithdrawal.data,
      managerWithdrawal.value.id,
      manager,
      "Operacion cancelada",
    );
    expect(annulledWithdrawal.ok).toBe(true);
    if (!annulledWithdrawal.ok) return;
    const category = annulledWithdrawal.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const cashierOnlyExpense = createExpenseCommand(
      annulledWithdrawal.data,
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
    expect(activity).toMatchObject({ cashNet: 0, bankNet: 0, activeCount: 0, annulledCount: 1 });
    expect(activity.items).toHaveLength(1);
    expect(activity.items[0]).toMatchObject({ kind: "CAJA_A_PRINCIPAL", status: "ANULADO" });
    expect(activity.items.some((item) => item.detail.includes("Solo cajero"))).toBe(false);
  });
});
