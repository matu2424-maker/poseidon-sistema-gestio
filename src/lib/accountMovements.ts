import type {
  AccountMovement,
  AppData,
  Balance,
  CapitalMovement,
  Expense,
  Gift,
  PartnerMovement,
  SalarySettlement,
  Transfer,
  TreasuryTransfer,
} from "../types";
import {
  ensureLocalCurrentAccounts,
  localAccountIdForMedium,
  localAccountIdForFinancialMedium,
  localBankAccountId,
  localCashAccountId,
  partnerAccountId,
  principalAccountIdForMedium,
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
    localId: settlement.localId,
    balanceId: settlement.balanceId,
    sourceType: "SUELDO",
    sourceId: settlement.id,
    direction: "SALIDA",
    concept,
    amount: salarySettlementDisplayAmount(settlement),
    currency: settlement.currency ?? "UYU",
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
    accountId: settlement.paymentAccountId ?? localCashAccountId(settlement.localId),
    localId: settlement.localId,
    balanceId: settlement.balanceId,
    sourceType: "SUELDO",
    sourceId: settlement.id,
    direction: "SALIDA",
    concept,
    amount: salarySettlementAmount(settlement),
    currency: settlement.currency ?? "UYU",
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
    currency: "UYU",
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
    localId,
    balanceId: transfer.balanceId,
    sourceType: "TRANSFERENCIA",
    sourceId: transfer.id,
    direction: "ENTRADA",
    concept: "TRANSFERENCIA",
    amount: transfer.amount,
    currency: "UYU",
    detail: `${transfer.name} - ${transfer.receipt}`,
    status: transfer.status,
    userId: transfer.userId,
    createdAt: transfer.createdAt,
  };
}

export function localTransferCashAccountMovement(transfer: Transfer, localId: string): AccountMovement {
  return {
    id: `account-movement-local-transfer-cash-${transfer.id}`,
    accountId: localCashAccountId(localId),
    localId,
    balanceId: transfer.balanceId,
    sourceType: "TRANSFERENCIA",
    sourceId: transfer.id,
    direction: "SALIDA",
    concept: "TRANSFERENCIA",
    amount: transfer.amount,
    currency: "UYU",
    detail: `${transfer.name} - ${transfer.receipt} - salida a banco`,
    status: transfer.status,
    userId: transfer.userId,
    createdAt: transfer.createdAt,
  };
}

export function localExpenseAccountMovement(expense: Expense, localId: string): AccountMovement {
  return {
    id: `account-movement-local-expense-${expense.id}`,
    accountId: expense.paymentAccountId || localCashAccountId(localId),
    localId,
    balanceId: expense.balanceId,
    sourceType: "GASTO",
    sourceId: expense.id,
    direction: "SALIDA",
    concept: "GASTO",
    amount: expense.amount,
    currency: expense.currency ?? "UYU",
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
    localId,
    balanceId: gift.balanceId,
    sourceType: "REGALO",
    sourceId: gift.id,
    direction: "SALIDA",
    concept: "REGALO",
    amount: gift.cashAmount + gift.creditAmount,
    currency: "UYU",
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
    localId: movement.localId,
    balanceId: movement.balanceId,
    sourceType: movement.type,
    sourceId: movement.id,
    direction: movement.type === "APORTE" ? "ENTRADA" : "SALIDA",
    concept: movement.type,
    amount: movement.amount,
    currency: "UYU",
    detail: `${movement.person} - ${movement.medium} - ${movement.timing}${movement.note ? ` - ${movement.note}` : ""}`,
    status: movement.status,
    userId: movement.userId,
    createdAt: movement.createdAt,
  };
}

export function treasuryTransferAccountMovements(transfer: TreasuryTransfer): [AccountMovement, AccountMovement] {
  const localAccountId = localAccountIdForFinancialMedium(transfer.localId, transfer.medium);
  const principalAccountId = principalAccountIdForMedium(transfer.medium);
  const fromAccountId = transfer.type === "RETIRO_CAJA" ? localAccountId : principalAccountId;
  const toAccountId = transfer.type === "RETIRO_CAJA" ? principalAccountId : localAccountId;
  const label = transfer.type === "RETIRO_CAJA" ? "Retiro de caja a principal" : "Aporte desde principal a caja";
  const common = {
    localId: transfer.localId,
    balanceId: transfer.balanceId,
    sourceType: "TRASPASO_CAJA" as const,
    sourceId: transfer.id,
    concept: transfer.type,
    amount: transfer.amount,
    currency: transfer.currency,
    detail: `${label} - ${transfer.medium}${transfer.note ? ` - ${transfer.note}` : ""}`,
    status: transfer.status,
    userId: transfer.userId,
    createdAt: transfer.createdAt,
  };
  return [
    {
      ...common,
      id: `account-movement-treasury-${transfer.id}-source`,
      accountId: fromAccountId,
      direction: "SALIDA",
    },
    {
      ...common,
      id: `account-movement-treasury-${transfer.id}-destination`,
      accountId: toAccountId,
      direction: "ENTRADA",
    },
  ];
}

export function partnerMovementAccountMovements(movement: PartnerMovement): [AccountMovement, AccountMovement] {
  const isContribution = movement.type === "APORTE_SOCIO";
  const label = isContribution ? "Aporte de socio" : "Retiro de socio";
  const common = {
    localId: movement.localId,
    balanceId: movement.balanceId,
    sourceType: movement.type,
    sourceId: movement.id,
    concept: movement.type,
    amount: movement.amount,
    currency: movement.currency,
    detail: `${label} ${movement.partner} - ${movement.medium}${movement.note ? ` - ${movement.note}` : ""}`,
    status: movement.status,
    userId: movement.userId,
    createdAt: movement.createdAt,
  };
  return [
    {
      ...common,
      id: `account-movement-partner-${movement.id}-principal`,
      accountId: principalAccountIdForMedium(movement.medium),
      direction: isContribution ? "ENTRADA" : "SALIDA",
    },
    {
      ...common,
      id: `account-movement-partner-${movement.id}-partner`,
      accountId: partnerAccountId(movement.partner),
      direction: isContribution ? "ENTRADA" : "SALIDA",
    },
  ];
}

export function machineResultAccountMovement(balance: Balance, result: number, userId: string): AccountMovement | null {
  if (result === 0) return null;
  return {
    id: `account-movement-local-machine-${balance.id}`,
    accountId: localCashAccountId(balance.localId),
    localId: balance.localId,
    balanceId: balance.id,
    sourceType: "RESULTADO_MAQUINAS",
    sourceId: balance.id,
    direction: result >= 0 ? "ENTRADA" : "SALIDA",
    concept: "RESULTADO_MAQUINAS",
    amount: Math.abs(result),
    currency: "UYU",
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

export function differenceAccountMovement(
  balance: Balance,
  kind: "EFECTIVO" | "BANCO",
  amount: number,
  userId: string,
  options: {
    id?: string;
    createdAt?: string;
    detailPrefix?: string;
    status?: AccountMovement["status"];
    previousAdjustmentId?: string;
  } = {},
): AccountMovement | null {
  if (amount === 0) return null;
  const ids = differenceMovementIds(balance.id);
  const isCash = kind === "EFECTIVO";
  return {
    id: options.id ?? (isCash ? ids.cash : ids.bank),
    accountId: isCash ? localCashAccountId(balance.localId) : localBankAccountId(balance.localId),
    localId: balance.localId,
    balanceId: balance.id,
    sourceType: "DIFERENCIA_CAJA",
    sourceId: `${balance.id}-${kind}`,
    direction: amount >= 0 ? "ENTRADA" : "SALIDA",
    concept: isCash ? "DIFERENCIA_EFECTIVO" : "DIFERENCIA_BANCO",
    amount: Math.abs(amount),
    currency: "UYU",
    detail: `${options.detailPrefix ?? "Diferencia"} ${isCash ? "efectivo" : "banco"} caja ${balance.visibleId ?? balance.id} - ${balance.operatingDate}`,
    status: options.status ?? (balance.differenceStatus === "ANULADA" ? "ANULADO" : "ACTIVO"),
    userId,
    createdAt: options.createdAt ?? balance.differenceReviewedAt ?? balance.closedAt ?? nowIso(),
    previousAdjustmentId: options.previousAdjustmentId,
  };
}

export type SyncDifferenceAccountMovementsOptions = {
  id?: (prefix: string) => string;
  createdAt?: string;
};

function uniqueMovementId(movements: AccountMovement[], candidate: string) {
  if (!movements.some((movement) => movement.id === candidate)) return candidate;
  let sequence = 2;
  while (movements.some((movement) => movement.id === `${candidate}-${sequence}`)) sequence += 1;
  return `${candidate}-${sequence}`;
}

function latestDifferenceMovement(movements: AccountMovement[]) {
  if (!movements.length) return undefined;
  const referencedIds = new Set(
    movements.map((movement) => movement.previousAdjustmentId).filter((id): id is string => Boolean(id)),
  );
  const chainTips = movements.filter((movement) => !referencedIds.has(movement.id));
  return (chainTips.length ? chainTips : movements).reduce<AccountMovement | undefined>((latest, movement) => {
    if (!latest || movement.createdAt > latest.createdAt) return movement;
    return latest;
  }, undefined);
}

export function syncDifferenceAccountMovements(
  movements: AccountMovement[],
  balance: Balance,
  userId: string,
  options: SyncDifferenceAccountMovementsOptions = {},
) {
  const ids = differenceMovementIds(balance.id);
  const syncKind = (current: AccountMovement[], kind: "EFECTIVO" | "BANCO", target: number) => {
    const sourceId = `${balance.id}-${kind}`;
    const related = current.filter((movement) => movement.sourceType === "DIFERENCIA_CAJA" && movement.sourceId === sourceId);
    const currentAmount = related.filter((movement) => movement.status === "ACTIVO").reduce(
      (total, movement) => total + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount),
      0,
    );
    const delta = target - currentAmount;
    if (delta === 0) return current;
    const baseId = kind === "EFECTIVO" ? ids.cash : ids.bank;
    const isOriginal = related.length === 0 && !current.some((movement) => movement.id === baseId);
    const createdAt = options.createdAt ?? balance.differenceReviewedAt ?? balance.closedAt ?? nowIso();
    const revision = createdAt.replace(/[^0-9A-Za-z]/g, "");
    const generatedId = isOriginal
      ? baseId
      : options.id?.(`difference-${kind.toLowerCase()}-adjustment`) || `${baseId}-ajuste-${revision}`;
    const id = isOriginal ? baseId : uniqueMovementId(current, generatedId);
    const previousAdjustmentId = isOriginal ? undefined : latestDifferenceMovement(related)?.id;
    const adjustment = differenceAccountMovement(balance, kind, delta, userId, {
      id,
      createdAt,
      detailPrefix: isOriginal ? "Diferencia" : "Ajuste diferencia",
      status: "ACTIVO",
      previousAdjustmentId,
    });
    return adjustment ? [adjustment, ...current] : current;
  };
  return syncKind(syncKind(movements, "EFECTIVO", Number(balance.cashDifference ?? 0)), "BANCO", Number(balance.bankDifference ?? 0));
}

export function reverseSourceAccountMovements(
  movements: AccountMovement[],
  sourceTypes: AccountMovement["sourceType"][],
  sourceId: string,
  userId: string,
  reason: string,
  createdAt = nowIso(),
) {
  const originals = movements.filter(
    (movement) =>
      sourceTypes.includes(movement.sourceType) &&
      movement.sourceId === sourceId &&
      movement.status === "ACTIVO" &&
      !movement.reversalOf,
  );
  return originals.reduce((current, original) => {
    const reversalId = `account-movement-reversal-${original.id}`;
    if (current.some((movement) => movement.id === reversalId)) return current;
    const reversal: AccountMovement = {
      id: reversalId,
      accountId: original.accountId,
      localId: original.localId,
      balanceId: original.balanceId,
      sourceType: "AJUSTE",
      sourceId: original.sourceId,
      direction: original.direction === "ENTRADA" ? "SALIDA" : "ENTRADA",
      concept: `REVERSO_${original.concept}`,
      amount: original.amount,
      currency: original.currency,
      detail: `${reason} - reverso de ${original.detail}`,
      status: "ACTIVO",
      userId,
      createdAt,
      reversalOf: original.id,
    };
    return [reversal, ...current];
  }, movements);
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
