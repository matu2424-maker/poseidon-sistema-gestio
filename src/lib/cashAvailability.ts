import type { AppData } from "../types";
import { localAccountBalances, localCashAccountId } from "./currentAccounts";
import { money } from "./money";

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
