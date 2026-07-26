import type { AppData, Balance, DifferenceStatus } from "../../types";
import { syncDifferenceAccountMovements } from "../../lib/accountMovements";
import { ensureLocalCurrentAccounts, localAccountBalances } from "../../lib/currentAccounts";
import {
  bankDifferenceForBalance,
  canTransitionDifferenceStatus,
  cashDifferenceForBalance,
  normalizeDifferenceStatus,
} from "../../lib/differences";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { commandFunctionAccessError, localCommandAccessError } from "../localAccess";

export type ManageDifferenceInput = {
  balanceId: string;
  status: Exclude<DifferenceStatus, "PENDIENTE">;
  reviewNote: string;
  correctedCash?: number;
  correctedBank?: number;
};

export function manageDifferenceCommand(
  data: AppData,
  input: ManageDifferenceInput,
  context: CommandContext,
): CommandResult<Balance> {
  const functionError = commandFunctionAccessError(
    context,
    ["ENCARGADO", "ADMINISTRADOR"],
    "Solo administrador o encargado pueden gestionar diferencias.",
  );
  if (functionError) return commandError(functionError);
  if (!(["VERIFICADA", "CORREGIDA", "ANULADA"] as DifferenceStatus[]).includes(input.status)) {
    return commandError("Selecciona una accion valida para gestionar la diferencia.");
  }
  const reviewNote = input.reviewNote.trim();
  if (!reviewNote) return commandError("La observacion del encargado/admin es obligatoria.");
  const previous = data.balances.find((balance) => balance.id === input.balanceId);
  if (!previous) return commandError("No se encontro la recaudacion.");
  if (previous.status !== "CERRADO") return commandError("Solo se gestionan diferencias de cajas cerradas.");
  const localError = localCommandAccessError(
    data,
    previous.localId,
    context,
    ["ENCARGADO", "ADMINISTRADOR"],
    "Solo administrador o encargado pueden gestionar diferencias.",
  );
  if (localError) return commandError(localError);
  if (data.balances.some((balance) => balance.localId === previous.localId && balance.status === "EN_PROCESO")) {
    return commandError("No se pueden gestionar diferencias mientras exista una caja abierta en el mismo local.");
  }
  const previousDifferenceStatus = normalizeDifferenceStatus(previous) ?? "PENDIENTE";
  if (!canTransitionDifferenceStatus(previousDifferenceStatus, input.status)) {
    return commandError(`No se puede cambiar una diferencia de ${previousDifferenceStatus} a ${input.status}.`);
  }

  const previousCashDifference = cashDifferenceForBalance(data, previous);
  const previousBankDifference = bankDifferenceForBalance(previous);
  const previousDeclaredCash = previous.declaredCash ?? 0;
  const previousDeclaredBank = previous.declaredBank ?? previous.nextBankBase ?? 0;
  const accountBalancesBefore = localAccountBalances(data, previous.localId);
  const previousAmounts = [
    previous.initialFund,
    previous.initialBankFund ?? 0,
    previousDeclaredCash,
    previousDeclaredBank,
    previous.nextBase ?? previousDeclaredCash,
    previous.nextBankBase ?? previousDeclaredBank,
    previousCashDifference,
    previousBankDifference,
    accountBalancesBefore.cash,
    accountBalancesBefore.bank,
  ];
  if (!previousAmounts.every((amount) => Number.isFinite(amount))) {
    return commandError("Los importes de la diferencia deben ser numeros finitos.");
  }
  const expectedCash = previousDeclaredCash - previousCashDifference;
  const expectedBank = previousDeclaredBank - previousBankDifference;
  if (
    input.status === "CORREGIDA" &&
    (input.correctedCash === undefined ||
      input.correctedBank === undefined ||
      !Number.isFinite(input.correctedCash) ||
      !Number.isFinite(input.correctedBank))
  ) {
    return commandError("Completa importes validos de efectivo y banco para corregir la diferencia.");
  }
  const correctedCash = input.status === "CORREGIDA" ? Number(input.correctedCash) : previousDeclaredCash;
  const correctedBank = input.status === "CORREGIDA" ? Number(input.correctedBank) : previousDeclaredBank;
  if (correctedCash < 0 || correctedBank < 0) return commandError("Los importes corregidos no pueden ser negativos.");

  const nextDeclaredCash = input.status === "CORREGIDA" ? correctedCash : input.status === "ANULADA" ? expectedCash : previousDeclaredCash;
  const nextDeclaredBank = input.status === "CORREGIDA" ? correctedBank : input.status === "ANULADA" ? expectedBank : previousDeclaredBank;
  const nextCashDifference = input.status === "CORREGIDA" ? correctedCash - expectedCash : input.status === "ANULADA" ? 0 : previousCashDifference;
  const nextBankDifference = input.status === "CORREGIDA" ? correctedBank - expectedBank : input.status === "ANULADA" ? 0 : previousBankDifference;
  if (
    ![
      expectedCash,
      expectedBank,
      correctedCash,
      correctedBank,
      nextDeclaredCash,
      nextDeclaredBank,
      nextCashDifference,
      nextBankDifference,
    ].every((amount) => Number.isFinite(amount))
  ) {
    return commandError("Los importes de la diferencia deben ser numeros finitos.");
  }
  const reviewedAt = context.now();
  const next: Balance = {
    ...previous,
    declaredCash: input.status === "CORREGIDA" || input.status === "ANULADA" ? nextDeclaredCash : previous.declaredCash,
    declaredBank: input.status === "CORREGIDA" || input.status === "ANULADA" ? nextDeclaredBank : previous.declaredBank,
    nextBase: input.status === "CORREGIDA" || input.status === "ANULADA" ? nextDeclaredCash : previous.nextBase,
    nextBankBase: input.status === "CORREGIDA" || input.status === "ANULADA" ? nextDeclaredBank : previous.nextBankBase,
    cashDifference: input.status === "CORREGIDA" || input.status === "ANULADA" ? nextCashDifference : previous.cashDifference,
    bankDifference: input.status === "CORREGIDA" || input.status === "ANULADA" ? nextBankDifference : previous.bankDifference,
    differenceStatus: input.status,
    differenceReviewedBy: context.user.id,
    differenceReviewedAt: reviewedAt,
    differenceReviewNote: reviewNote,
  };
  const balances = data.balances.map((balance) => (balance.id === input.balanceId ? next : balance));
  const accountMovements = syncDifferenceAccountMovements(data.accountMovements, next, context.user.id, {
    id: context.id,
    createdAt: reviewedAt,
  });
  const previousMovementIds = new Set(data.accountMovements.map((movement) => movement.id));
  const newAccountMovements = accountMovements.filter((movement) => !previousMovementIds.has(movement.id));
  const changedData = {
    ...data,
    currentAccounts: ensureLocalCurrentAccounts(data, next.localId),
    accountMovements,
    balances,
  };
  const accountBalancesAfter = localAccountBalances(changedData, next.localId);
  if (![accountBalancesAfter.cash, accountBalancesAfter.bank].every((amount) => Number.isFinite(amount))) {
    return commandError("Los importes de la diferencia deben ser numeros finitos.");
  }
  const nextData = auditCommand(
    changedData,
    context,
    "Gestionar diferencia de caja",
    "DiferenciaCaja",
    input.balanceId,
    previous,
    {
      localId: next.localId,
      balanceId: next.id,
      status: input.status,
      reviewNote,
      reviewedBy: context.user.name,
      reviewedAt,
      declaredCashBefore: previousDeclaredCash,
      declaredCashAfter: nextDeclaredCash,
      declaredBankBefore: previousDeclaredBank,
      declaredBankAfter: nextDeclaredBank,
      cashDifferenceBefore: previousCashDifference,
      cashDifferenceAfter: nextCashDifference,
      bankDifferenceBefore: previousBankDifference,
      bankDifferenceAfter: nextBankDifference,
      accountBalancesBefore,
      accountBalancesAfter,
      newAccountMovements: newAccountMovements.map((movement) => ({
        id: movement.id,
        accountId: movement.accountId,
        sourceId: movement.sourceId,
        direction: movement.direction,
        amount: movement.amount,
        status: movement.status,
        detail: movement.detail,
        previousAdjustmentId: movement.previousAdjustmentId,
      })),
    },
    reviewNote,
    { localId: next.localId },
  );
  return commandSuccess(nextData, next);
}
