import type { AppData } from "../types";
import { localBankAccountId, localCashAccountId, staffAccountId } from "./currentAccounts";

export type EntityReference = { label: string; count: number };

const present = (references: EntityReference[]) => references.filter((reference) => reference.count > 0);

export function staffDeletionReferences(data: AppData, staffId: string) {
  const accountId = staffAccountId(staffId);
  return present([
    { label: "liquidaciones salariales", count: data.salarySettlements.filter((item) => item.staffId === staffId).length },
    { label: "historial salarial", count: data.salaryHistories.filter((item) => item.staffId === staffId).length },
    { label: "cierres salariales", count: data.salaryClosures.filter((closure) => closure.employeeSnapshots.some((item) => item.staffId === staffId)).length },
    { label: "movimientos de cuenta", count: data.accountMovements.filter((item) => item.accountId === accountId || (item.sourceType === "SUELDO" && item.sourceId === staffId)).length },
  ]);
}

export function clientDeletionReferences(data: AppData, clientId: string) {
  return present([
    { label: "regalos", count: data.gifts.filter((gift) => (gift.clientIds ?? []).includes(clientId) || gift.clientId === clientId).length },
    { label: "transferencias", count: data.transfers.filter((transfer) => transfer.clientId === clientId).length },
  ]);
}

export function localDeletionReferences(data: AppData, localId: string) {
  const accountIds = new Set([localCashAccountId(localId), localBankAccountId(localId)]);
  return present([
    { label: "recaudaciones", count: data.balances.filter((item) => item.localId === localId).length },
    { label: "maquinas", count: data.machines.filter((item) => item.localId === localId).length },
    { label: "personal", count: data.staff.filter((item) => item.localId === localId).length },
    { label: "clientes", count: data.clients.filter((item) => item.localId === localId).length },
    { label: "usuarios", count: data.users.filter((item) => item.localIds.includes(localId)).length },
    { label: "liquidaciones salariales", count: data.salarySettlements.filter((item) => item.localId === localId).length },
    { label: "cierres salariales", count: data.salaryClosures.filter((closure) => closure.employeeSnapshots.some((item) => item.localId === localId)).length },
    { label: "movimientos de capital", count: data.capitalMovements.filter((item) => item.localId === localId).length },
    { label: "traspasos de tesoreria", count: data.treasuryTransfers.filter((item) => item.localId === localId).length },
    { label: "movimientos de socios", count: data.partnerMovements.filter((item) => item.localId === localId).length },
    { label: "gastos", count: data.expenses.filter((item) => item.localId === localId).length },
    { label: "cierres periodicos", count: data.periodicClosures.filter((item) => item.localId === localId).length },
    { label: "movimientos de cuenta", count: data.accountMovements.filter((item) => accountIds.has(item.accountId)).length },
    { label: "historiales de maquinas", count: data.machineLocalHistory.filter((item) => item.localId === localId).length },
  ]);
}

export function referenceMessage(references: EntityReference[]) {
  return references.map((reference) => `${reference.count} ${reference.label}`).join(", ");
}
