import type { AccountMovement, AppData, Balance, CapitalMovement, Expense, Gift, SalarySettlement, Transfer } from "../types";
import {
  ensureLocalCurrentAccounts,
  localAccountIdForMedium,
  localBankAccountId,
  localCashAccountId,
  staffAccountId,
  TRANSFER_ACCOUNT_ID,
} from "./currentAccounts";
import { nowIso } from "./dates";
import { normalizeSalaryConcept, salaryConceptLabel, salarySettlementAmount, salarySettlementDisplayAmount } from "./salaryRules";

export function salaryAccountMovement(settlement: SalarySettlement, userId: string): AccountMovement {
  const concept = normalizeSalaryConcept(settlement.concept);
  return {
    id: `account-movement-salary-${settlement.id}`,
    accountId: staffAccountId(settlement.staffId),
    balanceId: settlement.balanceId,
    sourceType: "SUELDO",
    sourceId: settlement.id,
    direction: "SALIDA",
    concept,
    amount: salarySettlementDisplayAmount(settlement),
    detail: settlement.notes || salaryConceptLabel(concept),
    status: settlement.status === "CONFIRMADA" ? "ACTIVO" : "ANULADO",
    userId,
    createdAt: settlement.createdAt,
  };
}

export function localSalaryAccountMovement(settlement: SalarySettlement, userId: string): AccountMovement {
  const concept = normalizeSalaryConcept(settlement.concept);
  const detail = settlement.notes || salaryConceptLabel(concept);
  return {
    id: `account-movement-local-salary-${settlement.id}`,
    accountId: localCashAccountId(settlement.localId),
    balanceId: settlement.balanceId,
    sourceType: "SUELDO",
    sourceId: settlement.id,
    direction: "SALIDA",
    concept,
    amount: salarySettlementAmount(settlement),
    detail: `${settlement.staffName}${detail ? ` - ${detail}` : ""}`,
    status: settlement.status === "CONFIRMADA" ? "ACTIVO" : "ANULADO",
    userId,
    createdAt: settlement.createdAt,
  };
}

export function transferAccountMovement(transfer: Transfer): AccountMovement {
  return {
    id: `account-movement-transfer-${transfer.id}`,
    accountId: TRANSFER_ACCOUNT_ID,
    balanceId: transfer.balanceId,
    sourceType: "TRANSFERENCIA",
    sourceId: transfer.id,
    direction: "ENTRADA",
    concept: "TRANSFERENCIA",
    amount: transfer.amount,
    detail: `${transfer.name} - ${transfer.receipt}`,
    status: transfer.status,
    userId: transfer.userId,
    createdAt: transfer.createdAt,
  };
}

export function localTransferAccountMovement(transfer: Transfer, localId: string): AccountMovement {
  return {
    id: `account-movement-local-transfer-${transfer.id}`,
    accountId: localBankAccountId(localId),
    balanceId: transfer.balanceId,
    sourceType: "TRANSFERENCIA",
    sourceId: transfer.id,
    direction: "ENTRADA",
    concept: "TRANSFERENCIA",
    amount: transfer.amount,
    detail: `${transfer.name} - ${transfer.receipt}`,
    status: transfer.status,
    userId: transfer.userId,
    createdAt: transfer.createdAt,
  };
}

export function localExpenseAccountMovement(expense: Expense, localId: string): AccountMovement {
  return {
    id: `account-movement-local-expense-${expense.id}`,
    accountId: localCashAccountId(localId),
    balanceId: expense.balanceId,
    sourceType: "GASTO",
    sourceId: expense.id,
    direction: "SALIDA",
    concept: "GASTO",
    amount: expense.amount,
    detail: `${expense.category} / ${expense.subcategory || "-"}${expense.description ? ` - ${expense.description}` : ""}`,
    status: expense.status,
    userId: expense.userId,
    createdAt: expense.createdAt,
  };
}

export function localGiftAccountMovement(gift: Gift, localId: string): AccountMovement {
  return {
    id: `account-movement-local-gift-${gift.id}`,
    accountId: localCashAccountId(localId),
    balanceId: gift.balanceId,
    sourceType: "REGALO",
    sourceId: gift.id,
    direction: "SALIDA",
    concept: "REGALO",
    amount: gift.cashAmount + gift.creditAmount,
    detail: `${gift.reference || "Sin referencia"}${gift.description ? ` - ${gift.description}` : ""}`,
    status: gift.status,
    userId: gift.userId,
    createdAt: gift.createdAt,
  };
}

export function capitalAccountMovement(movement: CapitalMovement): AccountMovement {
  return {
    id: `account-movement-capital-${movement.id}`,
    accountId: localAccountIdForMedium(movement.localId, movement.medium),
    balanceId: movement.balanceId,
    sourceType: movement.type,
    sourceId: movement.id,
    direction: movement.type === "APORTE" ? "ENTRADA" : "SALIDA",
    concept: movement.type,
    amount: movement.amount,
    detail: `${movement.person} - ${movement.medium} - ${movement.timing}${movement.note ? ` - ${movement.note}` : ""}`,
    status: movement.status,
    userId: movement.userId,
    createdAt: movement.createdAt,
  };
}

export function machineResultAccountMovement(balance: Balance, result: number, userId: string): AccountMovement | null {
  if (result === 0) return null;
  return {
    id: `account-movement-local-machine-${balance.id}`,
    accountId: localCashAccountId(balance.localId),
    balanceId: balance.id,
    sourceType: "RESULTADO_MAQUINAS",
    sourceId: balance.id,
    direction: result >= 0 ? "ENTRADA" : "SALIDA",
    concept: "RESULTADO_MAQUINAS",
    amount: Math.abs(result),
    detail: `Caja ${balance.visibleId ?? balance.id} - ${balance.operatingDate}`,
    status: "ACTIVO",
    userId,
    createdAt: balance.closedAt ?? balance.openedAt ?? `${balance.operatingDate}T12:00:00.000Z`,
  };
}

export function differenceMovementIds(balanceId: string) {
  return {
    cash: `account-movement-difference-cash-${balanceId}`,
    bank: `account-movement-difference-bank-${balanceId}`,
  };
}

export function differenceAccountMovement(balance: Balance, kind: "EFECTIVO" | "BANCO", amount: number, userId: string): AccountMovement | null {
  if (amount === 0) return null;
  const ids = differenceMovementIds(balance.id);
  const isCash = kind === "EFECTIVO";
  return {
    id: isCash ? ids.cash : ids.bank,
    accountId: isCash ? localCashAccountId(balance.localId) : localBankAccountId(balance.localId),
    balanceId: balance.id,
    sourceType: "DIFERENCIA_CAJA",
    sourceId: `${balance.id}-${kind}`,
    direction: amount >= 0 ? "ENTRADA" : "SALIDA",
    concept: isCash ? "DIFERENCIA_EFECTIVO" : "DIFERENCIA_BANCO",
    amount: Math.abs(amount),
    detail: `Diferencia ${isCash ? "efectivo" : "banco"} caja ${balance.visibleId ?? balance.id} - ${balance.operatingDate}`,
    status: balance.differenceStatus === "ANULADA" ? "ANULADO" : "ACTIVO",
    userId,
    createdAt: balance.closedAt ?? nowIso(),
  };
}

export function syncDifferenceAccountMovements(movements: AccountMovement[], balance: Balance, userId: string) {
  const ids = differenceMovementIds(balance.id);
  const withoutCurrent = movements.filter((movement) => movement.id !== ids.cash && movement.id !== ids.bank);
  const cashMovement = differenceAccountMovement(balance, "EFECTIVO", balance.cashDifference ?? 0, userId);
  const bankMovement = differenceAccountMovement(balance, "BANCO", balance.bankDifference ?? 0, userId);
  return [cashMovement, bankMovement, ...withoutCurrent].filter((movement): movement is AccountMovement => Boolean(movement));
}

export function syncMachineResultAccountMovement(data: AppData, balanceId: string, userId: string): AppData {
  const balance = data.balances.find((item) => item.id === balanceId);
  if (!balance) return data;
  const result = data.readings
    .filter((reading) => reading.balanceId === balanceId && reading.status === "CARGADA")
    .reduce((total, reading) => total + reading.result, 0);
  const movementId = `account-movement-local-machine-${balance.id}`;
  const accountMovements = data.accountMovements.filter((movement) => movement.id !== movementId);
  const movement = machineResultAccountMovement(balance, result, userId);
  return {
    ...data,
    currentAccounts: ensureLocalCurrentAccounts(data, balance.localId),
    accountMovements: movement ? [movement, ...accountMovements] : accountMovements,
  };
}

export function upsertAccountMovement(movements: AccountMovement[], movement: AccountMovement) {
  return movements.some((item) => item.id === movement.id)
    ? movements.map((item) => (item.id === movement.id ? movement : item))
    : [movement, ...movements];
}

export function accountTotalsFromMovements(movements: AccountMovement[]) {
  const activeMovements = movements.filter((movement) => movement.status === "ACTIVO");
  const income = activeMovements.filter((movement) => movement.direction === "ENTRADA").reduce((total, movement) => total + movement.amount, 0);
  const outcome = activeMovements.filter((movement) => movement.direction === "SALIDA").reduce((total, movement) => total + movement.amount, 0);
  return { income, outcome, balance: income - outcome, count: activeMovements.length };
}

export function accountLedgerRows(movements: AccountMovement[], openingBalance = 0) {
  let runningBalance = openingBalance;
  return [...movements]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((movement) => {
      const activeAmount = movement.status === "ACTIVO" ? movement.amount : 0;
      const debit = movement.direction === "SALIDA" ? activeAmount : 0;
      const credit = movement.direction === "ENTRADA" ? activeAmount : 0;
      runningBalance += credit - debit;
      return { movement, debit, credit, balance: runningBalance };
    });
}
