import { describe, expect, it } from "vitest";
import { commandContext } from "../application/command";
import { createPrincipalExpenseCommand } from "../application/expenses/principalExpenseCommands";
import { saveSalarySettlementCommand } from "../application/salaries/salarySettlementCommands";
import { createPartnerMovementCommand } from "../application/treasury/treasuryCommands";
import { clearOperationalData, createSeedData, POSEIDON_LOCAL_ID } from "../data/appData";
import { summarizePeriodicRange } from "./periodicTotals";

describe("consolidado periodico", () => {
  it("incluye gastos y salarios de Principal sin confundir aportes de socios con resultado", () => {
    const data = clearOperationalData(createSeedData());
    const manager = data.users.find((user) => user.role === "ENCARGADO")!;
    const staff = data.staff.find((item) => item.status === "ACTIVO")!;
    let sequence = 0;
    const context = commandContext(manager, "ENCARGADO", {
      now: () => "2026-07-17T12:00:00.000Z",
      id: (prefix) => `${prefix}-periodic-${++sequence}`,
    });
    const funded = createPartnerMovementCommand(
      data,
      {
        localId: POSEIDON_LOCAL_ID,
        partner: "MATHIAS",
        type: "APORTE_SOCIO",
        medium: "EFECTIVO",
        amount: 2_000,
        note: "Fondo de prueba",
      },
      context,
    );
    if (!funded.ok) throw new Error(funded.error);
    const category = funded.data.expenseCategories.find((item) => item.status === "ACTIVA")!;
    const expense = createPrincipalExpenseCommand(
      funded.data,
      {
        localId: POSEIDON_LOCAL_ID,
        paymentAccountId: "account-principal-efectivo-uyu",
        category: category.name,
        subcategory: category.subcategories[0],
        amount: 200,
        description: "Gasto principal",
      },
      context,
    );
    if (!expense.ok) throw new Error(expense.error);
    const salary = saveSalarySettlementCommand(
      expense.data,
      {
        staffId: staff.id,
        period: "2026-07",
        concept: "SALARIO",
        amount: 300,
        notes: "Pago principal",
        origin: "LIQUIDACION",
      },
      context,
    );
    if (!salary.ok) throw new Error(salary.error);

    const totals = summarizePeriodicRange(salary.data, {
      balances: [],
      localIds: [POSEIDON_LOCAL_ID],
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      type: "MENSUAL",
    });
    expect(totals).toMatchObject({
      totalExpenses: 200,
      totalSalaries: 300,
      totalOutflows: 500,
      commercialResult: -500,
      totalPartnerContributions: 2_000,
      totalPartnerWithdrawals: 0,
    });
    expect(totals.principalExpenseIds).toEqual([expense.value.id]);
    expect(totals.principalSalarySettlementIds).toEqual([salary.value.id]);
  });
});
