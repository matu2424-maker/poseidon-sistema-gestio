import type { AppData, Balance, DifferenceStatus } from "../types";
import { totalsForBalance } from "./cashTotals";

export function cashDifferenceForBalance(data: AppData, balance: Balance) {
  return balance.cashDifference ?? totalsForBalance(data, balance.id).difference;
}

export function bankDifferenceForBalance(balance: Balance) {
  return balance.bankDifference ?? 0;
}

export function balanceHasDifference(data: AppData, balance: Balance) {
  return cashDifferenceForBalance(data, balance) !== 0 || bankDifferenceForBalance(balance) !== 0;
}

export function differenceIsPending(balance: Balance) {
  return (balance.differenceStatus ?? "PENDIENTE") === "PENDIENTE";
}

export function normalizeDifferenceStatus(balance: Balance): DifferenceStatus | undefined {
  const status = String(balance.differenceStatus ?? "");
  if (status === "PENDIENTE" || status === "VERIFICADA" || status === "CORREGIDA" || status === "ANULADA") return status;
  if (status === "REVISADA") return "VERIFICADA";
  if (status === "AJUSTADA") return "CORREGIDA";
  if (status === "RESUELTA") {
    if (balance.differenceReviewedAt || balance.differenceReviewNote) return "CORREGIDA";
    if (Number(balance.cashDifference ?? 0) !== 0 || Number(balance.bankDifference ?? 0) !== 0) return "VERIFICADA";
  }
  return undefined;
}

export function pendingDifferenceCount(data: AppData) {
  return data.balances.filter((balance) => balance.status === "CERRADO" && balanceHasDifference(data, balance) && differenceIsPending(balance)).length;
}

export function differenceActionImpact(status: DifferenceStatus | "") {
  if (status === "VERIFICADA") return "Confirma que la diferencia existe. El saldo real del local queda como fue declarado y el resultado economico no cambia.";
  if (status === "CORREGIDA") return "Permite corregir efectivo/banco declarado, recalcula la diferencia y sincroniza cuentas sin cambiar resultado economico.";
  if (status === "ANULADA") return "Anula la diferencia y sus movimientos de cuenta. El saldo del local vuelve al calculo previo.";
  return "La diferencia mueve la cuenta corriente del local para reflejar el saldo real declarado, sin tocar el resultado economico.";
}
