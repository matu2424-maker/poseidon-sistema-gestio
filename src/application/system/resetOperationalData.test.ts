import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import { localAccountBalances, partnerAccountBalance, principalAccountBalances } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { operationalDataSummary, resetOperationalDataCommand } from "./resetOperationalData";

describe("reinicio operativo local", () => {
  it("conserva maestros y deja operaciones, contadores y cuentas en cero con auditoria nueva", () => {
    const data = createSeedData();
    const admin = data.users.find((user) => user.role === "ADMINISTRADOR")!;
    const result = resetOperationalDataCommand(
      data,
      commandContext(admin, "ADMINISTRADOR", {
        now: () => "2026-07-18T12:00:00.000-03:00",
        id: (prefix) => `${prefix}-clean-reset`,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.users).toEqual(data.users);
    expect(result.data.locals).toEqual(data.locals);
    expect(result.data.clients).toEqual(data.clients);
    expect(result.data.expenseCategories).toEqual(data.expenseCategories);
    expect(result.data.currentAccounts).toEqual(data.currentAccounts);
    expect(result.data.salaryHistories).toEqual(data.salaryHistories);
    expect(result.data.machines).toHaveLength(data.machines.length);
    expect(result.data.machines.every((machine) => machine.lastIn === 0 && machine.lastOut === 0)).toBe(true);
    expect(result.data.staff.every((staff) => staff.salaryAdvanceBalance === 0)).toBe(true);
    expect(result.data.machineLocalHistory).toEqual([]);
    expect(operationalDataSummary(result.data)).toMatchObject({
      balances: 0,
      readings: 0,
      expenses: 0,
      transfers: 0,
      gifts: 0,
      salarySettlements: 0,
      periodicClosures: 0,
      salaryClosures: 0,
      financialMovements: 0,
      auditEvents: 1,
    });
    expect(localAccountBalances(result.data, data.locals[0].id)).toEqual({ cash: 0, bank: 0 });
    expect(principalAccountBalances(result.data)).toEqual({ cash: 0, bank: 0 });
    expect(partnerAccountBalance(result.data, "MATHIAS")).toBe(0);
    expect(partnerAccountBalance(result.data, "RICARDO")).toBe(0);
    expect(result.data.audit[0]).toMatchObject({
      id: "audit-clean-reset",
      userId: admin.id,
      actorRole: "ADMINISTRADOR",
      action: "Crear base operativa limpia",
      entity: "Sistema",
      entityId: "operational-data",
      createdAt: "2026-07-18T12:00:00.000-03:00",
    });
  });

  it("rechaza el reinicio fuera de la funcion Administrador sin modificar datos", () => {
    const data = createSeedData();
    const admin = data.users.find((user) => user.role === "ADMINISTRADOR")!;
    const result = resetOperationalDataCommand(data, commandContext(admin, "CAJERO"));

    expect(result).toEqual({
      ok: false,
      error: "Solo un Administrador en funcion Administrador puede reiniciar los datos operativos.",
    });
    expect(data.balances.length).toBeGreaterThan(0);
  });
});
