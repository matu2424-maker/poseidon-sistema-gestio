import type {
  AppData,
  CapitalMovementMedium,
  CurrentAccount,
  CurrentAccountKind,
  FinancialMedium,
  Local,
  Partner,
  StaffMember,
} from "../types";
import { nowIso } from "./dates";

export const TRANSFER_ACCOUNT_ID = "account-transferencias";
export const PRINCIPAL_CASH_ACCOUNT_ID = "account-principal-efectivo-uyu";
export const PRINCIPAL_BANK_ACCOUNT_ID = "account-principal-banco-uyu";

export const staffAccountId = (staffId: string) => `account-staff-${staffId}`;

export const localCashAccountId = (localId: string) => `account-local-${localId}-efectivo`;

export const localBankAccountId = (localId: string) => `account-local-${localId}-banco`;

export const partnerAccountId = (partner: Partner) => `account-socio-${partner.toLowerCase()}-uyu`;

export const localAccountIdForMedium = (localId: string, medium: CapitalMovementMedium) =>
  medium === "EFECTIVO" ? localCashAccountId(localId) : localBankAccountId(localId);

export const localAccountIdForFinancialMedium = (localId: string, medium: FinancialMedium) =>
  medium === "EFECTIVO" ? localCashAccountId(localId) : localBankAccountId(localId);

export const principalAccountIdForMedium = (medium: FinancialMedium) =>
  medium === "EFECTIVO" ? PRINCIPAL_CASH_ACCOUNT_ID : PRINCIPAL_BANK_ACCOUNT_ID;

export const accountKindLabel = (kind: CurrentAccountKind) => {
  if (kind === "PERSONAL") return "Personal";
  if (kind === "LOCAL_EFECTIVO") return "Caja / Efectivo";
  if (kind === "LOCAL_BANCO") return "Caja / Banco";
  if (kind === "PRINCIPAL_EFECTIVO") return "Principal / Efectivo";
  if (kind === "PRINCIPAL_BANCO") return "Principal / Banco";
  if (kind === "SOCIO") return "Cuenta de socio";
  return "Transferencias";
};

export function createStaffCurrentAccount(staff: StaffMember, existing?: CurrentAccount): CurrentAccount {
  const name = `${staff.firstName} ${staff.lastName}`.trim() || `Personal ${staff.visibleId}`;
  const status = staff.status === "PAPELERA" ? "INACTIVA" : "ACTIVA";
  return {
    id: staffAccountId(staff.id),
    kind: "PERSONAL",
    entityId: staff.id,
    name,
    currency: "UYU",
    status,
    createdAt: existing?.createdAt ?? staff.createdAt ?? nowIso(),
    updatedAt: existing && existing.name === name && existing.status === status ? existing.updatedAt : nowIso(),
  };
}

export function createTransferCurrentAccount(existing?: CurrentAccount): CurrentAccount {
  return {
    id: TRANSFER_ACCOUNT_ID,
    kind: "TRANSFERENCIAS",
    name: "Transferencias",
    currency: "UYU",
    status: "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: existing?.updatedAt ?? nowIso(),
  };
}

export function createLocalCashCurrentAccount(local: Local, existing?: CurrentAccount): CurrentAccount {
  const name = `${local.name} - Caja / Efectivo`;
  const status = local.status === "CERRADO" ? "INACTIVA" : "ACTIVA";
  return {
    id: localCashAccountId(local.id),
    kind: "LOCAL_EFECTIVO",
    entityId: local.id,
    name,
    currency: "UYU",
    status,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: existing && existing.name === name && existing.status === status ? existing.updatedAt : nowIso(),
  };
}

export function createLocalBankCurrentAccount(local: Local, existing?: CurrentAccount): CurrentAccount {
  const name = `${local.name} - Caja / Banco`;
  const status = local.status === "CERRADO" ? "INACTIVA" : "ACTIVA";
  return {
    id: localBankAccountId(local.id),
    kind: "LOCAL_BANCO",
    entityId: local.id,
    name,
    currency: "UYU",
    status,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: existing && existing.name === name && existing.status === status ? existing.updatedAt : nowIso(),
  };
}

export function createPrincipalCashCurrentAccount(existing?: CurrentAccount): CurrentAccount {
  return {
    id: PRINCIPAL_CASH_ACCOUNT_ID,
    kind: "PRINCIPAL_EFECTIVO",
    name: "Principal - Efectivo",
    currency: "UYU",
    status: "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: existing?.updatedAt ?? nowIso(),
  };
}

export function createPrincipalBankCurrentAccount(existing?: CurrentAccount): CurrentAccount {
  return {
    id: PRINCIPAL_BANK_ACCOUNT_ID,
    kind: "PRINCIPAL_BANCO",
    name: "Principal - Banco",
    currency: "UYU",
    status: "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: existing?.updatedAt ?? nowIso(),
  };
}

export function createPartnerCurrentAccount(partner: Partner, existing?: CurrentAccount): CurrentAccount {
  return {
    id: partnerAccountId(partner),
    kind: "SOCIO",
    entityId: partner,
    name: `Socio - ${partner === "MATHIAS" ? "Mathias" : "Ricardo"}`,
    currency: "UYU",
    status: "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: existing?.updatedAt ?? nowIso(),
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

export function ensurePrincipalAndPartnerAccounts(data: Pick<AppData, "currentAccounts">): CurrentAccount[] {
  const accounts = [...data.currentAccounts];
  const upsert = (account: CurrentAccount) => {
    const index = accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) accounts[index] = account;
    else accounts.unshift(account);
  };
  upsert(createPrincipalCashCurrentAccount(accounts.find((item) => item.id === PRINCIPAL_CASH_ACCOUNT_ID)));
  upsert(createPrincipalBankCurrentAccount(accounts.find((item) => item.id === PRINCIPAL_BANK_ACCOUNT_ID)));
  (["MATHIAS", "RICARDO"] as Partner[]).forEach((partner) =>
    upsert(createPartnerCurrentAccount(partner, accounts.find((item) => item.id === partnerAccountId(partner)))),
  );
  return accounts;
}

export function ensureFinancialCurrentAccounts(data: AppData, localId: string): CurrentAccount[] {
  return ensurePrincipalAndPartnerAccounts({
    currentAccounts: ensureLocalCurrentAccounts(data, localId),
  });
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

export function principalAccountBalances(data: AppData) {
  return {
    cash: accountTotals(data, PRINCIPAL_CASH_ACCOUNT_ID).balance,
    bank: accountTotals(data, PRINCIPAL_BANK_ACCOUNT_ID).balance,
  };
}

export function partnerAccountBalance(data: AppData, partner: Partner) {
  return accountTotals(data, partnerAccountId(partner)).balance;
}

export function companyLiquidity(data: AppData, localId: string) {
  const local = localAccountBalances(data, localId);
  const principal = principalAccountBalances(data);
  return {
    cash: local.cash + principal.cash,
    bank: local.bank + principal.bank,
    total: local.cash + local.bank + principal.cash + principal.bank,
  };
}

export function isMoneyAccount(account: CurrentAccount | undefined) {
  return Boolean(
    account &&
      ["LOCAL_EFECTIVO", "LOCAL_BANCO", "PRINCIPAL_EFECTIVO", "PRINCIPAL_BANCO"].includes(account.kind),
  );
}
