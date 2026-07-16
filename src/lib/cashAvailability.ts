import type { AppData } from "../types";
import { totalsForBalance } from "./cashTotals";
import { localAccountBalances, localCashAccountId } from "./currentAccounts";
import { money } from "./money";

export type BalanceCashReconciliation = {
  balanceId: string;
  localId: string;
  expectedCash: number;
  accountCash: number;
  delta: number;
  isConsistent: boolean;
};

export function balanceCashReconciliation(
  data: AppData,
  balanceId: string,
): BalanceCashReconciliation | null {
  const balance = data.balances.find((item) => item.id === balanceId);
  if (!balance) return null;
  const expectedCash = totalsForBalance(data, balance.id).expectedCash;
  const accountCash = localAccountBalances(data, balance.localId).cash;
  const delta = expectedCash - accountCash;
  return {
    balanceId: balance.id,
    localId: balance.localId,
    expectedCash,
    accountCash,
    delta,
    isConsistent: Number.isFinite(expectedCash) && Number.isFinite(accountCash) && delta === 0,
  };
}

export function balanceCashReconciliationError(data: AppData, balanceId: string) {
  const reconciliation = balanceCashReconciliation(data, balanceId);
  if (!reconciliation) return "No se encontro la caja que se necesita conciliar.";
  if (![reconciliation.expectedCash, reconciliation.accountCash, reconciliation.delta].every(Number.isFinite)) {
    return "No se puede operar porque la conciliacion de efectivo contiene importes no validos.";
  }
  if (reconciliation.isConsistent) return "";
  return `No se puede operar porque el efectivo calculado de la caja (${money(reconciliation.expectedCash)}) no coincide con Local / Efectivo (${money(reconciliation.accountCash)}). Diferencia tecnica: ${money(reconciliation.delta)}. Requiere una reconciliacion auditada; un aporte comun no corrige este desacople.`;
}

export function historicalCashMutationError(
  data: AppData,
  localId: string,
  sourceBalanceId?: string,
) {
  const openBalance = data.balances.find(
    (balance) => balance.localId === localId && balance.status === "EN_PROCESO",
  );
  if (!openBalance || openBalance.id === sourceBalanceId) return "";
  return "No se puede modificar un movimiento historico de efectivo mientras el local tiene una caja abierta. Cierra la caja o realiza la correccion sobre la recaudacion vigente.";
}

export function localCashAvailable(data: AppData, localId: string) {
  return localAccountBalances(data, localId).cash;
}

export function activeLocalCashSourceOutflow(data: AppData, localId: string, sourceId: string) {
  const accountId = localCashAccountId(localId);
  const netOutflow = data.accountMovements
    .filter((movement) => movement.accountId === accountId && movement.sourceId === sourceId && movement.status === "ACTIVO")
    .reduce(
      (total, movement) => total + (movement.direction === "SALIDA" ? movement.amount : -movement.amount),
      0,
    );
  return Math.max(0, netOutflow);
}

export function localCashOutflowError(data: AppData, localId: string, requestedAmount: number) {
  if (!Number.isFinite(requestedAmount)) return "El monto de la salida debe ser un numero finito.";
  if (requestedAmount <= 0) return "";

  const available = localCashAvailable(data, localId);
  if (!Number.isFinite(available)) return "El saldo disponible de Local / Efectivo no es valido.";
  if (requestedAmount <= available) return "";

  if (available < 0) {
    return `No se puede registrar una nueva salida de efectivo: el saldo Local / Efectivo es negativo (${money(available)}). Registra un aporte real en efectivo para cubrir el faltante.`;
  }

  return `No hay efectivo suficiente en el local. Disponible: ${money(available)}. Salida solicitada: ${money(requestedAmount)}. Registra un aporte real, elige otro medio o cancela la operacion.`;
}
