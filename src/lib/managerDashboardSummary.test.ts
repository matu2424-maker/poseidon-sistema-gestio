import { describe, expect, it } from "vitest";
import { createSeedData } from "../data/appData";
import { PRINCIPAL_CASH_ACCOUNT_ID } from "./currentAccounts";
import { managerDashboardSummary } from "./managerDashboardSummary";

describe("resumen del panel del encargado", () => {
  it("consolida julio por local sin cambiar la formula economica", () => {
    const data = createSeedData();
    const summary = managerDashboardSummary(data, data.locals[0].id, "2026-07-18");

    expect(summary.differences).toEqual({ pending: 1, total: 1, cash: -1000, bank: 1000 });
    expect(summary.economic).toEqual({
      closedBalances: 3,
      machineResult: 35000,
      machineLoss: 0,
      expenses: 7500,
      salaries: 13000,
      gifts: 2500,
      income: 35000,
      outcome: 23000,
      net: 12000,
    });
    expect(summary.balances.liquidity.total).toBe(
      summary.balances.caja.cash +
        summary.balances.caja.bank +
        summary.balances.principal.cash +
        summary.balances.principal.bank,
    );
  });

  it("trata un resultado de maquinas negativo como salida economica", () => {
    const data = createSeedData();
    const localId = data.locals[0].id;
    const balance = {
      ...data.balances[0],
      id: "balance-negative",
      visibleId: "POSE-99",
      localId,
      operatingDate: "2026-08-05",
      closedAt: "2026-08-05T23:00:00.000-03:00",
      cashDifference: 0,
      bankDifference: 0,
    };
    const reading = {
      ...data.readings[0],
      id: "reading-negative",
      balanceId: balance.id,
      result: -5000,
      updatedAt: "2026-08-05T22:00:00.000-03:00",
    };
    const summary = managerDashboardSummary(
      {
        ...data,
        balances: [balance],
        readings: [reading],
        expenses: [],
        salarySettlements: [],
        gifts: [],
      },
      localId,
      "2026-08-18",
    );

    expect(summary.economic).toMatchObject({
      machineResult: -5000,
      machineLoss: 5000,
      income: 0,
      outcome: 5000,
      net: -5000,
    });
  });

  it("limita la actividad reciente a cuentas monetarias del local", () => {
    const data = createSeedData();
    const localId = data.locals[0].id;
    const foreignMovement = {
      ...data.accountMovements[0],
      id: "movement-other-local",
      accountId: PRINCIPAL_CASH_ACCOUNT_ID,
      localId: "local-other",
      createdAt: "2026-07-18T23:59:00.000-03:00",
    };
    const summary = managerDashboardSummary(
      { ...data, accountMovements: [foreignMovement, ...data.accountMovements] },
      localId,
      "2026-07-18",
    );

    expect(summary.recentActivity).toHaveLength(5);
    expect(summary.recentActivity.some((row) => row.id === foreignMovement.id)).toBe(false);
    expect(summary.recentActivity).toEqual(
      [...summary.recentActivity].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
    );
  });
});
