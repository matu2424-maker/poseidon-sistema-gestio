import { describe, expect, it } from "vitest";
import { createSeedData } from "../../data/appData";
import { validateAppData } from "../../infrastructure/storage/appDataValidation";
import { localAccountBalances } from "../../lib/currentAccounts";
import { commandContext } from "../command";
import { annulManagedExpenseCommand, reviewExpenseCommand } from "./expenseReviewCommands";

const setup = () => {
  const data = createSeedData();
  const manager = data.users.find((user) => user.role === "ENCARGADO")!;
  let sequence = 0;
  return {
    data,
    manager,
    context: commandContext(manager, "ENCARGADO", {
      now: () => "2026-07-19T13:00:00.000Z",
      id: (prefix) => `${prefix}-expense-review-${++sequence}`,
    }),
  };
};

describe("control administrativo de gastos", () => {
  it("revisa sin alterar cuentas y exige nota cuando queda observado", () => {
    const current = setup();
    const expense = current.data.expenses.find((item) => item.id === "expense-demo-1")!;
    const movementsBefore = JSON.stringify(current.data.accountMovements);
    const rejected = reviewExpenseCommand(
      current.data,
      { expenseId: expense.id, status: "OBSERVADO", note: "" },
      current.context,
    );
    expect(rejected).toEqual({
      ok: false,
      error: "Para observar un gasto tenes que escribir una observacion.",
    });

    const reviewed = reviewExpenseCommand(
      current.data,
      { expenseId: expense.id, status: "REVISADO", note: "Comprobante controlado" },
      current.context,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.value).toMatchObject({
      reviewStatus: "REVISADO",
      reviewedBy: current.manager.id,
      reviewedAt: "2026-07-19T13:00:00.000Z",
      reviewNote: "Comprobante controlado",
    });
    expect(JSON.stringify(reviewed.data.accountMovements)).toBe(movementsBefore);
    expect(reviewed.data.audit[0]).toMatchObject({
      action: "Revisar gasto",
      actorRole: "ENCARGADO",
      localId: expense.localId,
    });
  });

  it("anula un gasto de Caja con reverso unico, saldo restaurado y auditoria", () => {
    const current = setup();
    const expense = current.data.expenses.find((item) => item.id === "expense-demo-1")!;
    const cashBefore = localAccountBalances(current.data, expense.localId).cash;
    const result = annulManagedExpenseCommand(
      current.data,
      expense.id,
      "Comprobante duplicado",
      current.context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      status: "ANULADO",
      reviewStatus: "OBSERVADO",
      reviewNote: "Comprobante duplicado",
    });
    expect(localAccountBalances(result.data, expense.localId).cash).toBe(cashBefore + expense.amount);
    expect(
      result.data.accountMovements.filter(
        (movement) => movement.sourceId === expense.id && movement.reversalOf,
      ),
    ).toHaveLength(1);
    expect(result.data.audit[0]).toMatchObject({
      action: "Anular gasto encargado",
      actorRole: "ENCARGADO",
      localId: expense.localId,
    });
    expect(validateAppData(result.data)).toMatchObject({ ok: true });
    expect(annulManagedExpenseCommand(result.data, expense.id, "Otra vez", current.context)).toEqual({
      ok: false,
      error: "El gasto ya esta anulado.",
    });
  });

  it("rechaza la funcion suplantada y una anulacion historica durante otra caja abierta", () => {
    const current = setup();
    const expense = current.data.expenses.find((item) => item.id === "expense-demo-1")!;
    const cashier = current.data.users.find((user) => user.role === "CAJERO")!;
    expect(
      reviewExpenseCommand(
        current.data,
        { expenseId: expense.id, status: "REVISADO", note: "" },
        commandContext(cashier, "ENCARGADO"),
      ),
    ).toEqual({ ok: false, error: "La funcion activa no corresponde al usuario autenticado." });

    const openBalance = {
      ...current.data.balances[0],
      id: "balance-open-review-test",
      visibleId: "POSE-99",
      status: "EN_PROCESO" as const,
      closedAt: undefined,
    };
    const withOpenBalance = { ...current.data, balances: [openBalance, ...current.data.balances] };
    const before = JSON.stringify(withOpenBalance);
    expect(
      annulManagedExpenseCommand(withOpenBalance, expense.id, "Intento historico", current.context),
    ).toEqual({
      ok: false,
      error:
        "No se puede modificar un movimiento historico de efectivo mientras el local tiene una caja abierta. Cierra la caja o realiza la correccion sobre la recaudacion vigente.",
    });
    expect(JSON.stringify(withOpenBalance)).toBe(before);
  });
});
