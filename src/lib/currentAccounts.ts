import type { AppData, CapitalMovementMedium, CurrentAccount, CurrentAccountKind, Local, StaffMember } from "../types";
import { nowIso } from "./dates";

export const TRANSFER_ACCOUNT_ID = "account-transferencias";

export const staffAccountId = (staffId: string) => `account-staff-${staffId}`;

export const localCashAccountId = (localId: string) => `account-local-${localId}-efectivo`;

export const localBankAccountId = (localId: string) => `account-local-${localId}-banco`;

export const localAccountIdForMedium = (localId: string, medium: CapitalMovementMedium) =>
  medium === "EFECTIVO" ? localCashAccountId(localId) : localBankAccountId(localId);

export const accountKindLabel = (kind: CurrentAccountKind) => {
  if (kind === "PERSONAL") return "Personal";
  if (kind === "LOCAL_EFECTIVO") return "Local / Efectivo";
  if (kind === "LOCAL_BANCO") return "Local / Banco";
  return "Transferencias";
};

export function createStaffCurrentAccount(staff: StaffMember, existing?: CurrentAccount): CurrentAccount {
  const name = `${staff.firstName} ${staff.lastName}`.trim() || `Personal ${staff.visibleId}`;
  return {
    id: staffAccountId(staff.id),
    kind: "PERSONAL",
    entityId: staff.id,
    name,
    status: staff.status === "PAPELERA" ? "INACTIVA" : "ACTIVA",
    createdAt: existing?.createdAt ?? staff.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

export function createTransferCurrentAccount(existing?: CurrentAccount): CurrentAccount {
  return {
    id: TRANSFER_ACCOUNT_ID,
    kind: "TRANSFERENCIAS",
    name: "Transferencias",
    status: "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

export function createLocalCashCurrentAccount(local: Local, existing?: CurrentAccount): CurrentAccount {
  return {
    id: localCashAccountId(local.id),
    kind: "LOCAL_EFECTIVO",
    entityId: local.id,
    name: `${local.name} - Efectivo`,
    status: local.status === "CERRADO" ? "INACTIVA" : "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

export function createLocalBankCurrentAccount(local: Local, existing?: CurrentAccount): CurrentAccount {
  return {
    id: localBankAccountId(local.id),
    kind: "LOCAL_BANCO",
    entityId: local.id,
    name: `${local.name} - Banco`,
    status: local.status === "CERRADO" ? "INACTIVA" : "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

export function ensureLocalCurrentAccounts(data: AppData, localId: string): CurrentAccount[] {
  const local = data.locals.find((item) => item.id === localId);
  if (!local) return data.currentAccounts;
  const accounts = [...data.currentAccounts];
  if (!accounts.some((account) => account.id === localCashAccountId(local.id))) {
    accounts.unshift(createLocalCashCurrentAccount(local));
  }
  if (!accounts.some((account) => account.id === localBankAccountId(local.id))) {
    accounts.unshift(createLocalBankCurrentAccount(local));
  }
  return accounts;
}

export function accountTotals(data: AppData, accountId: string) {
  const movements = data.accountMovements.filter((movement) => movement.accountId === accountId && movement.status === "ACTIVO");
  const income = movements.filter((movement) => movement.direction === "ENTRADA").reduce((total, movement) => total + movement.amount, 0);
  const outcome = movements.filter((movement) => movement.direction === "SALIDA").reduce((total, movement) => total + movement.amount, 0);
  return { income, outcome, balance: income - outcome, count: movements.length };
}

export function localAccountBalances(data: AppData, localId: string) {
  return {
    cash: accountTotals(data, localCashAccountId(localId)).balance,
    bank: accountTotals(data, localBankAccountId(localId)).balance,
  };
}

