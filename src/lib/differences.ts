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

export function pendingDifferenceCount(data: AppData) {
  return data.balances.filter((balance) => balance.status === "CERRADO" && balanceHasDifference(data, balance) && differenceIsPending(balance)).length;
}

export function differenceActionImpact(status: DifferenceStatus | "") {
  if (status === "VERIFICADA") return "Confirma que la diferencia existe. El saldo real del local queda como fue declarado y el resultado economico no cambia.";
  if (status === "CORREGIDA") return "Permite corregir efectivo/banco declarado, recalcula la diferencia y sincroniza cuentas sin cambiar resultado economico.";
  if (status === "ANULADA") return "Anula la diferencia y sus movimientos de cuenta. El saldo del local vuelve al calculo previo.";
  if (status === "REVISADA") return "Estado anterior: marca la recaudacion como revisada.";
  if (status === "RESUELTA") return "Estado anterior: cierra el control como resuelto.";
  if (status === "AJUSTADA") return "Estado anterior: indica que hubo ajuste definido.";
  return "La diferencia mueve la cuenta corriente del local para reflejar el saldo real declarado, sin tocar el resultado economico.";
}
