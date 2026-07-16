import type { AccountMovement, AppData, Balance } from "../types";
import { balanceVisibleId } from "./display";

export const balanceById = (data: Pick<AppData, "balances">, balanceId: string | undefined): Balance | undefined =>
  balanceId ? data.balances.find((balance) => balance.id === balanceId) : undefined;

export const openBalanceForLocal = (
  data: Pick<AppData, "balances">,
  localId: string,
): Balance | undefined =>
  data.balances.find(
    (balance) => balance.localId === localId && balance.status === "EN_PROCESO",
  );

export const balanceForMovement = (data: Pick<AppData, "balances">, movement: AccountMovement | null | undefined) =>
  balanceById(data, movement?.balanceId);

export const balanceReferenceLabel = (data: Pick<AppData, "balances" | "locals">, balance: Balance | undefined) =>
  balance ? `${balanceVisibleId(data, balance)} - ${balance.operatingDate}` : "Sin recaudacion asociada";
