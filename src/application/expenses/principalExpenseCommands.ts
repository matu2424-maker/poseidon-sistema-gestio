import type { AppData, Expense } from "../../types";
import {
  localExpenseAccountMovement,
  reverseSourceAccountMovements,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { accountOutflowError } from "../../lib/cashAvailability";
import {
  ensureFinancialCurrentAccounts,
  PRINCIPAL_BANK_ACCOUNT_ID,
  PRINCIPAL_CASH_ACCOUNT_ID,
} from "../../lib/currentAccounts";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { localCommandAccessError } from "../localAccess";

export type CreatePrincipalExpenseInput = {
  localId: string;
  paymentAccountId: string;
  category: string;
  subcategory: string;
  amount: number;
  description: string;
  receiptFileName?: string;
  receiptFileType?: string;
};

function accessError(data: AppData, localId: string, context: CommandContext) {
  return localCommandAccessError(
    data,
    localId,
    context,
    ["ENCARGADO", "ADMINISTRADOR"],
    "La funcion activa no permite registrar gastos desde Principal.",
  );
}

export function createPrincipalExpenseCommand(
  data: AppData,
  input: CreatePrincipalExpenseInput,
  context: CommandContext,
): CommandResult<Expense> {
  const denied = accessError(data, input.localId, context);
  if (denied) return commandError(denied);
  if (![PRINCIPAL_CASH_ACCOUNT_ID, PRINCIPAL_BANK_ACCOUNT_ID].includes(input.paymentAccountId)) {
    return commandError("Selecciona Principal / Efectivo o Principal / Banco.");
  }
  if (!input.category.trim() || !input.subcategory.trim()) {
    return commandError("Categoria y subcategoria son obligatorias.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return commandError("El monto debe ser un numero finito mayor a cero.");
  }
  const prepared: AppData = {
    ...data,
    currentAccounts: ensureFinancialCurrentAccounts(data, input.localId),
  };
  const outflowError = accountOutflowError(prepared, input.paymentAccountId, input.amount);
  if (outflowError) return commandError(outflowError);
  const timestamp = context.now();
  const expense: Expense = {
    id: context.id("principal-expense"),
    localId: input.localId,
    paymentAccountId: input.paymentAccountId,
    currency: "UYU",
    category: input.category.trim(),
    subcategory: input.subcategory.trim(),
    amount: input.amount,
    description: input.description.trim(),
    receipt: input.receiptFileName ?? "",
    receiptFileName: input.receiptFileName,
    receiptFileType: input.receiptFileType,
    status: "ACTIVO",
    reviewStatus: "PENDIENTE",
    userId: context.user.id,
    createdAt: timestamp,
  };
  const mutated = {
    ...prepared,
    expenses: [expense, ...prepared.expenses],
    accountMovements: upsertAccountMovement(
      prepared.accountMovements,
      localExpenseAccountMovement(expense, input.localId),
    ),
  };
  return commandSuccess(
    auditCommand(mutated, context, "Crear gasto desde Principal", "Gasto", expense.id, "", expense),
    expense,
  );
}

export function annulPrincipalExpenseCommand(
  data: AppData,
  expenseId: string,
  reason: string,
  context: CommandContext,
): CommandResult<Expense> {
  const previous = data.expenses.find((expense) => expense.id === expenseId);
  if (!previous) return commandError("No se encontro el gasto.");
  const denied = accessError(data, previous.localId, context);
  if (denied) return commandError(denied);
  if (![PRINCIPAL_CASH_ACCOUNT_ID, PRINCIPAL_BANK_ACCOUNT_ID].includes(previous.paymentAccountId)) {
    return commandError("Este gasto pertenece a Caja y debe respetar el cierre asociado.");
  }
  if (previous.status === "ANULADO") return commandError("El gasto ya esta anulado.");
  const note = reason.trim();
  if (!note) return commandError("La anulacion requiere un motivo.");
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
    auditCommand(mutated, context, "Anular gasto desde Principal", "Gasto", previous.id, previous, next, note),
    next,
  );
}
