import type { AppData, Expense, ExpenseReviewStatus, Role } from "../../types";
import { reverseSourceAccountMovements } from "../../lib/accountMovements";
import { historicalCashMutationError } from "../../lib/cashAvailability";
import { PRINCIPAL_BANK_ACCOUNT_ID, PRINCIPAL_CASH_ACCOUNT_ID } from "../../lib/currentAccounts";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { localCommandAccessError } from "../localAccess";
import { annulPrincipalExpenseCommand } from "./principalExpenseCommands";

const EXPENSE_CONTROL_ROLES: readonly Role[] = ["ENCARGADO", "ADMINISTRADOR"];
const REVIEW_STATUSES: readonly ExpenseReviewStatus[] = ["PENDIENTE", "REVISADO", "OBSERVADO"];

const expenseAccessError = (data: AppData, localId: string, context: CommandContext) =>
  localCommandAccessError(
    data,
    localId,
    context,
    EXPENSE_CONTROL_ROLES,
    "La funcion activa no permite revisar gastos.",
  );

const isPrincipalExpense = (expense: Expense) =>
  [PRINCIPAL_CASH_ACCOUNT_ID, PRINCIPAL_BANK_ACCOUNT_ID].includes(expense.paymentAccountId);

export type ReviewExpenseInput = {
  expenseId: string;
  status: ExpenseReviewStatus;
  note: string;
};

export function reviewExpenseCommand(
  data: AppData,
  input: ReviewExpenseInput,
  context: CommandContext,
): CommandResult<Expense> {
  const previous = data.expenses.find((expense) => expense.id === input.expenseId);
  if (!previous) return commandError("No se encontro el gasto.");
  const denied = expenseAccessError(data, previous.localId, context);
  if (denied) return commandError(denied);
  if (!REVIEW_STATUSES.includes(input.status)) return commandError("Selecciona un estado de revision valido.");
  const note = input.note.trim();
  if (input.status === "OBSERVADO" && !note) {
    return commandError("Para observar un gasto tenes que escribir una observacion.");
  }

  const next: Expense = {
    ...previous,
    reviewStatus: input.status,
    reviewedBy: context.user.id,
    reviewedAt: context.now(),
    reviewNote: note,
  };
  const mutated = {
    ...data,
    expenses: data.expenses.map((expense) => (expense.id === previous.id ? next : expense)),
  };
  return commandSuccess(
    auditCommand(
      mutated,
      context,
      "Revisar gasto",
      "Gasto",
      previous.id,
      previous,
      next,
      note,
      { localId: previous.localId },
    ),
    next,
  );
}

export function annulManagedExpenseCommand(
  data: AppData,
  expenseId: string,
  reason: string,
  context: CommandContext,
): CommandResult<Expense> {
  const previous = data.expenses.find((expense) => expense.id === expenseId);
  if (!previous) return commandError("No se encontro el gasto.");
  const denied = expenseAccessError(data, previous.localId, context);
  if (denied) return commandError(denied);
  if (previous.status === "ANULADO") return commandError("El gasto ya esta anulado.");
  const note = reason.trim();
  if (!note) return commandError("Para anular un gasto tenes que escribir el motivo.");
  if (isPrincipalExpense(previous)) {
    return annulPrincipalExpenseCommand(data, previous.id, note, context);
  }
  if (!previous.balanceId) return commandError("El gasto no tiene una caja asociada valida.");
  const balance = data.balances.find((item) => item.id === previous.balanceId);
  if (!balance || balance.localId !== previous.localId) {
    return commandError("El gasto no tiene una caja asociada valida.");
  }
  const mutationError = historicalCashMutationError(data, previous.localId, previous.balanceId);
  if (mutationError) return commandError(mutationError);

  const timestamp = context.now();
  const next: Expense = {
    ...previous,
    status: "ANULADO",
    reviewStatus: "OBSERVADO",
    reviewedBy: context.user.id,
    reviewedAt: timestamp,
    reviewNote: note,
  };
  const mutated = {
    ...data,
    expenses: data.expenses.map((expense) => (expense.id === previous.id ? next : expense)),
    accountMovements: reverseSourceAccountMovements(
      data.accountMovements,
      ["GASTO"],
      previous.id,
      context.user.id,
      note,
      timestamp,
    ),
  };
  return commandSuccess(
    auditCommand(
      mutated,
      context,
      "Anular gasto encargado",
      "Gasto",
      previous.id,
      previous,
      next,
      note,
      { localId: previous.localId },
    ),
    next,
  );
}
