import { ChangeEvent, FocusEvent, FormEvent, ReactNode, useEffect, useState } from "react";
import type {
  AccountMovement,
  AccountMovementDirection,
  AccountMovementSource,
  AppData,
  AuditEvent,
  Balance,
  BalanceStatus,
  CapitalMovement,
  CapitalMovementMedium,
  CapitalMovementPerson,
  CapitalMovementTiming,
  CapitalMovementType,
  Client,
  ClientDocumentType,
  ClientStatus,
  CurrentAccount,
  CurrentAccountKind,
  CurrentAccountStatus,
  DifferenceStatus,
  Expense,
  ExpenseCategory,
  ExpenseReviewStatus,
  Gift,
  Local,
  LocalImage,
  Machine,
  MachineLocalHistory,
  MachineStatus,
  MenuGroup,
  MenuItem,
  MovementStatus,
  PeriodicClosure,
  PeriodicClosureStatus,
  PeriodicClosureType,
  Reading,
  ReadingStatus,
  Role,
  SalaryConcept,
  SalaryClosure,
  SalaryHistory,
  SalarySettlement,
  SalarySettlementStatus,
  SalaryType,
  Screen,
  StaffMember,
  StaffSchedule,
  StaffStatus,
  StoredFileMeta,
  Transfer,
  User,
  WeekDay,
} from "./types";

const STORAGE_KEY = "poseidon-sistema-gestion-v2";
const OPERATIONAL_RESET_MARKER_KEY = "poseidon-operational-reset-marker";
const OPERATIONAL_RESET_MARKER = "reset-saldos-2026-06-26-v2";
const LEGACY_POSEIDON_LOCAL_ID = "local-poseidon";
const POSEIDON_LOCAL_ID = "1";
const WORKSHOP_LOCAL_ID = "taller";
const WORKSHOP_LABEL = "Taller";
const TRANSFER_ACCOUNT_ID = "account-transferencias";
const CAPITAL_PEOPLE: CapitalMovementPerson[] = ["RICARDO", "MATHIAS"];
const defaultExpenseCategories: ExpenseCategory[] = [
  { id: "expense-cat-limpieza", name: "Limpieza", subcategories: ["Productos", "Servicio externo", "Mantenimiento diario"], status: "ACTIVA" },
  { id: "expense-cat-repuestos", name: "Repuestos", subcategories: ["Maquinas", "Electricidad", "Insumos"], status: "ACTIVA" },
  { id: "expense-cat-servicios", name: "Servicios", subcategories: ["Tecnico", "Traslado", "Alquiler"], status: "ACTIVA" },
  { id: "expense-cat-otros", name: "Otros", subcategories: ["Varios"], status: "ACTIVA" },
];
const weekDays: WeekDay[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const defaultSchedule: StaffSchedule[] = weekDays.map((day) => ({
  day,
  start: day === "DOMINGO" ? "" : "18:00",
  end: day === "DOMINGO" ? "" : "02:00",
  rest: day === "DOMINGO",
}));

function createDemoUsers(localId: string): User[] {
  return [
    {
      id: "user-cajero1",
      name: "Cajero 1",
      username: "cajero1",
      password: "cajero123",
      role: "CAJERO",
      status: "ACTIVO",
      localIds: [localId],
    },
    {
      id: "user-cajero2",
      name: "Cajero 2",
      username: "cajero2",
      password: "cajero123",
      role: "CAJERO",
      status: "ACTIVO",
      localIds: [localId],
    },
    {
      id: "user-encargado",
      name: "Encargado",
      username: "encargado",
      password: "encargado123",
      role: "ENCARGADO",
      status: "ACTIVO",
      localIds: [localId],
    },
    {
      id: "user-admin",
      name: "Administrador",
      username: "admin",
      password: "admin123",
      role: "ADMINISTRADOR",
      status: "ACTIVO",
      localIds: [localId],
    },
  ];
}

const roleLabels: Record<Role, string> = {
  CAJERO: "Cajero",
  ENCARGADO: "Encargado",
  ADMINISTRADOR: "Administrador",
};

const currency = new Intl.NumberFormat("es-UY", {
  style: "currency",
  currency: "UYU",
  maximumFractionDigits: 0,
});

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
const money = (value: number | undefined | null) => currency.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);
const asNumber = (value: FormDataEntryValue | null) => Number(value || 0);
const counterFormat = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 });
const counter = (value: number | undefined | null) => counterFormat.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);
const parseCounter = (value: string) => Number(value.replace(/\D/g, "") || 0);
const formatCounterInput = (value: string) => counter(parseCounter(value));
const parseMoneyInput = (value: FormDataEntryValue | null) => Number(String(value ?? "").replace(/\D/g, "") || 0);
const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? counterFormat.format(Number(digits)) : "";
};
const moneyInputValue = (value: number | undefined | null) => (Number(value ?? 0) > 0 ? counterFormat.format(Number(value)) : "0");
const normalizeMoneyInput = (value: string) => formatMoneyInput(value) || "0";
const clearZeroMoneyInput = (value: string) => (parseMoneyInput(value) === 0 ? "" : value);
const handleMoneyInput = (event: ChangeEvent<HTMLInputElement>) => {
  event.currentTarget.value = formatMoneyInput(event.currentTarget.value);
};
const handleMoneyFocus = (event: FocusEvent<HTMLInputElement>) => {
  if (parseMoneyInput(event.currentTarget.value) === 0) event.currentTarget.value = "";
};
const handleMoneyBlur = (event: FocusEvent<HTMLInputElement>) => {
  event.currentTarget.value = normalizeMoneyInput(event.currentTarget.value);
};
const shortNumberId = (value: string) => {
  const digits = value.trim();
  if (!/^\d{1,4}$/.test(digits)) return "";
  const numeric = Number(digits);
  return numeric > 0 ? String(numeric) : "";
};
const sanitizeNumberId = (value: string) => value.replace(/\D/g, "").slice(0, 4);
const sanitizeDigits = (value: string, maxLength = 20) => value.replace(/\D/g, "").slice(0, maxLength);
const normalizeClientDocumentType = (value: unknown): ClientDocumentType => (String(value).toUpperCase() === "PASAPORTE" ? "PASAPORTE" : "CEDULA");
const sanitizePassport = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
const normalizeClientDocument = (type: ClientDocumentType, value: string) => (type === "CEDULA" ? sanitizeDigits(value, 12) : sanitizePassport(value));
const clientDocumentTypeLabel = (type: ClientDocumentType) => (type === "PASAPORTE" ? "Pasaporte" : "Cedula");
const clientDocumentKey = (type: ClientDocumentType, documentId: string) => `${type}:${normalizeClientDocument(type, documentId)}`;
const clientDocumentLabel = (client: Pick<Client, "documentType" | "documentId">) => {
  const documentType = normalizeClientDocumentType(client.documentType);
  const documentId = normalizeClientDocument(documentType, client.documentId ?? "");
  return documentId ? `${clientDocumentTypeLabel(documentType)} ${documentId}` : "Sin documento";
};
const clientDocumentSearchText = (client: Pick<Client, "documentType" | "documentId">) =>
  [clientDocumentTypeLabel(normalizeClientDocumentType(client.documentType)), client.documentId ?? ""].join(" ");
const fileMetaLabel = (file: StoredFileMeta | undefined) => file?.name || "-";
const hasClientDocumentDuplicate = (clients: Client[], documentType: ClientDocumentType, documentId: string, excludeId?: string) => {
  const key = clientDocumentKey(documentType, documentId);
  return clients.some(
    (client) => client.id !== excludeId && client.status !== "PAPELERA" && clientDocumentKey(normalizeClientDocumentType(client.documentType), client.documentId ?? "") === key,
  );
};
const nextShortId = (ids: string[]) => String(Math.max(0, ...ids.map((id) => Number(shortNumberId(id)) || 0)) + 1);
const formatDateTime = (value: string) => new Date(value).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" });
const formatTime = (value: string | undefined) => (value ? new Date(value).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : "-");
const localStatusClass = (status: Local["status"]) => (status === "ACTIVO" ? "status-active" : status === "CERRADO" ? "status-closed" : "status-inactive");
const machineStatusClass = (status: MachineStatus) =>
  status === "ACTIVA" ? "status-active" : status === "MANTENIMIENTO" ? "status-maintenance" : status === "DESUSO" ? "status-disused" : "status-inactive";
const staffStatusClass = (status: StaffStatus) => (status === "ACTIVO" ? "status-active" : status === "PAPELERA" ? "status-disused" : "status-inactive");
const clientStatusClass = (status: ClientStatus) => (status === "ACTIVO" ? "status-active" : status === "PAPELERA" ? "status-disused" : "status-inactive");
const localName = (data: AppData, localId: string) =>
  localId === WORKSHOP_LOCAL_ID ? WORKSHOP_LABEL : data.locals.find((local) => local.id === localId)?.name ?? localId;
const localCode = (name: string) => (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "CAJA");
const balanceVisibleId = (data: AppData, balance: Balance) => balance.visibleId ?? `${localCode(localName(data, balance.localId))}-${balance.id.slice(-4)}`;
function nextBalanceVisibleId(data: AppData, localId: string) {
  const code = localCode(localName(data, localId));
  const max = data.balances
    .filter((balance) => balance.localId === localId)
    .map((balance) => {
      const match = String(balance.visibleId ?? "").match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((highest, value) => Math.max(highest, value), 0);
  return `${code}-${max + 1}`;
}
const staffFullName = (staff: Pick<StaffMember, "firstName" | "lastName">) => `${staff.firstName} ${staff.lastName}`.trim();
const clientName = (data: AppData, clientId: string | undefined) => data.clients.find((client) => client.id === clientId)?.name ?? "";
const clientNameWithDocument = (data: AppData, clientId: string | undefined) => {
  const client = data.clients.find((item) => item.id === clientId);
  return client ? `${client.name} - ${clientDocumentLabel(client)}` : "";
};
const auditUserName = (data: AppData, event: AuditEvent) => event.userName || data.users.find((user) => user.id === event.userId)?.name || "Sistema";
const userDisplayName = (data: AppData, userId: string | undefined) => (userId ? data.users.find((item) => item.id === userId)?.name ?? userId : "-");
const userDisplayNameWithRole = (data: AppData, userId: string | undefined, role: Role | undefined) => {
  const name = userDisplayName(data, userId);
  return role ? `${name} como ${roleLabels[role]}` : name;
};
const localOptionName = (local: Local) => `${local.id} - ${local.name}`;
const staffAccountId = (staffId: string) => `account-staff-${staffId}`;
const localCashAccountId = (localId: string) => `account-local-${localId}-efectivo`;
const localBankAccountId = (localId: string) => `account-local-${localId}-banco`;
const localAccountIdForMedium = (localId: string, medium: CapitalMovementMedium) =>
  medium === "EFECTIVO" ? localCashAccountId(localId) : localBankAccountId(localId);
const salaryConceptLabels: Record<SalaryConcept, string> = {
  SALARIO: "Salario",
  SUELDO: "Salario",
  ADELANTO: "Adelanto",
  EXTRA: "Extra",
  HORAS_EXTRAS: "Horas extras",
  AJUSTE: "Extra",
  DESCUENTO: "Descuento",
  AGUINALDO: "Aguinaldo",
  SALARIO_VACACIONAL: "Salario vacacional",
};
const salaryConceptOptions: SalaryConcept[] = ["ADELANTO", "SALARIO", "EXTRA", "HORAS_EXTRAS", "AGUINALDO", "SALARIO_VACACIONAL", "DESCUENTO"];
const salaryConceptLabel = (concept: SalaryConcept) => salaryConceptLabels[concept] ?? concept;
const movementConceptLabel = (concept: string | undefined) => (concept ? salaryConceptLabels[concept as SalaryConcept] ?? concept : "-");
const normalizeSalaryConcept = (concept: unknown): SalaryConcept => {
  if (concept === "SUELDO") return "SALARIO";
  if (concept === "AJUSTE") return "EXTRA";
  if (
    concept === "SALARIO" ||
    concept === "ADELANTO" ||
    concept === "EXTRA" ||
    concept === "HORAS_EXTRAS" ||
    concept === "DESCUENTO" ||
    concept === "AGUINALDO" ||
    concept === "SALARIO_VACACIONAL"
  ) {
    return concept;
  }
  return "SALARIO";
};
const isSalaryPaymentConcept = (concept: SalaryConcept) => concept === "SALARIO" || concept === "SUELDO";
const salaryConceptBreakdown = (concept: SalaryConcept, amount: number) => {
  const normalizedConcept = normalizeSalaryConcept(concept);
  const extraAmount = normalizedConcept === "HORAS_EXTRAS" || normalizedConcept === "EXTRA" ? amount : 0;
  return {
    baseSalary: 0,
    advances: normalizedConcept === "ADELANTO" ? amount : 0,
    extraAmount,
    extraConcept: normalizedConcept === "HORAS_EXTRAS" ? "Horas extras" : normalizedConcept === "EXTRA" ? "Extra" : "",
    aguinaldo: normalizedConcept === "AGUINALDO" ? amount : 0,
    vacationSalary: normalizedConcept === "SALARIO_VACACIONAL" ? amount : 0,
    otherDeductions: normalizedConcept === "DESCUENTO" ? amount : 0,
    totalToPay: isSalaryPaymentConcept(normalizedConcept) ? amount : 0,
  };
};
const salarySettlementAmount = (settlement: SalarySettlement) => {
  const concept = normalizeSalaryConcept(settlement.concept);
  if (concept === "ADELANTO") return Number(settlement.advances ?? 0);
  if (concept === "DESCUENTO") return 0;
  const totalCash = Number(settlement.totalToPay ?? 0);
  if (totalCash !== 0) return totalCash;
  return (
    Number(settlement.baseSalary ?? 0) +
    Number(settlement.extraAmount ?? 0) +
    Number(settlement.aguinaldo ?? 0) +
    Number(settlement.vacationSalary ?? 0)
  );
};
const salarySettlementDisplayAmount = (settlement: SalarySettlement) =>
  normalizeSalaryConcept(settlement.concept) === "DESCUENTO" ? Number(settlement.otherDeductions ?? 0) : salarySettlementAmount(settlement);
const salarySettlementTotalDelta = (settlement: SalarySettlement) =>
  Number(settlement.extraAmount ?? 0) +
  Number(settlement.aguinaldo ?? 0) +
  Number(settlement.vacationSalary ?? 0) -
  Number(settlement.otherDeductions ?? 0);
const accountKindLabel = (kind: CurrentAccountKind) => {
  if (kind === "PERSONAL") return "Personal";
  if (kind === "LOCAL_EFECTIVO") return "Local / Efectivo";
  if (kind === "LOCAL_BANCO") return "Local / Banco";
  return "Transferencias";
};
const mapsHref = (local: Local) =>
  local.googleMapsUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.address || local.name)}`;
const parseAuditValue = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};
const sortPrimitive = (value: string | number) => (typeof value === "number" ? value : value.toLocaleLowerCase("es-UY"));
function compareValues(a: string | number, b: string | number) {
  const left = sortPrimitive(a);
  const right = sortPrimitive(b);
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "es-UY", { numeric: true, sensitivity: "base" });
}
function nextSort<Key extends string>(current: SortState<Key>, key: Key): SortState<Key> {
  if (current.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

function createStaffCurrentAccount(staff: StaffMember, existing?: CurrentAccount): CurrentAccount {
  const name = staffFullName(staff) || `Personal ${staff.visibleId}`;
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

function createTransferCurrentAccount(existing?: CurrentAccount): CurrentAccount {
  return {
    id: TRANSFER_ACCOUNT_ID,
    kind: "TRANSFERENCIAS",
    name: "Transferencias",
    status: "ACTIVA",
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

function createLocalCashCurrentAccount(local: Local, existing?: CurrentAccount): CurrentAccount {
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

function createLocalBankCurrentAccount(local: Local, existing?: CurrentAccount): CurrentAccount {
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

function ensureLocalCurrentAccounts(data: AppData, localId: string): CurrentAccount[] {
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

function salaryHistoryEvent(
  staff: StaffMember,
  previousSalaryType: SalaryType,
  previousNominalSalary: number,
  newSalaryType: SalaryType,
  newNominalSalary: number,
  effectiveDate: string,
  reason: string,
  userId: string,
  userName: string,
): SalaryHistory {
  return {
    id: uid("salary-history"),
    staffId: staff.id,
    staffName: staffFullName(staff),
    localId: staff.localId,
    previousSalaryType,
    newSalaryType,
    previousNominalSalary,
    newNominalSalary,
    effectiveDate,
    reason,
    userId,
    userName,
    createdAt: nowIso(),
  };
}

const salaryPeriodEndDate = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return `${period}-31`;
  return new Date(year, month, 0).toISOString().slice(0, 10);
};

function salaryBaseForPeriod(data: Pick<AppData, "salaryHistories">, staff: StaffMember | undefined, period: string) {
  if (!staff || staff.status !== "ACTIVO") {
    return { amount: 0, salaryType: staff?.salaryType ?? "MENSUAL" };
  }
  const endDate = salaryPeriodEndDate(period);
  const latestHistory = data.salaryHistories
    .filter((history) => history.staffId === staff.id && history.effectiveDate <= endDate)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt))[0];
  return {
    amount: Number(latestHistory?.newNominalSalary ?? staff.nominalSalary ?? 0),
    salaryType: latestHistory?.newSalaryType ?? staff.salaryType,
  };
}

function validateSalarySettlementLimit(
  data: Pick<AppData, "salaryHistories" | "salarySettlements">,
  staff: StaffMember,
  period: string,
  concept: SalaryConcept,
  amount: number,
  excludeSettlementId?: string,
) {
  const salaryBase = salaryBaseForPeriod(data, staff, period).amount;
  const samePeriodSettlements = data.salarySettlements.filter(
    (settlement) =>
      settlement.staffId === staff.id &&
      settlement.period === period &&
      settlement.status !== "ANULADA" &&
      settlement.id !== excludeSettlementId,
  );
  const currentSalaryPaid = samePeriodSettlements
    .filter((settlement) => isSalaryPaymentConcept(normalizeSalaryConcept(settlement.concept)))
    .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
  const currentAdvances = samePeriodSettlements.reduce((total, settlement) => total + Number(settlement.advances ?? 0), 0);
  const nextSalaryPaid = currentSalaryPaid + (isSalaryPaymentConcept(concept) ? amount : 0);
  const nextAdvances = currentAdvances + (concept === "ADELANTO" ? amount : 0);

  if (isSalaryPaymentConcept(concept) && amount > salaryBase) {
    return `El salario no puede superar el salario base (${money(salaryBase)}).`;
  }
  if (nextSalaryPaid > salaryBase) {
    return `El salario pagado acumulado no puede superar el salario base (${money(salaryBase)}).`;
  }
  if (nextSalaryPaid + nextAdvances > salaryBase) {
    return `La suma de salario pagado y adelantos no puede superar el salario base (${money(salaryBase)}).`;
  }
  return "";
}

function salaryAccountMovement(settlement: SalarySettlement, userId: string): AccountMovement {
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

function localSalaryAccountMovement(settlement: SalarySettlement, userId: string): AccountMovement {
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

function transferAccountMovement(transfer: Transfer): AccountMovement {
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

function localTransferAccountMovement(transfer: Transfer, localId: string): AccountMovement {
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

function localExpenseAccountMovement(expense: Expense, localId: string): AccountMovement {
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

function localGiftAccountMovement(gift: Gift, localId: string): AccountMovement {
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

function capitalAccountMovement(movement: CapitalMovement): AccountMovement {
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

function machineResultAccountMovement(balance: Balance, result: number, userId: string): AccountMovement | null {
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
    createdAt: nowIso(),
  };
}

function syncMachineResultAccountMovement(data: AppData, balanceId: string, userId: string): AppData {
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

function upsertAccountMovement(movements: AccountMovement[], movement: AccountMovement) {
  return movements.some((item) => item.id === movement.id)
    ? movements.map((item) => (item.id === movement.id ? movement : item))
    : [movement, ...movements];
}

function accountTotals(data: AppData, accountId: string) {
  const movements = data.accountMovements.filter((movement) => movement.accountId === accountId && movement.status === "ACTIVO");
  const income = movements.filter((movement) => movement.direction === "ENTRADA").reduce((total, movement) => total + movement.amount, 0);
  const outcome = movements.filter((movement) => movement.direction === "SALIDA").reduce((total, movement) => total + movement.amount, 0);
  return { income, outcome, balance: income - outcome, count: movements.length };
}
function localAccountBalances(data: AppData, localId: string) {
  return {
    cash: accountTotals(data, localCashAccountId(localId)).balance,
    bank: accountTotals(data, localBankAccountId(localId)).balance,
  };
}
function sortIndicator<Key extends string>(sort: SortState<Key>, key: Key) {
  if (sort.key !== key) return "";
  return sort.direction === "asc" ? " asc" : " desc";
}
const confirmAction = (message: string) => window.confirm(message);
const machineHistoryEvent = (
  machine: Pick<Machine, "id" | "visibleId" | "name">,
  localId: string,
  action: MachineLocalHistory["action"],
  detail: string,
  userId: string,
): MachineLocalHistory => ({
  id: uid("machine-history"),
  machineId: machine.id,
  machineVisibleId: machine.visibleId,
  machineName: machine.name,
  localId,
  action,
  detail,
  createdAt: nowIso(),
  userId,
});

function readLocalImages(files: FileList): Promise<LocalImage[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<LocalImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: uid("local-image"),
              name: file.name,
              dataUrl: String(reader.result ?? ""),
              createdAt: nowIso(),
            });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );
}

function readUploadFile(file: File): StoredFileMeta {
  return { name: file.name, type: file.type, size: file.size, uploadedAt: nowIso() };
}

function normalizeStoredFileMeta(file: StoredFileMeta | undefined): StoredFileMeta | undefined {
  if (!file?.name) return undefined;
  return {
    name: file.name,
    type: file.type ?? "",
    size: Number(file.size ?? 0),
    uploadedAt: file.uploadedAt ?? nowIso(),
  };
}

const stripLargeInlineFiles = (value: string) =>
  value.replace(/data:[^"]{500,}/g, "[archivo no persistido en localStorage]");

function dataForLocalStorage(data: AppData, compact = false): AppData {
  const auditLimit = compact ? 350 : data.audit.length;
  return {
    ...data,
    locals: data.locals.map((local) => ({
      ...local,
      images: (local.images ?? []).map((image) => ({
        ...image,
        dataUrl: "",
      })),
    })),
    expenses: data.expenses.map((expense) => ({
      ...expense,
      receiptDataUrl: undefined,
    })),
    audit: data.audit.slice(0, auditLimit).map((event) => ({
      ...event,
      previousValue: stripLargeInlineFiles(event.previousValue).slice(0, compact ? 8000 : 30000),
      newValue: stripLargeInlineFiles(event.newValue).slice(0, compact ? 8000 : 30000),
    })),
    machineLocalHistory: compact ? data.machineLocalHistory.slice(0, 1200) : data.machineLocalHistory,
    accountMovements: compact ? data.accountMovements.slice(0, 2000) : data.accountMovements,
  };
}

function clearOperationalData(data: AppData): AppData {
  return {
    ...data,
    staff: data.staff.map((staff) => ({ ...staff, salaryAdvanceBalance: 0, updatedAt: nowIso() })),
    machines: data.machines.map((machine) => ({ ...machine, lastIn: 0, lastOut: 0 })),
    balances: [],
    readings: [],
    expenses: [],
    transfers: [],
    gifts: [],
    salarySettlements: [],
    periodicClosures: [],
    salaryClosures: [],
    capitalMovements: [],
    accountMovements: [],
    audit: [],
    machineLocalHistory: [],
  };
}

function createDemoStaff(localId: string): StaffMember[] {
  const nominalSalary = 42000;
  return [
    {
      id: "staff-1",
      visibleId: "1",
      firstName: "Martin",
      lastName: "Pereira",
      documentId: "12345678",
      address: "Direccion a completar",
      phone: "099111222",
      email: "martin@poseidon.local",
      birthDate: "1992-05-12",
      hireDate: today(),
      position: "Cajero",
      localId,
      salaryType: "MENSUAL",
      nominalSalary,
      salaryAdvanceBalance: 0,
      vacationDays: 20,
      usedVacationDays: 0,
      estimatedAguinaldo: Math.round(nominalSalary / 12),
      estimatedVacationSalary: Math.round((nominalSalary / 30) * 20),
      emergencyContact: "Contacto a completar",
      bankAccount: "",
      schedule: defaultSchedule,
      notes: "Empleado inicial de prueba",
      status: "ACTIVO",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
}

function createDemoClients(localId: string): Client[] {
  return [
    {
      id: "client-1",
      visibleId: "1",
      name: "Cliente frecuente",
      documentType: "CEDULA",
      documentId: "12345678",
      phone: "099333444",
      email: "",
      address: "",
      birthDate: "",
      localId,
      category: "FRECUENTE",
      notes: "Cliente de prueba",
      status: "ACTIVO",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: "client-2",
      visibleId: "2",
      name: "Cliente VIP",
      documentType: "PASAPORTE",
      documentId: "AB123456",
      phone: "",
      email: "",
      address: "",
      birthDate: "",
      localId,
      category: "VIP",
      notes: "",
      status: "ACTIVO",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
}

function createDemoOperationalData(local: Local, machines: Machine[], staff: StaffMember[], clients: Client[]) {
  const cajero1Id = "user-cajero1";
  const cajero2Id = "user-cajero2";
  const adminId = "user-admin";
  const [machine1, machine2, machine3] = machines;
  const staffMember = staff[0];
  const balance1: Balance = {
    id: "balance-demo-1",
    visibleId: "POSE-1",
    localId: local.id,
    operatingDate: "2026-07-01",
    status: "CERRADO",
    initialFund: 50000,
    initialBankFund: 10000,
    initialNote: "Caja demo con diferencia pendiente",
    openedBy: cajero1Id,
    openedByRole: "CAJERO",
    openedAt: "2026-07-01T18:00:00.000-03:00",
    closedBy: cajero1Id,
    closedByRole: "CAJERO",
    closedAt: "2026-07-01T23:45:00.000-03:00",
    declaredCash: 54000,
    declaredBank: 13000,
    nextBase: 54000,
    nextBankBase: 13000,
    finalWithdrawalCash: 6000,
    finalWithdrawalBank: 3000,
    cashDifference: -1000,
    bankDifference: 1000,
    differenceNote: "Diferencia demo para revision del encargado.",
    differenceStatus: "PENDIENTE",
  };
  const balance2: Balance = {
    id: "balance-demo-2",
    visibleId: "POSE-2",
    localId: local.id,
    operatingDate: "2026-07-02",
    status: "CERRADO",
    initialFund: 54000,
    initialBankFund: 13000,
    initialNote: "Caja demo sin diferencia",
    openedBy: cajero2Id,
    openedByRole: "CAJERO",
    openedAt: "2026-07-02T18:10:00.000-03:00",
    closedBy: cajero2Id,
    closedByRole: "CAJERO",
    closedAt: "2026-07-02T23:30:00.000-03:00",
    declaredCash: 55000,
    declaredBank: 20000,
    nextBase: 55000,
    nextBankBase: 20000,
    finalWithdrawalCash: 10000,
    finalWithdrawalBank: 0,
    cashDifference: 0,
    bankDifference: 0,
    differenceStatus: "RESUELTA",
  };
  const balance3: Balance = {
    id: "balance-demo-3",
    visibleId: "POSE-3",
    localId: local.id,
    operatingDate: "2026-07-03",
    status: "CERRADO",
    initialFund: 55000,
    initialBankFund: 20000,
    initialNote: "Caja demo con resultado negativo de maquinas",
    openedBy: cajero1Id,
    openedByRole: "CAJERO",
    openedAt: "2026-07-03T18:05:00.000-03:00",
    closedBy: adminId,
    closedByRole: "CAJERO",
    closedAt: "2026-07-03T23:15:00.000-03:00",
    declaredCash: 41000,
    declaredBank: 27000,
    nextBase: 41000,
    nextBankBase: 27000,
    finalWithdrawalCash: 0,
    finalWithdrawalBank: 0,
    cashDifference: 0,
    bankDifference: 0,
    differenceStatus: "RESUELTA",
  };
  const balances = [balance3, balance2, balance1];
  const readings: Reading[] = [
    {
      id: "reading-demo-1-1",
      balanceId: balance1.id,
      machineId: machine1.id,
      inPrevious: 0,
      inActual: 40000,
      outPrevious: 0,
      outActual: 28000,
      result: 12000,
      status: "CARGADA",
      observation: "",
      updatedBy: cajero1Id,
      updatedAt: "2026-07-01T22:10:00.000-03:00",
    },
    {
      id: "reading-demo-1-2",
      balanceId: balance1.id,
      machineId: machine2.id,
      inPrevious: 0,
      inActual: 30000,
      outPrevious: 0,
      outActual: 24000,
      result: 6000,
      status: "CARGADA",
      observation: "",
      updatedBy: cajero1Id,
      updatedAt: "2026-07-01T22:15:00.000-03:00",
    },
    {
      id: "reading-demo-1-3",
      balanceId: balance1.id,
      machineId: machine3.id,
      inPrevious: 0,
      inActual: null,
      outPrevious: 0,
      outActual: null,
      result: 0,
      status: "SIN_LECTURA",
      observation: "Sin lectura por mantenimiento parcial.",
      updatedBy: cajero1Id,
      updatedAt: "2026-07-01T22:20:00.000-03:00",
    },
    {
      id: "reading-demo-2-1",
      balanceId: balance2.id,
      machineId: machine1.id,
      inPrevious: 40000,
      inActual: 70000,
      outPrevious: 28000,
      outActual: 50000,
      result: 8000,
      status: "CARGADA",
      observation: "",
      updatedBy: cajero2Id,
      updatedAt: "2026-07-02T22:05:00.000-03:00",
    },
    {
      id: "reading-demo-2-2",
      balanceId: balance2.id,
      machineId: machine2.id,
      inPrevious: 30000,
      inActual: 64000,
      outPrevious: 24000,
      outActual: 50000,
      result: 8000,
      status: "CARGADA",
      observation: "",
      updatedBy: cajero2Id,
      updatedAt: "2026-07-02T22:08:00.000-03:00",
    },
    {
      id: "reading-demo-2-3",
      balanceId: balance2.id,
      machineId: machine3.id,
      inPrevious: 0,
      inActual: 20000,
      outPrevious: 0,
      outActual: 14000,
      result: 6000,
      status: "CARGADA",
      observation: "",
      updatedBy: cajero2Id,
      updatedAt: "2026-07-02T22:12:00.000-03:00",
    },
    {
      id: "reading-demo-3-1",
      balanceId: balance3.id,
      machineId: machine1.id,
      inPrevious: 70000,
      inActual: 83000,
      outPrevious: 50000,
      outActual: 65000,
      result: -2000,
      status: "CARGADA",
      observation: "Resultado negativo demo.",
      updatedBy: cajero1Id,
      updatedAt: "2026-07-03T22:00:00.000-03:00",
    },
    {
      id: "reading-demo-3-2",
      balanceId: balance3.id,
      machineId: machine2.id,
      inPrevious: 64000,
      inActual: 76000,
      outPrevious: 50000,
      outActual: 64000,
      result: -2000,
      status: "CARGADA",
      observation: "Resultado negativo demo.",
      updatedBy: cajero1Id,
      updatedAt: "2026-07-03T22:04:00.000-03:00",
    },
    {
      id: "reading-demo-3-3",
      balanceId: balance3.id,
      machineId: machine3.id,
      inPrevious: 20000,
      inActual: 24000,
      outPrevious: 14000,
      outActual: 19000,
      result: -1000,
      status: "CARGADA",
      observation: "Resultado negativo demo.",
      updatedBy: cajero1Id,
      updatedAt: "2026-07-03T22:08:00.000-03:00",
    },
  ];
  const expenses: Expense[] = [
    {
      id: "expense-demo-1",
      balanceId: balance1.id,
      category: "Limpieza",
      subcategory: "Productos",
      amount: 2500,
      description: "Articulos de limpieza",
      receipt: "ticket-demo-1.jpg",
      receiptFileName: "ticket-demo-1.jpg",
      receiptFileType: "image/jpeg",
      status: "ACTIVO",
      reviewStatus: "PENDIENTE",
      userId: cajero1Id,
      createdAt: "2026-07-01T20:30:00.000-03:00",
    },
    {
      id: "expense-demo-2",
      balanceId: balance2.id,
      category: "Repuestos",
      subcategory: "Maquinas",
      amount: 3000,
      description: "Botonera demo",
      receipt: "factura-demo.pdf",
      receiptFileName: "factura-demo.pdf",
      receiptFileType: "application/pdf",
      status: "ACTIVO",
      reviewStatus: "REVISADO",
      reviewedBy: "user-encargado",
      reviewedAt: "2026-07-03T10:00:00.000-03:00",
      reviewNote: "Comprobante revisado.",
      userId: cajero2Id,
      createdAt: "2026-07-02T21:00:00.000-03:00",
    },
    {
      id: "expense-demo-3",
      balanceId: balance3.id,
      category: "Servicios",
      subcategory: "Tecnico",
      amount: 2000,
      description: "Revision tecnica demo",
      receipt: "",
      status: "ACTIVO",
      reviewStatus: "OBSERVADO",
      reviewedBy: "user-encargado",
      reviewedAt: "2026-07-03T22:30:00.000-03:00",
      reviewNote: "Falta comprobante.",
      userId: cajero1Id,
      createdAt: "2026-07-03T21:30:00.000-03:00",
    },
  ];
  const transfers: Transfer[] = [
    {
      id: "transfer-demo-1",
      balanceId: balance1.id,
      clientId: clients[0]?.id,
      receipt: "TR-1001",
      name: "Cliente frecuente",
      amount: 5000,
      account: "Cuenta unica inicial",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T21:10:00.000-03:00",
    },
    {
      id: "transfer-demo-2",
      balanceId: balance2.id,
      clientId: clients[1]?.id,
      receipt: "TR-1002",
      name: "Cliente VIP",
      amount: 7000,
      account: "Cuenta unica inicial",
      status: "ACTIVO",
      userId: cajero2Id,
      createdAt: "2026-07-02T21:20:00.000-03:00",
    },
    {
      id: "transfer-demo-3",
      balanceId: balance3.id,
      receipt: "TR-1003",
      name: "Transferencia mostrador",
      amount: 2000,
      account: "Cuenta unica inicial",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-03T21:05:00.000-03:00",
    },
  ];
  const gifts: Gift[] = [
    {
      id: "gift-demo-1",
      balanceId: balance1.id,
      clientId: clients[1]?.id,
      clientIds: [clients[1]?.id].filter(Boolean) as string[],
      type: "EFECTIVO",
      cashAmount: 1500,
      creditAmount: 0,
      reference: "Mathias",
      description: "Regalo demo",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T20:45:00.000-03:00",
    },
    {
      id: "gift-demo-2",
      balanceId: balance2.id,
      clientId: clients[0]?.id,
      clientIds: [clients[0]?.id].filter(Boolean) as string[],
      type: "EFECTIVO",
      cashAmount: 1000,
      creditAmount: 0,
      reference: "Cajero",
      description: "",
      status: "ACTIVO",
      userId: cajero2Id,
      createdAt: "2026-07-02T20:20:00.000-03:00",
    },
  ];
  const salarySettlements: SalarySettlement[] = [
    {
      id: "salary-demo-1",
      period: "2026-07",
      balanceId: balance1.id,
      staffId: staffMember.id,
      staffName: staffFullName(staffMember),
      localId: local.id,
      baseSalary: 0,
      advances: 0,
      extraAmount: 0,
      extraConcept: "",
      aguinaldo: 0,
      vacationSalary: 0,
      otherDeductions: 0,
      totalToPay: 8000,
      concept: "SALARIO",
      notes: "Pago demo desde caja.",
      status: "CONFIRMADA",
      origin: "CAJA",
      createdBy: cajero1Id,
      createdByName: "Cajero 1",
      approvedBy: cajero1Id,
      approvedByName: "Cajero 1",
      approvedAt: "2026-07-01T20:00:00.000-03:00",
      createdAt: "2026-07-01T20:00:00.000-03:00",
      updatedAt: "2026-07-01T20:00:00.000-03:00",
    },
    {
      id: "salary-demo-2",
      period: "2026-07",
      balanceId: balance3.id,
      staffId: staffMember.id,
      staffName: staffFullName(staffMember),
      localId: local.id,
      baseSalary: 0,
      advances: 5000,
      extraAmount: 0,
      extraConcept: "",
      aguinaldo: 0,
      vacationSalary: 0,
      otherDeductions: 0,
      totalToPay: 0,
      concept: "ADELANTO",
      notes: "Adelanto demo.",
      status: "CONFIRMADA",
      origin: "CAJA",
      createdBy: cajero1Id,
      createdByName: "Cajero 1",
      approvedBy: cajero1Id,
      approvedByName: "Cajero 1",
      approvedAt: "2026-07-03T20:15:00.000-03:00",
      createdAt: "2026-07-03T20:15:00.000-03:00",
      updatedAt: "2026-07-03T20:15:00.000-03:00",
    },
  ];
  const capitalMovements: CapitalMovement[] = [
    {
      id: "capital-demo-opening-cash",
      balanceId: balance1.id,
      localId: local.id,
      type: "APORTE",
      medium: "EFECTIVO",
      timing: "APERTURA",
      person: "MATHIAS",
      amount: 50000,
      note: "Capital inicial demo efectivo",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T18:00:00.000-03:00",
    },
    {
      id: "capital-demo-opening-bank",
      balanceId: balance1.id,
      localId: local.id,
      type: "APORTE",
      medium: "TRANSFERENCIA",
      timing: "APERTURA",
      person: "MATHIAS",
      amount: 10000,
      note: "Capital inicial demo banco",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T18:01:00.000-03:00",
    },
    {
      id: "capital-demo-aporte-cash",
      balanceId: balance1.id,
      localId: local.id,
      type: "APORTE",
      medium: "EFECTIVO",
      timing: "OPERATIVO",
      person: "RICARDO",
      amount: 10000,
      note: "Aporte operativo demo",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T19:00:00.000-03:00",
    },
    {
      id: "capital-demo-retiro-cash-1",
      balanceId: balance1.id,
      localId: local.id,
      type: "RETIRO",
      medium: "EFECTIVO",
      timing: "CIERRE",
      person: "RICARDO",
      amount: 6000,
      note: "Retiro final demo",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T23:40:00.000-03:00",
    },
    {
      id: "capital-demo-retiro-bank-1",
      balanceId: balance1.id,
      localId: local.id,
      type: "RETIRO",
      medium: "TRANSFERENCIA",
      timing: "CIERRE",
      person: "MATHIAS",
      amount: 3000,
      note: "Retiro banco demo",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-01T23:42:00.000-03:00",
    },
    {
      id: "capital-demo-retiro-cash-2",
      balanceId: balance2.id,
      localId: local.id,
      type: "RETIRO",
      medium: "EFECTIVO",
      timing: "CIERRE",
      person: "RICARDO",
      amount: 10000,
      note: "Retiro final demo",
      status: "ACTIVO",
      userId: cajero2Id,
      createdAt: "2026-07-02T23:25:00.000-03:00",
    },
    {
      id: "capital-demo-aporte-bank-3",
      balanceId: balance3.id,
      localId: local.id,
      type: "APORTE",
      medium: "TRANSFERENCIA",
      timing: "OPERATIVO",
      person: "MATHIAS",
      amount: 5000,
      note: "Aporte banco demo",
      status: "ACTIVO",
      userId: cajero1Id,
      createdAt: "2026-07-03T19:30:00.000-03:00",
    },
  ];
  const accountMovements = [
    ...salarySettlements.flatMap((settlement) => [
      salaryAccountMovement(settlement, settlement.approvedBy ?? settlement.createdBy ?? "system"),
      localSalaryAccountMovement(settlement, settlement.approvedBy ?? settlement.createdBy ?? "system"),
    ]),
    ...expenses.map((expense) => localExpenseAccountMovement(expense, local.id)),
    ...transfers.flatMap((transfer) => [transferAccountMovement(transfer), localTransferAccountMovement(transfer, local.id)]),
    ...gifts.map((gift) => localGiftAccountMovement(gift, local.id)),
    ...capitalMovements.map(capitalAccountMovement),
    ...balances
      .map((balance) => {
        const result = readings
          .filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA")
          .reduce((total, reading) => total + reading.result, 0);
        return machineResultAccountMovement(balance, result, balance.closedBy ?? balance.openedBy);
      })
      .filter(Boolean),
  ] as AccountMovement[];
  const audit: AuditEvent[] = [
    {
      id: "audit-demo-1",
      userId: cajero1Id,
      userName: "Cajero 1",
      actualRole: "CAJERO",
      actorRole: "CAJERO",
      action: "Cerrar caja demo",
      entity: "Caja",
      entityId: balance1.id,
      previousValue: "{}",
      newValue: JSON.stringify({ visibleId: balance1.visibleId, differenceStatus: balance1.differenceStatus }),
      reason: "Datos demo para pruebas de encargado",
      createdAt: balance1.closedAt ?? "2026-07-01T23:45:00.000-03:00",
    },
    {
      id: "audit-demo-2",
      userId: "user-encargado",
      userName: "Encargado",
      actualRole: "ENCARGADO",
      actorRole: "ENCARGADO",
      action: "Observar gasto demo",
      entity: "Gasto",
      entityId: "expense-demo-3",
      previousValue: "{}",
      newValue: JSON.stringify({ reviewStatus: "OBSERVADO" }),
      reason: "Falta comprobante",
      createdAt: "2026-07-03T22:30:00.000-03:00",
    },
  ];

  return {
    balances,
    readings,
    expenses,
    transfers,
    gifts,
    salarySettlements,
    capitalMovements,
    accountMovements,
    audit,
  };
}

function createSeedData(): AppData {
  const local: Local = {
    id: POSEIDON_LOCAL_ID,
    name: "Poseidon",
    tenantName: "Locatario inicial",
    phone: "",
    email: "",
    address: "Local principal",
    googleMapsUrl: "",
    images: [],
    status: "ACTIVO",
  };

  const baseNames = ["Poseidon Azul", "Poseidon Roja", "Fondo 3"];
  const machines: Machine[] = Array.from({ length: 3 }, (_, index) => ({
    id: `machine-${index + 1}`,
    visibleId: String(index + 1),
    name: baseNames[index] ?? `Maquina ${index + 1}`,
    localId: local.id,
    location: local.name,
    lastIn: [83000, 76000, 24000][index] ?? 0,
    lastOut: [65000, 64000, 19000][index] ?? 0,
    status: "ACTIVA",
    notes: "",
  }));

  const staff = createDemoStaff(local.id);
  const clients = createDemoClients(local.id);
  const demo = createDemoOperationalData(local, machines, staff, clients);
  const salaryHistories = staff.map((staffMember) =>
    salaryHistoryEvent(
      staffMember,
      staffMember.salaryType,
      staffMember.nominalSalary,
      staffMember.salaryType,
      staffMember.nominalSalary,
      staffMember.hireDate,
      "Alta inicial de salario",
      "system",
      "Sistema",
    ),
  );

  return {
    users: createDemoUsers(local.id),
    staff,
    salarySettlements: demo.salarySettlements,
    salaryHistories,
    salaryClosures: [],
    clients,
    periodicClosures: [],
    currentAccounts: [
      createLocalCashCurrentAccount(local),
      createLocalBankCurrentAccount(local),
      createTransferCurrentAccount(),
      ...staff.map((staffMember) => createStaffCurrentAccount(staffMember)),
    ],
    accountMovements: demo.accountMovements,
    capitalMovements: demo.capitalMovements,
    locals: [local],
    machines,
    balances: demo.balances,
    readings: demo.readings,
    expenseCategories: defaultExpenseCategories,
    expenses: demo.expenses,
    transfers: demo.transfers,
    gifts: demo.gifts,
    audit: demo.audit,
    machineLocalHistory: machines.flatMap((machine) => [
      machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "AGREGADA", "Carga inicial en taller", "system"),
      machineHistoryEvent(machine, local.id, "MOVIDA", "Asignada a Poseidon para datos demo", "system"),
    ]),
  };
}

function readData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? normalizeData(JSON.parse(raw) as AppData) : createSeedData();
    if (window.location.search.includes("resetSaldos=1")) {
      const cleaned = normalizeData(clearOperationalData(data));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(cleaned)));
      window.history.replaceState({}, "", window.location.pathname);
      return cleaned;
    }
    return data;
  } catch {
    return createSeedData();
  }
}

function normalizeData(data: AppData): AppData {
  const seed = createSeedData();
  const source = {
    ...seed,
    ...data,
    users: Array.isArray(data.users) ? data.users : seed.users,
    staff: Array.isArray(data.staff) ? data.staff : seed.staff,
    salarySettlements: Array.isArray(data.salarySettlements) ? data.salarySettlements : seed.salarySettlements,
    salaryHistories: Array.isArray(data.salaryHistories) ? data.salaryHistories : [],
    salaryClosures: Array.isArray(data.salaryClosures) ? data.salaryClosures : [],
    clients: Array.isArray(data.clients) ? data.clients : seed.clients,
    periodicClosures: Array.isArray(data.periodicClosures) ? data.periodicClosures : seed.periodicClosures,
    currentAccounts: Array.isArray(data.currentAccounts) ? data.currentAccounts : seed.currentAccounts,
    accountMovements: Array.isArray(data.accountMovements) ? data.accountMovements : seed.accountMovements,
    capitalMovements: Array.isArray(data.capitalMovements) ? data.capitalMovements : seed.capitalMovements,
    locals: Array.isArray(data.locals) && data.locals.length ? data.locals : seed.locals,
    machines: Array.isArray(data.machines) ? data.machines : seed.machines,
    balances: Array.isArray(data.balances) ? data.balances : [],
    readings: Array.isArray(data.readings) ? data.readings : [],
    expenseCategories: Array.isArray(data.expenseCategories) ? data.expenseCategories : seed.expenseCategories,
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    transfers: Array.isArray(data.transfers) ? data.transfers : [],
    gifts: Array.isArray(data.gifts) ? data.gifts : [],
    audit: Array.isArray(data.audit) ? data.audit : [],
    machineLocalHistory: Array.isArray(data.machineLocalHistory) ? data.machineLocalHistory : [],
  };

  const usedLocalIds = new Set<string>();
  const localIdMap = new Map<string, string>();
  const locals = source.locals.map((local, index) => {
    const preferred = local.id === LEGACY_POSEIDON_LOCAL_ID || (index === 0 && local.name === "Poseidon") ? POSEIDON_LOCAL_ID : shortNumberId(local.id);
    let nextId = preferred || nextShortId([...usedLocalIds]);
    while (usedLocalIds.has(nextId)) nextId = nextShortId([...usedLocalIds]);
    usedLocalIds.add(nextId);
    localIdMap.set(local.id, nextId);
    return {
      ...local,
      id: nextId,
      tenantName: local.tenantName ?? "",
      phone: local.phone ?? "",
      email: local.email ?? "",
      googleMapsUrl: local.googleMapsUrl ?? "",
      images: Array.isArray(local.images) ? local.images.map((image) => ({ ...image, dataUrl: "" })) : [],
    };
  });

  if (!locals.some((local) => local.id === POSEIDON_LOCAL_ID)) {
    locals.unshift(seed.locals[0]);
    usedLocalIds.add(POSEIDON_LOCAL_ID);
  }

  const mapLocalId = (localId: string) =>
    localId === WORKSHOP_LOCAL_ID ? WORKSHOP_LOCAL_ID : localIdMap.get(localId) ?? (localId === LEGACY_POSEIDON_LOCAL_ID ? POSEIDON_LOCAL_ID : localId);
  const usedMachineIds = new Set<string>();
  const machines = source.machines.map((machine) => {
    let visibleId = shortNumberId(machine.visibleId) || nextShortId([...usedMachineIds]);
    while (usedMachineIds.has(visibleId)) visibleId = nextShortId([...usedMachineIds]);
    usedMachineIds.add(visibleId);
    return {
      ...machine,
      visibleId,
      localId: mapLocalId(machine.localId),
      status: mapLocalId(machine.localId) === WORKSHOP_LOCAL_ID && machine.status === "INACTIVA" ? "DESUSO" : machine.status,
    };
  });

  const machineIds = new Set(machines.map((machine) => machine.id));
  const demoUsers = createDemoUsers(POSEIDON_LOCAL_ID);
  const existingUserIds = new Set(source.users.map((item) => item.id));
  const users = [...demoUsers.filter((item) => !existingUserIds.has(item.id)), ...source.users].map((item) => ({
    ...item,
    localIds: item.localIds.map(mapLocalId),
  }));
  const staff = source.staff.map((item, index) => ({
    ...item,
    visibleId: shortNumberId(item.visibleId) || String(index + 1),
    firstName: item.firstName ?? "",
    lastName: item.lastName ?? "",
    documentId: item.documentId ?? "",
    address: item.address ?? "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    birthDate: item.birthDate ?? "",
    hireDate: item.hireDate ?? today(),
    position: item.position ?? "",
    localId: mapLocalId(item.localId ?? POSEIDON_LOCAL_ID),
    salaryType: item.salaryType ?? "MENSUAL",
    nominalSalary: Number(item.nominalSalary ?? 0),
    salaryAdvanceBalance: Number(item.salaryAdvanceBalance ?? 0),
    vacationDays: Number(item.vacationDays ?? 20),
    usedVacationDays: Number(item.usedVacationDays ?? 0),
    estimatedAguinaldo: Number(item.estimatedAguinaldo ?? Math.round(Number(item.nominalSalary ?? 0) / 12)),
    estimatedVacationSalary: Number(item.estimatedVacationSalary ?? Math.round((Number(item.nominalSalary ?? 0) / 30) * Number(item.vacationDays ?? 20))),
    emergencyContact: item.emergencyContact ?? "",
    bankAccount: item.bankAccount ?? "",
    schedule: Array.isArray(item.schedule) && item.schedule.length ? item.schedule : defaultSchedule,
    notes: item.notes ?? "",
    status: item.status ?? "ACTIVO",
    createdAt: item.createdAt ?? nowIso(),
    updatedAt: item.updatedAt ?? nowIso(),
  }));
  const salaryHistories = source.salaryHistories.length
    ? source.salaryHistories.map((history) => ({
        ...history,
        staffName: history.staffName ?? staffFullName(staff.find((staffItem) => staffItem.id === history.staffId) ?? { firstName: "", lastName: "" }),
        localId: mapLocalId(history.localId ?? staff.find((staffItem) => staffItem.id === history.staffId)?.localId ?? POSEIDON_LOCAL_ID),
        previousSalaryType: history.previousSalaryType ?? "MENSUAL",
        newSalaryType: history.newSalaryType ?? "MENSUAL",
        previousNominalSalary: Number(history.previousNominalSalary ?? 0),
        newNominalSalary: Number(history.newNominalSalary ?? 0),
        effectiveDate: history.effectiveDate ?? history.createdAt?.slice(0, 10) ?? today(),
        reason: history.reason ?? "",
        userId: history.userId ?? "system",
        userName: history.userName ?? users.find((user) => user.id === history.userId)?.name ?? (history.userId === "system" ? "Sistema" : history.userId ?? "Sistema"),
        createdAt: history.createdAt ?? nowIso(),
      }))
    : staff.map((staffMember) =>
        salaryHistoryEvent(
          staffMember,
          staffMember.salaryType,
          Number(staffMember.nominalSalary ?? 0),
          staffMember.salaryType,
          Number(staffMember.nominalSalary ?? 0),
          staffMember.hireDate || staffMember.createdAt.slice(0, 10) || today(),
          "Alta inicial de salario",
          "system",
          "Sistema",
        ),
      );
  const clients = source.clients.map((item, index) => {
    const documentType = normalizeClientDocumentType(item.documentType);
    return {
      ...item,
      visibleId: shortNumberId(item.visibleId) || String(index + 1),
      name: item.name ?? "",
      documentType,
      documentId: normalizeClientDocument(documentType, item.documentId ?? ""),
      photoFile: normalizeStoredFileMeta(item.photoFile),
      identityDocumentFile: normalizeStoredFileMeta(item.identityDocumentFile),
      phone: item.phone ?? "",
      email: item.email ?? "",
      address: item.address ?? "",
      birthDate: item.birthDate ?? "",
      localId: mapLocalId(item.localId ?? POSEIDON_LOCAL_ID),
      category: item.category ?? "GENERAL",
      notes: item.notes ?? "",
      status: item.status ?? "ACTIVO",
      createdAt: item.createdAt ?? nowIso(),
      updatedAt: item.updatedAt ?? nowIso(),
    };
  });
  const userNameById = (userId: string | undefined) => users.find((user) => user.id === userId)?.name ?? (userId === "system" ? "Sistema" : userId ?? "Sistema");
  const salarySettlements = source.salarySettlements.map((item) => {
    const createdBy = item.createdBy ?? item.approvedBy ?? "system";
    const approvedBy = item.status === "CONFIRMADA" ? item.approvedBy ?? createdBy : item.approvedBy;
    const annulledBy = item.status === "ANULADA" ? item.annulledBy ?? item.approvedBy ?? item.createdBy ?? "system" : item.annulledBy;
    return {
      ...item,
      period: item.period ?? today().slice(0, 7),
      balanceId: item.balanceId,
      staffName: item.staffName ?? staffFullName(staff.find((staffItem) => staffItem.id === item.staffId) ?? { firstName: "", lastName: "" }),
      localId: mapLocalId(item.localId ?? POSEIDON_LOCAL_ID),
      baseSalary: isSalaryPaymentConcept(normalizeSalaryConcept(item.concept)) ? 0 : Number(item.baseSalary ?? 0),
      advances: Number(item.advances ?? 0),
      extraAmount: Number(item.extraAmount ?? 0),
      extraConcept: item.extraConcept ?? "",
      aguinaldo: Number(item.aguinaldo ?? 0),
      vacationSalary: Number(item.vacationSalary ?? 0),
      otherDeductions: Number(item.otherDeductions ?? 0),
      totalToPay: isSalaryPaymentConcept(normalizeSalaryConcept(item.concept))
        ? Number(item.totalToPay ?? 0) || Number(item.baseSalary ?? 0)
        : Number(item.totalToPay ?? 0),
      concept: normalizeSalaryConcept(item.concept),
      notes: item.notes ?? "",
      status: item.status ?? "BORRADOR",
      origin: item.origin ?? (item.balanceId ? "CAJA" : "LIQUIDACION"),
      createdBy,
      createdByName: item.createdByName ?? userNameById(createdBy),
      approvedBy,
      approvedByName: item.approvedByName ?? (approvedBy ? userNameById(approvedBy) : undefined),
      approvedAt: item.approvedAt ?? (item.status === "CONFIRMADA" ? item.updatedAt ?? item.createdAt ?? nowIso() : undefined),
      annulledBy,
      annulledByName: item.annulledByName ?? (annulledBy ? userNameById(annulledBy) : undefined),
      annulledAt: item.annulledAt ?? (item.status === "ANULADA" ? item.updatedAt ?? nowIso() : undefined),
      createdAt: item.createdAt ?? nowIso(),
      updatedAt: item.updatedAt ?? nowIso(),
    };
  });
  const balancesBase = source.balances.map((balance) => ({ ...balance, localId: mapLocalId(balance.localId) }));
  const visibleByBalanceId = new Map<string, string>();
  locals.forEach((local) => {
    const localBalances = balancesBase
      .filter((balance) => balance.localId === local.id)
      .sort((a, b) => String(a.openedAt ?? a.operatingDate).localeCompare(String(b.openedAt ?? b.operatingDate)));
    const used = new Set<string>();
    localBalances.forEach((balance, index) => {
      let visibleId = balance.visibleId || `${localCode(local.name)}-${index + 1}`;
      while (used.has(visibleId)) {
        visibleId = `${localCode(local.name)}-${used.size + 1}`;
      }
      used.add(visibleId);
      visibleByBalanceId.set(balance.id, visibleId);
    });
  });
  const balances = balancesBase.map((balance) => ({
    ...balance,
    visibleId: visibleByBalanceId.get(balance.id) ?? balance.visibleId,
    initialBankFund: Number(balance.initialBankFund ?? 0),
    openedByRole: balance.openedByRole ?? users.find((userItem) => userItem.id === balance.openedBy)?.role,
    closedByRole: balance.closedByRole ?? users.find((userItem) => userItem.id === balance.closedBy)?.role,
    declaredBank: balance.declaredBank === undefined ? undefined : Number(balance.declaredBank),
    nextBankBase: balance.nextBankBase === undefined ? undefined : Number(balance.nextBankBase),
    finalWithdrawalCash: Number(balance.finalWithdrawalCash ?? 0),
    finalWithdrawalBank: Number(balance.finalWithdrawalBank ?? 0),
    bankDifference: Number(balance.bankDifference ?? 0),
    differenceReviewedBy: balance.differenceReviewedBy,
    differenceReviewedAt: balance.differenceReviewedAt,
    differenceReviewNote: balance.differenceReviewNote ?? "",
  }));
  const balanceLocalId = (balanceId: string) => balances.find((balance) => balance.id === balanceId)?.localId ?? POSEIDON_LOCAL_ID;
  const expenses = source.expenses.map((expense) => ({
    ...expense,
    balanceId: expense.balanceId,
    category: expense.category ?? "",
    subcategory: expense.subcategory ?? "",
    amount: Number(expense.amount ?? 0),
    description: expense.description ?? "",
    receipt: expense.receipt ?? "",
    receiptFileName: expense.receiptFileName,
    receiptFileType: expense.receiptFileType,
    receiptDataUrl: undefined,
    status: expense.status ?? "ACTIVO",
    reviewStatus: expense.reviewStatus ?? "PENDIENTE",
    reviewedBy: expense.reviewedBy,
    reviewedAt: expense.reviewedAt,
    reviewNote: expense.reviewNote ?? "",
    userId: expense.userId ?? "system",
    createdAt: expense.createdAt ?? nowIso(),
  }));
  const transfers = source.transfers.map((transfer) => ({
    ...transfer,
    clientId: transfer.clientId || undefined,
    receipt: transfer.receipt ?? "",
    name: transfer.name ?? "",
    amount: Number(transfer.amount ?? 0),
    account: transfer.account ?? "Cuenta unica inicial",
    status: transfer.status ?? "ACTIVO",
    userId: transfer.userId ?? "system",
    createdAt: transfer.createdAt ?? nowIso(),
  }));
  const gifts = source.gifts.map((gift) => ({
    ...gift,
    clientIds: gift.clientIds ?? (gift.clientId ? [gift.clientId] : []),
    type: gift.type ?? "EFECTIVO",
    cashAmount: Number(gift.cashAmount ?? 0),
    creditAmount: Number(gift.creditAmount ?? 0),
    reference: gift.reference ?? "",
    description: gift.description ?? "",
    status: gift.status ?? "ACTIVO",
    userId: gift.userId ?? "system",
    createdAt: gift.createdAt ?? nowIso(),
  }));
  const capitalMovements = source.capitalMovements.map((movement) => ({
    ...movement,
    localId: mapLocalId(movement.localId ?? balanceLocalId(movement.balanceId)),
    type: movement.type ?? "RETIRO",
    medium: movement.medium ?? "EFECTIVO",
    timing: movement.timing ?? "OPERATIVO",
    person: movement.person ?? "RICARDO",
    amount: Number(movement.amount ?? 0),
    note: movement.note ?? "",
    status: movement.status ?? "ACTIVO",
    userId: movement.userId ?? "system",
    createdAt: movement.createdAt ?? nowIso(),
  }));
  const periodicClosures = source.periodicClosures.map((closure, index) => ({
    ...closure,
    visibleId: closure.visibleId ?? `PER-${index + 1}`,
    localId: mapLocalId(closure.localId ?? POSEIDON_LOCAL_ID),
    type: closure.type ?? "PERSONALIZADO",
    startDate: closure.startDate ?? today(),
    endDate: closure.endDate ?? today(),
    balanceIds: Array.isArray(closure.balanceIds) ? closure.balanceIds : [],
    resultMachines: Number(closure.resultMachines ?? 0),
    totalExpenses: Number(closure.totalExpenses ?? 0),
    totalSalaries: Number(closure.totalSalaries ?? 0),
    totalGifts: Number(closure.totalGifts ?? 0),
    totalOutflows: Number(closure.totalOutflows ?? 0),
    commercialResult: Number(closure.commercialResult ?? 0),
    totalTransfers: Number(closure.totalTransfers ?? 0),
    totalWithdrawals: Number(closure.totalWithdrawals ?? 0),
    totalContributions: Number(closure.totalContributions ?? 0),
    cashDifference: Number(closure.cashDifference ?? 0),
    bankDifference: Number(closure.bankDifference ?? 0),
    pendingDifferences: Number(closure.pendingDifferences ?? 0),
    status: closure.status ?? "GENERADO",
    note: closure.note ?? "",
    createdBy: closure.createdBy ?? "system",
    createdAt: closure.createdAt ?? nowIso(),
  }));
  const salaryClosures = source.salaryClosures.map((closure, index) => ({
    ...closure,
    visibleId: closure.visibleId ?? `LS-${index + 1}`,
    startDate: closure.startDate ?? today(),
    endDate: closure.endDate ?? today(),
    periodLabel: closure.periodLabel ?? `${closure.startDate ?? today()} a ${closure.endDate ?? today()}`,
    employeeCount: Number(closure.employeeCount ?? 0),
    settlementIds: Array.isArray(closure.settlementIds) ? closure.settlementIds : [],
    totalBase: Number(closure.totalBase ?? 0),
    totalExtras: Number(closure.totalExtras ?? 0),
    totalBonuses: Number(closure.totalBonuses ?? 0),
    totalDeductions: Number(closure.totalDeductions ?? 0),
    totalSalaries: Number(closure.totalSalaries ?? 0),
    totalSalaryPaid: Number(closure.totalSalaryPaid ?? 0),
    totalAdvances: Number(closure.totalAdvances ?? 0),
    totalLiquidated: Number(closure.totalLiquidated ?? 0),
    totalPending: Number(closure.totalPending ?? 0),
    status: closure.status ?? "CERRADO",
    note: closure.note ?? "",
    createdBy: closure.createdBy ?? "system",
    createdByName: closure.createdByName ?? userNameById(closure.createdBy ?? "system"),
    createdAt: closure.createdAt ?? nowIso(),
  }));
  const accountById = new Map<string, CurrentAccount>();
  source.currentAccounts.forEach((account) => {
    accountById.set(account.id, {
      id: account.id,
      kind: account.kind ?? "PERSONAL",
      entityId: account.entityId,
      name: account.name ?? account.id,
      status: account.status ?? "ACTIVA",
      createdAt: account.createdAt ?? nowIso(),
      updatedAt: account.updatedAt ?? nowIso(),
    });
  });
  accountById.set(TRANSFER_ACCOUNT_ID, createTransferCurrentAccount(accountById.get(TRANSFER_ACCOUNT_ID)));
  locals.forEach((local) => {
    accountById.set(localCashAccountId(local.id), createLocalCashCurrentAccount(local, accountById.get(localCashAccountId(local.id))));
    accountById.set(localBankAccountId(local.id), createLocalBankCurrentAccount(local, accountById.get(localBankAccountId(local.id))));
  });
  staff.forEach((staffMember) => {
    accountById.set(staffAccountId(staffMember.id), createStaffCurrentAccount(staffMember, accountById.get(staffAccountId(staffMember.id))));
  });
  const currentAccounts = [...accountById.values()];
  const accountIds = new Set(currentAccounts.map((account) => account.id));
  const movementById = new Map<string, AccountMovement>();
  source.accountMovements.forEach((movement) => {
    if (!accountIds.has(movement.accountId)) return;
    movementById.set(movement.id, {
      id: movement.id,
      accountId: movement.accountId,
      balanceId: movement.balanceId,
      sourceType: movement.sourceType ?? "AJUSTE",
      sourceId: movement.sourceId ?? movement.id,
      direction: movement.direction ?? "SALIDA",
      concept: movement.concept ?? "",
      amount: Number(movement.amount ?? 0),
      detail: movement.detail ?? "",
      status: movement.status ?? "ACTIVO",
      userId: movement.userId ?? "system",
      createdAt: movement.createdAt ?? nowIso(),
    });
  });
  salarySettlements.forEach((settlement) => {
    if (!accountIds.has(staffAccountId(settlement.staffId))) return;
    const movementUserId = settlement.approvedBy ?? settlement.createdBy ?? "system";
    movementById.set(`account-movement-salary-${settlement.id}`, salaryAccountMovement(settlement, movementUserId));
    if (accountIds.has(localCashAccountId(settlement.localId))) {
      movementById.set(`account-movement-local-salary-${settlement.id}`, localSalaryAccountMovement(settlement, movementUserId));
    }
  });
  expenses.forEach((expense) => {
    const localId = balanceLocalId(expense.balanceId);
    if (accountIds.has(localCashAccountId(localId))) {
      movementById.set(`account-movement-local-expense-${expense.id}`, localExpenseAccountMovement(expense, localId));
    }
  });
  transfers.forEach((transfer) => {
    movementById.set(`account-movement-transfer-${transfer.id}`, transferAccountMovement(transfer));
    const localId = balanceLocalId(transfer.balanceId);
    if (accountIds.has(localBankAccountId(localId))) {
      movementById.set(`account-movement-local-transfer-${transfer.id}`, localTransferAccountMovement(transfer, localId));
    }
  });
  gifts.forEach((gift) => {
    const localId = balanceLocalId(gift.balanceId);
    if (accountIds.has(localCashAccountId(localId))) {
      movementById.set(`account-movement-local-gift-${gift.id}`, localGiftAccountMovement(gift, localId));
    }
  });
  capitalMovements.forEach((movement) => {
    const accountId = localAccountIdForMedium(movement.localId, movement.medium);
    if (accountIds.has(accountId)) {
      movementById.set(`account-movement-capital-${movement.id}`, capitalAccountMovement(movement));
    }
  });
  balances.forEach((balance) => {
    const result = source.readings
      .filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA")
      .reduce((total, reading) => total + Number(reading.result ?? 0), 0);
    const movement = machineResultAccountMovement(balance, result, balance.closedBy ?? balance.openedBy ?? "system");
    if (movement && accountIds.has(movement.accountId)) {
      movementById.set(movement.id, movement);
    }
  });
  const accountMovements = [...movementById.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const auditEvents = source.audit.map((event) => ({
    ...event,
    userName: event.userName ?? source.users.find((user) => user.id === event.userId)?.name ?? "Sistema",
    actualRole: event.actualRole,
    actorRole: event.actorRole,
  }));
  const machineLocalHistory = source.machineLocalHistory.length
    ? source.machineLocalHistory.map((event) => ({ ...event, localId: mapLocalId(event.localId) }))
    : machines.map((machine) => machineHistoryEvent(machine, machine.localId, "AGREGADA", "Carga inicial migrada", "system"));
  return {
    ...source,
    users,
    staff,
    salarySettlements,
    salaryHistories,
    salaryClosures,
    clients,
    periodicClosures,
    currentAccounts,
    accountMovements,
    capitalMovements,
    locals,
    machines,
    balances,
    expenseCategories: source.expenseCategories.length ? source.expenseCategories : seed.expenseCategories,
    expenses,
    transfers,
    gifts,
    readings: source.readings.filter((reading) => machineIds.has(reading.machineId)),
    audit: auditEvents,
    machineLocalHistory,
  };
}

function calcReading(reading: Pick<Reading, "inPrevious" | "inActual" | "outPrevious" | "outActual">) {
  if (reading.inActual === null || reading.outActual === null) return 0;
  return reading.inActual - reading.inPrevious - (reading.outActual - reading.outPrevious);
}

function totalsForBalance(data: AppData, balanceId: string) {
  const readings = data.readings.filter((reading) => reading.balanceId === balanceId && reading.status === "CARGADA");
  const expenses = data.expenses.filter((expense) => expense.balanceId === balanceId && expense.status === "ACTIVO");
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balanceId && transfer.status === "ACTIVO");
  const gifts = data.gifts.filter((gift) => gift.balanceId === balanceId && gift.status === "ACTIVO");
  const capitalMovements = data.capitalMovements.filter((movement) => movement.balanceId === balanceId && movement.status === "ACTIVO");
  const operatingCapitalMovements = capitalMovements.filter((movement) => movement.timing !== "APERTURA");
  const openingCapitalMovements = capitalMovements.filter((movement) => movement.timing === "APERTURA");
  const balance = data.balances.find((item) => item.id === balanceId);
  const salaryPayments = data.salarySettlements.filter((settlement) => settlement.balanceId === balanceId && settlement.status !== "ANULADA");
  const resultMachines = readings.reduce((total, reading) => total + reading.result, 0);
  const totalIn = readings.reduce((total, reading) => total + ((reading.inActual ?? reading.inPrevious) - reading.inPrevious), 0);
  const totalOut = readings.reduce((total, reading) => total + ((reading.outActual ?? reading.outPrevious) - reading.outPrevious), 0);
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const totalTransfers = transfers.reduce((total, transfer) => total + transfer.amount, 0);
  const giftCash = gifts.reduce((total, gift) => total + gift.cashAmount, 0);
  const giftCredit = gifts.reduce((total, gift) => total + gift.creditAmount, 0);
  const totalSalaries = salaryPayments.reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
  const withdrawalsCash = operatingCapitalMovements
    .filter((movement) => movement.type === "RETIRO" && movement.medium === "EFECTIVO")
    .reduce((total, movement) => total + movement.amount, 0);
  const withdrawalsBank = operatingCapitalMovements
    .filter((movement) => movement.type === "RETIRO" && movement.medium === "TRANSFERENCIA")
    .reduce((total, movement) => total + movement.amount, 0);
  const capitalContributionsCash = operatingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "EFECTIVO")
    .reduce((total, movement) => total + movement.amount, 0);
  const capitalContributionsBank = operatingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "TRANSFERENCIA")
    .reduce((total, movement) => total + movement.amount, 0);
  const openingCapitalCash = openingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "EFECTIVO")
    .reduce((total, movement) => total + movement.amount, 0);
  const openingCapitalBank = openingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "TRANSFERENCIA")
    .reduce((total, movement) => total + movement.amount, 0);
  const expectedCash =
    (balance?.initialFund ?? 0) + resultMachines + capitalContributionsCash - totalExpenses - totalSalaries - giftCash - totalTransfers - withdrawalsCash;
  const commercialResult = resultMachines - totalExpenses - totalSalaries - giftCash - giftCredit;
  const withdrawal = (balance?.declaredCash ?? 0) - (balance?.nextBase ?? 0);
  const difference = (balance?.declaredCash ?? 0) - expectedCash;

  return {
    totalIn,
    totalOut,
    resultMachines,
    totalExpenses,
    totalSalaries,
    totalTransfers,
    giftCash,
    giftCredit,
    withdrawalsCash,
    withdrawalsBank,
    capitalContributionsCash,
    capitalContributionsBank,
    openingCapitalCash,
    openingCapitalBank,
    totalWithdrawals: withdrawalsCash + withdrawalsBank,
    totalCapitalContributions: capitalContributionsCash + capitalContributionsBank,
    expectedCash,
    commercialResult,
    withdrawal,
    difference,
  };
}

function cashDifferenceForBalance(data: AppData, balance: Balance) {
  return balance.cashDifference ?? totalsForBalance(data, balance.id).difference;
}

function bankDifferenceForBalance(balance: Balance) {
  return balance.bankDifference ?? 0;
}

function balanceHasDifference(data: AppData, balance: Balance) {
  return cashDifferenceForBalance(data, balance) !== 0 || bankDifferenceForBalance(balance) !== 0;
}

function differenceIsPending(balance: Balance) {
  return (balance.differenceStatus ?? "PENDIENTE") === "PENDIENTE";
}

function pendingDifferenceCount(data: AppData) {
  return data.balances.filter((balance) => balance.status === "CERRADO" && balanceHasDifference(data, balance) && differenceIsPending(balance)).length;
}

function differenceActionImpact(status: DifferenceStatus | "") {
  if (status === "REVISADA") return "Marca la recaudacion como revisada. No mueve caja, banco ni resultado economico.";
  if (status === "RESUELTA") return "Cierra el control como resuelto. No genera ajuste automatico.";
  if (status === "AJUSTADA") return "Indica que hubo ajuste definido. El movimiento contable debe registrarse aparte y auditado.";
  if (status === "ANULADA") return "Anula el reclamo operativo de diferencia. No borra la auditoria del cierre.";
  return "Elegir una accion no modifica saldos automaticamente; solo cambia el estado de control.";
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function tableToRows(rows: string[][]) {
  return rows
    .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/&/g, "&amp;")}</td>`).join("")}</tr>`)
    .join("");
}

function exportDailyExcel(data: AppData, balance: Balance) {
  const totals = totalsForBalance(data, balance.id);
  const declaredBank = balance.declaredBank ?? balance.nextBankBase ?? 0;
  const bankDifference = balance.bankDifference ?? 0;
  const expectedBank = declaredBank - bankDifference;
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const expenses = data.expenses.filter((expense) => expense.balanceId === balance.id);
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balance.id);
  const gifts = data.gifts.filter((gift) => gift.balanceId === balance.id);
  const machineRows = readings.map((reading) => {
    const machine = data.machines.find((item) => item.id === reading.machineId);
    return [
      machine?.visibleId ?? "",
      machine?.name ?? "",
      String(reading.inPrevious),
      String(reading.inActual ?? ""),
      String(reading.outPrevious),
      String(reading.outActual ?? ""),
      String(reading.result),
      reading.status,
      reading.observation,
    ];
  });

  const html = `
    <html><body>
      <h1>Poseidon - Cierre diario ${balance.operatingDate}</h1>
      <table border="1">${tableToRows([
        ["Efectivo inicial", String(balance.initialFund)],
        ["Banco inicial", String(balance.initialBankFund ?? 0)],
        ["Apertura por", userDisplayName(data, balance.openedBy)],
        ["Funcion apertura", balance.openedByRole ? roleLabels[balance.openedByRole] : ""],
        ["Cierre por", userDisplayName(data, balance.closedBy)],
        ["Funcion cierre", balance.closedByRole ? roleLabels[balance.closedByRole] : ""],
        ["Total IN", String(totals.totalIn)],
        ["Total OUT", String(totals.totalOut)],
        ["Resultado maquinas", String(totals.resultMachines)],
        ["Gastos", String(totals.totalExpenses)],
        ["Salarios", String(totals.totalSalaries)],
        ["Regalos efectivo", String(totals.giftCash)],
        ["Regalos credito", String(totals.giftCredit)],
        ["Transferencias", String(totals.totalTransfers)],
        ["Retiros efectivo", String(totals.withdrawalsCash)],
        ["Retiros transferencia", String(totals.withdrawalsBank)],
        ["Aportes efectivo", String(totals.capitalContributionsCash)],
        ["Aportes transferencia", String(totals.capitalContributionsBank)],
        ["Efectivo esperado", String(totals.expectedCash)],
        ["Efectivo declarado", String(balance.declaredCash ?? 0)],
        ["Efectivo proxima caja", String(balance.nextBase ?? 0)],
        ["Banco esperado", String(expectedBank)],
        ["Banco declarado", String(declaredBank)],
        ["Banco proxima caja", String(balance.nextBankBase ?? 0)],
        ["Retiro final efectivo", String(balance.finalWithdrawalCash ?? 0)],
        ["Retiro final banco", String(balance.finalWithdrawalBank ?? 0)],
        ["Diferencia efectivo", String(balance.cashDifference ?? totals.difference)],
        ["Diferencia banco", String(bankDifference)],
      ])}</table>
      <h2>Maquinas</h2>
      <table border="1">${tableToRows([
        ["ID", "Maquina", "IN anterior", "IN actual", "OUT anterior", "OUT actual", "Resultado", "Estado", "Obs."],
        ...machineRows,
      ])}</table>
      <h2>Movimientos</h2>
      <table border="1">${tableToRows([
        ["Tipo", "Detalle", "Monto", "Estado"],
        ...expenses.map((expense) => ["Gasto", `${expense.category} / ${expense.subcategory || "-"} - ${expense.description}`, String(expense.amount), expense.status]),
        ...transfers.map((transfer) => ["Transferencia", `${transfer.name} - ${transfer.receipt}`, String(transfer.amount), transfer.status]),
        ...gifts.map((gift) => ["Regalo", `${gift.type} - ${gift.description}`, String(gift.cashAmount + gift.creditAmount), gift.status]),
        ...data.capitalMovements
          .filter((movement) => movement.balanceId === balance.id)
          .map((movement) => [movement.type, `${movement.person} - ${movement.medium} - ${movement.note}`, String(movement.amount), movement.status]),
      ])}</table>
    </body></html>
  `;

  downloadFile(`poseidon-cierre-${balance.operatingDate}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
}

function exportCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadFile(filename, content, "text/csv;charset=utf-8");
}

function App() {
  const [data, setData] = useState<AppData>(() => readData());
  const [screen, setScreen] = useState<Screen>("welcome");
  const [user, setUser] = useState<User | null>(null);
  const [actingRole, setActingRole] = useState<Role | null>(null);
  const [message, setMessage] = useState("");
  const [operationalResetApplied, setOperationalResetApplied] = useState(
    () => localStorage.getItem(OPERATIONAL_RESET_MARKER_KEY) === OPERATIONAL_RESET_MARKER,
  );

  useEffect(() => {
    if (operationalResetApplied) return;
    setData((current) => {
      const cleaned = normalizeData(clearOperationalData(current));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(cleaned)));
      localStorage.setItem(OPERATIONAL_RESET_MARKER_KEY, OPERATIONAL_RESET_MARKER);
      return cleaned;
    });
    setUser(null);
    setActingRole(null);
    setScreen("welcome");
    setMessage("Saldos operativos limpiados. Listo para iniciar desde cero.");
    setOperationalResetApplied(true);
  }, [operationalResetApplied]);

  useEffect(() => {
    if (!operationalResetApplied) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(data)));
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(data, true)));
        setMessage("Guardado local compactado: se quitaron archivos pesados del almacenamiento del navegador.");
      } catch {
        setMessage("No se pudo guardar localmente. El dato puede ser demasiado grande.");
      }
    }
  }, [data, operationalResetApplied]);

  const activeLocal = data.locals.find((local) => local.id === POSEIDON_LOCAL_ID) ?? data.locals[0];
  const openBalance = data.balances.find((balance) => balance.localId === activeLocal.id && balance.status === "EN_PROCESO");
  const effectiveRole = user ? actingRole ?? user.role : null;

  const patchData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const goToScreen = (nextScreen: Screen) => {
    setMessage("");
    setScreen(nextScreen);
  };

  const audit = (
    current: AppData,
    action: string,
    entity: string,
    entityId: string,
    previousValue: unknown,
    newValue: unknown,
    reason = "",
  ): AppData => ({
    ...current,
    audit: [
      {
        id: uid("audit"),
        userId: user?.id ?? "system",
        userName: user?.name ?? "Sistema",
        actualRole: user?.role,
        actorRole: effectiveRole ?? user?.role,
        action,
        entity,
        entityId,
        previousValue: JSON.stringify(previousValue ?? ""),
        newValue: JSON.stringify(newValue ?? ""),
        reason,
        createdAt: nowIso(),
      },
      ...current.audit,
    ],
  });

  const resetDemo = () => {
    const fresh = createSeedData();
    setData(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalStorage(fresh)));
    setMessage("Datos reiniciados.");
    setScreen("panel");
  };

  const login = (userId: string) => {
    const nextUser = data.users.find((item) => item.id === userId && item.status === "ACTIVO");

    if (!nextUser) {
      setMessage("Selecciona un usuario activo para ingresar.");
      return;
    }

    setUser(nextUser);
    setActingRole(nextUser.role);
    setMessage("");
    setScreen("panel");
  };

  const openCash = (
    operatingDate: string,
    initialFund: number,
    initialBankFund: number,
    initialNote: string,
    openingCapitalPerson: CapitalMovementPerson,
    firstOpening: boolean,
  ) => {
    patchData((current) => {
      const duplicate = current.balances.find(
        (balance) =>
          balance.localId === activeLocal.id &&
          balance.operatingDate === operatingDate &&
          balance.status === "EN_PROCESO",
      );
      if (duplicate) {
        setMessage("Ya existe una caja abierta para ese local y fecha.");
        return current;
      }

      const balance: Balance = {
        id: uid("balance"),
        visibleId: nextBalanceVisibleId(current, activeLocal.id),
        localId: activeLocal.id,
        operatingDate,
        status: "EN_PROCESO",
        initialFund,
        initialBankFund,
        initialNote,
        openedBy: user?.id ?? "system",
        openedByRole: effectiveRole ?? user?.role,
        openedAt: nowIso(),
      };
      const openingCapitalMovements: CapitalMovement[] = firstOpening
        ? [
            initialFund > 0
              ? {
                  id: uid("capital-opening-cash"),
                  balanceId: balance.id,
                  localId: activeLocal.id,
                  type: "APORTE" as CapitalMovementType,
                  medium: "EFECTIVO" as CapitalMovementMedium,
                  timing: "APERTURA" as CapitalMovementTiming,
                  person: openingCapitalPerson,
                  amount: initialFund,
                  note: `Aporte inicial caja ${balance.visibleId}`,
                  status: "ACTIVO" as MovementStatus,
                  userId: user?.id ?? "system",
                  createdAt: nowIso(),
                }
              : null,
            initialBankFund > 0
              ? {
                  id: uid("capital-opening-bank"),
                  balanceId: balance.id,
                  localId: activeLocal.id,
                  type: "APORTE" as CapitalMovementType,
                  medium: "TRANSFERENCIA" as CapitalMovementMedium,
                  timing: "APERTURA" as CapitalMovementTiming,
                  person: openingCapitalPerson,
                  amount: initialBankFund,
                  note: `Aporte inicial banco caja ${balance.visibleId}`,
                  status: "ACTIVO" as MovementStatus,
                  userId: user?.id ?? "system",
                  createdAt: nowIso(),
                }
              : null,
          ].filter((movement): movement is CapitalMovement => Boolean(movement))
        : [];
      const accountMovements = openingCapitalMovements.reduce(
        (movements, movement) => upsertAccountMovement(movements, capitalAccountMovement(movement)),
        current.accountMovements,
      );
      const readings: Reading[] = current.machines
        .filter((machine) => machine.localId === activeLocal.id && machine.status !== "INACTIVA" && machine.status !== "DESUSO")
        .map((machine) => ({
          id: uid("reading"),
          balanceId: balance.id,
          machineId: machine.id,
          inPrevious: machine.lastIn,
          inActual: machine.lastIn,
          outPrevious: machine.lastOut,
          outActual: machine.lastOut,
          result: 0,
          status: machine.status === "ACTIVA" ? "PENDIENTE" : "FUERA_DE_SERVICIO",
          observation: machine.status === "ACTIVA" ? "" : "Maquina en mantenimiento",
          updatedBy: user?.id ?? "system",
          updatedAt: nowIso(),
        }));
      setMessage("Caja abierta correctamente.");
      setScreen("panel");
      return audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, activeLocal.id),
          accountMovements,
          capitalMovements: [...openingCapitalMovements, ...current.capitalMovements],
          balances: [balance, ...current.balances],
          readings: [...readings, ...current.readings],
        },
        "Abrir caja",
        "BalanceDiario",
        balance.id,
        "",
        { balance, openingCapitalMovements },
      );
    });
  };

  if (screen === "welcome") {
    return <Welcome onEnter={() => setScreen("login")} />;
  }

  if (screen === "login" || !user) {
    return <Login users={data.users} onBack={() => setScreen("welcome")} onLogin={login} message={message} />;
  }

  if (effectiveRole === "CAJERO") {
    const cashierScreen = screen;
    return (
      <CashierWorkspace
        data={data}
        user={user}
        local={activeLocal}
        openBalance={openBalance}
        screen={cashierScreen}
        setScreen={goToScreen}
        message={message}
        onLogout={() => {
          setUser(null);
          setActingRole(null);
          setMessage("");
          setScreen("login");
        }}
        onSwitchToManager={
          user.role === "ENCARGADO" || user.role === "ADMINISTRADOR"
            ? () => {
                setActingRole(user.role);
                setMessage(`Modo ${roleLabels[user.role].toLowerCase()} activo.`);
                setScreen("panel");
              }
            : undefined
        }
        returnRoleLabel={user.role === "ADMINISTRADOR" ? "administrador" : "encargado"}
      >
        {(cashierScreen === "open-cash" || cashierScreen === "cashier-summary") && (
          <OpenCash
            data={data}
            user={user}
            local={activeLocal}
            openBalance={openBalance}
            setScreen={goToScreen}
            save={openCash}
            summaryOnly={cashierScreen === "cashier-summary" || Boolean(openBalance)}
          />
        )}
        {cashierScreen === "counters" && openBalance && (
          <Counters
            data={data}
            user={user}
            balance={openBalance}
            onBack={() => goToScreen("panel")}
            updateReading={(readingId, patch) => {
              patchData((current) => {
                const previous = current.readings.find((reading) => reading.id === readingId);
                if (!previous) return current;
                if (patch.inActual !== undefined && patch.inActual !== null && patch.inActual < previous.inPrevious) {
                  setMessage("El IN actual debe ser igual o mayor al IN anterior.");
                  return current;
                }
                if (patch.outActual !== undefined && patch.outActual !== null && patch.outActual < previous.outPrevious) {
                  setMessage("El OUT actual debe ser igual o mayor al OUT anterior.");
                  return current;
                }
                const readings = current.readings.map((reading) => {
                  if (reading.id !== readingId) return reading;
                  const next = { ...reading, ...patch, updatedBy: user.id, updatedAt: nowIso() };
                  return { ...next, result: calcReading(next) };
                });
                const next = readings.find((reading) => reading.id === readingId);
                const synced = syncMachineResultAccountMovement({ ...current, readings }, openBalance.id, user.id);
                return audit(synced, "Guardar contador", "Recaudacion", readingId, previous, next);
              });
            }}
          />
        )}
        {cashierScreen === "expenses" && openBalance && (
          <Expenses data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "transfers" && openBalance && (
          <Transfers data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "gifts" && openBalance && (
          <Gifts data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "salary-payments" && openBalance && (
          <CashierSalaryPayments data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "capital-movements" && openBalance && (
          <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "cashier-clients" && (
          <CashierClients data={data} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => goToScreen("panel")} />
        )}
        {cashierScreen === "close-cash" && openBalance && (
          <CloseCash
            data={data}
            balance={openBalance}
            user={user}
            actorRole={effectiveRole ?? user.role}
            patchData={patchData}
            audit={audit}
            setMessage={setMessage}
            setScreen={setScreen}
            afterCloseScreen="cashier-summary"
          />
        )}
      </CashierWorkspace>
    );
  }

  return (
    <Shell
      user={user}
      currentRole={effectiveRole ?? user.role}
      local={activeLocal}
      screen={screen}
      setScreen={setScreen}
      onSwitchToCashier={
        user.role === "ENCARGADO" || user.role === "ADMINISTRADOR"
          ? () => {
              setActingRole("CAJERO");
              setMessage(`Modo cajero activo. Estas operando con el usuario real de ${user.name}.`);
              setScreen("panel");
            }
          : undefined
      }
      onLogout={() => {
        setUser(null);
        setActingRole(null);
        setScreen("login");
      }}
    >
      {message && <div className="notice">{message}</div>}
      {screen === "panel" && (
        <Panel
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          effectiveRole={effectiveRole ?? user.role}
          modeStatus="Prueba local"
          setScreen={setScreen}
          resetDemo={resetDemo}
        />
      )}
      {screen === "open-cash" && (
        <OpenCash
          data={data}
          user={user}
          local={activeLocal}
          openBalance={openBalance}
          setScreen={setScreen}
          save={openCash}
        />
      )}
      {screen === "counters" && openBalance && (
        <Counters
          data={data}
          user={user}
          balance={openBalance}
          updateReading={(readingId, patch) => {
            patchData((current) => {
              const previous = current.readings.find((reading) => reading.id === readingId);
              if (!previous) return current;
              if (patch.inActual !== undefined && patch.inActual !== null && patch.inActual < previous.inPrevious) {
                setMessage("El IN actual debe ser igual o mayor al IN anterior.");
                return current;
              }
              if (patch.outActual !== undefined && patch.outActual !== null && patch.outActual < previous.outPrevious) {
                setMessage("El OUT actual debe ser igual o mayor al OUT anterior.");
                return current;
              }
              const readings = current.readings.map((reading) => {
                if (reading.id !== readingId) return reading;
                const next = { ...reading, ...patch, updatedBy: user.id, updatedAt: nowIso() };
                return { ...next, result: calcReading(next) };
              });
              const next = readings.find((reading) => reading.id === readingId);
              const synced = syncMachineResultAccountMovement({ ...current, readings }, openBalance.id, user.id);
                return audit(synced, "Guardar contador", "Recaudacion", readingId, previous, next);
            });
          }}
        />
      )}
      {screen === "expenses" && openBalance && (
        <Expenses data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "transfers" && openBalance && (
        <Transfers data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "gifts" && openBalance && (
        <Gifts data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "capital-movements" && openBalance && (
        <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />
      )}
      {screen === "close-cash" && openBalance && (
        <CloseCash
          data={data}
          balance={openBalance}
          user={user}
          actorRole={effectiveRole ?? user.role}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          setScreen={setScreen}
        />
      )}
      {screen === "reports" && <Reports data={data} user={user} />}
      {screen === "manager-expenses" && <ManagerExpenses data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {screen === "admin-users" && <AdminUsers data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-staff" && <AdminStaff data={data} user={user} patchData={patchData} audit={audit} />}
      {screen === "admin-salary-settlements" && <AdminSalarySettlements data={data} user={user} patchData={patchData} audit={audit} />}
      {screen === "admin-current-accounts" && <AdminCurrentAccounts data={data} user={user} effectiveRole={effectiveRole ?? user.role} local={activeLocal} />}
      {screen === "admin-clients" && <AdminClients data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-trash" && <AdminTrash data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-expense-categories" && <AdminExpenseCategories data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-machines" && (
        <AdminMachines
          data={data}
          user={user}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
        />
      )}
      {screen === "workshop" && (
        <AdminMachines
          data={data}
          user={user}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onlyWorkshop
        />
      )}
      {screen === "admin-locals" && (
        <AdminLocals
          data={data}
          user={user}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
        />
      )}
      {screen === "differences" && <Differences data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {screen === "audit" && <Audit data={data} />}
      {screen === "periodic" && <Periodic data={data} user={user} patchData={patchData} audit={audit} setMessage={setMessage} />}
      {!openBalance && ["counters", "expenses", "transfers", "gifts", "capital-movements", "close-cash"].includes(screen) && (
        <EmptyState title="No hay caja abierta" text="Abri una nueva caja o trabaja sobre una caja en proceso." action={() => setScreen("open-cash")} />
      )}
    </Shell>
  );
}

function Welcome({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="start-screen">
      <div className="shape shape-a" />
      <div className="shape shape-b" />
      <section className="start-content">
        <h1>POSEIDON</h1>
        <h2>Sistema de Gestion</h2>
        <p>Gestion de caja, maquinas y recaudaciones</p>
        <button className="button primary wide" type="button" onClick={onEnter}>
          Ingresar
        </button>
      </section>
      <span className="version">v1.0 - Documento funcional definitivo</span>
    </main>
  );
}

function Login({ users, onBack, onLogin, message }: { users: User[]; onBack: () => void; onLogin: (userId: string) => void; message: string }) {
  const activeUsers = users.filter((item) => item.status === "ACTIVO");
  const defaultUserId = activeUsers.find((item) => item.username === "cajero1")?.id ?? activeUsers[0]?.id ?? "";
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId);

  useEffect(() => {
    const activeIds = activeUsers.map((item) => item.id);
    if (!activeIds.includes(selectedUserId)) {
      setSelectedUserId(defaultUserId);
    }
  }, [activeUsers, defaultUserId, selectedUserId]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(selectedUserId);
  };

  return (
    <main className="login-screen">
      <header className="login-top">POSEIDON</header>
      <section className="login-card">
        <h1>Ingreso al sistema</h1>
        <form onSubmit={submit} className="form-stack">
          <label>
            Entrar como
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} autoFocus>
              {activeUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {roleLabels[item.role]} ({item.username})
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button className="button primary" type="submit" disabled={!activeUsers.length}>
              Ingresar
            </button>
            <button className="button muted" type="button" onClick={onBack}>
              Volver
            </button>
          </div>
        </form>
        <p className={message ? "validation error" : "validation"}>
          {message || "Modo local de prueba: selecciona un usuario activo, sin contrasena."}
        </p>
      </section>
    </main>
  );
}

function Shell({
  user,
  currentRole,
  local,
  screen,
  setScreen,
  onSwitchToCashier,
  onLogout,
  children,
}: {
  user: User;
  currentRole: Role;
  local: Local;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  onSwitchToCashier?: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const groups = menuGroupsForRole(currentRole);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isActive = (item: MenuItem) =>
    screen === item.screen ||
    (screen === "admin-local-edit" && item.screen === "admin-locals") ||
    (screen === "admin-machine-edit" && item.screen === "admin-machines");
  const groupHasActiveItem = (group: MenuGroup) => group.items.some(isActive);

  useEffect(() => {
    const activeGroup = groups.find(groupHasActiveItem);
    if (!activeGroup) return;
    setOpenGroups((current) => (current[activeGroup.title] ? current : { ...current, [activeGroup.title]: true }));
  }, [screen, currentRole]);

  return (
    <div className="app-shell">
      <aside className="side">
        <div className="side-brand">
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <nav className="side-nav">
          {groups.map((group) => (
            <details
              className="side-group"
              key={group.title}
              open={openGroups[group.title] ?? (groupHasActiveItem(group) || group.title === "Inicio")}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenGroups((current) => ({ ...current, [group.title]: isOpen }));
              }}
            >
              <summary className="side-group-title">{group.title}</summary>
              <div>
                {group.items.map((item) => (
                  <button key={`${group.title}-${item.screen}`} className={isActive(item) ? "side-link active" : "side-link"} onClick={() => setScreen(item.screen)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </nav>
        <button className="side-link logout" onClick={onLogout}>
          Salir
        </button>
      </aside>
      <section className="main">
        <header className="top">
          <h1>{titleForScreen(screen, currentRole)}</h1>
          <div className="top-meta">
            <div className="top-meta-items">
              <span>
                <small>Local</small>
                <strong>{local.name}</strong>
              </span>
              <span>
                <small>Usuario</small>
                <strong>{user.name}</strong>
              </span>
              <span>
                <small>Funcion</small>
                <strong>{roleLabels[currentRole]}</strong>
              </span>
            </div>
            {onSwitchToCashier && currentRole !== "CAJERO" && (
              <div className="top-meta-actions">
                <button className="button primary compact" type="button" onClick={onSwitchToCashier}>
                  Trabajar como cajero
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}

function CashierWorkspace({
  data,
  user,
  local,
  openBalance,
  screen,
  setScreen,
  message,
  onLogout,
  onSwitchToManager,
  returnRoleLabel = "encargado",
  children,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  message: string;
  onLogout: () => void;
  onSwitchToManager?: () => void;
  returnRoleLabel?: string;
  children: ReactNode;
}) {
  const totals = openBalance ? totalsForBalance(data, openBalance.id) : null;
  const pendingReadings = openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id && reading.status === "PENDIENTE").length : 0;
  const balanceReadings = openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id) : [];
  const cashierMachines = balanceReadings.length;
  const completedReadings = balanceReadings.filter((reading) => reading.status === "CARGADA").length;
  const localBalances = localAccountBalances(data, local.id);
  const machineResultTone = (totals?.resultMachines ?? 0) >= 0 ? "positive" : "negative";
  const totalOutflows = (totals?.totalExpenses ?? 0) + (totals?.totalSalaries ?? 0) + (totals?.giftCash ?? 0);
  const windowScreens: Screen[] = ["close-cash"];
  const inlineScreens: Screen[] = ["open-cash", "cashier-summary", "counters", "expenses", "transfers", "gifts", "salary-payments", "capital-movements", "cashier-clients"];
  const noBalanceScreens: Screen[] = ["open-cash", "cashier-summary", "cashier-clients"];
  const showWindow = openBalance && windowScreens.includes(screen);
  const showInline = openBalance ? inlineScreens.includes(screen) : noBalanceScreens.includes(screen);

  return (
    <div className="cashier-shell">
      <header className="cashier-top">
        <div>
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <div className="cashier-user">
          <span>Local: {local.name}</span>
          <span>Usuario: {user.name}</span>
        </div>
        <button className="button muted compact" onClick={onLogout}>
          Salir
        </button>
        {onSwitchToManager && (
          <button className="button primary compact" type="button" onClick={onSwitchToManager}>
            Modo {returnRoleLabel}
          </button>
        )}
      </header>
      <main className="cashier-content">
        {message && <div className="notice cashier-notice">{message}</div>}
        <section className="cashier-panel">
          <div className="cashier-heading">
            <div>
              <h1>Panel del cajero</h1>
              <p>
                {openBalance
                  ? `Fecha: ${openBalance.operatingDate} - Caja: ${balanceVisibleId(data, openBalance)} ABIERTA`
                  : "No hay caja abierta. Para continuar tenes que abrir una caja diaria."}
              </p>
            </div>
            {openBalance && (
              <div className="cashier-heading-balances">
                <span>
                  <small>Efectivo inicial</small>
                  <strong>{money(openBalance.initialFund)}</strong>
                </span>
                <span>
                  <small>Banco inicial</small>
                  <strong>{money(openBalance.initialBankFund)}</strong>
                </span>
              </div>
            )}
          </div>
          {openBalance && !showInline && (
            <div className="cashier-summary-grid">
              <button className={`cashier-metric ${machineResultTone}`} type="button" onClick={() => setScreen("counters")}>
                <span>Resultado de maquinas</span>
                <strong>{money(totals?.resultMachines)}</strong>
                <small>
                  {completedReadings}/{cashierMachines} recaudadas - {pendingReadings} pendientes
                </small>
              </button>
              <div className="cashier-metric passive neutral">
                <span>Salida total</span>
                <strong>{money(totalOutflows)}</strong>
                <small>Gastos + salarios + regalos</small>
              </div>
              <div className="cashier-metric passive neutral">
                <span>Efectivo en caja</span>
                <strong>{money(totals?.expectedCash)}</strong>
                <small>Esperado antes del cierre</small>
              </div>
              <div className="cashier-metric passive neutral">
                <span>Dinero en banco</span>
                <strong>{money(localBalances.bank)}</strong>
                <small>Saldo cuenta banco del local</small>
              </div>
              <button className="cashier-metric bank" type="button" onClick={() => setScreen("transfers")}>
                <span>Transferencias</span>
                <strong>{money(totals?.totalTransfers)}</strong>
                <small>Movimientos registrados en banco</small>
              </button>
              <button className="cashier-metric cash" type="button" onClick={() => setScreen("capital-movements")}>
                <span>Aportes efectivo</span>
                <strong>{money(totals?.capitalContributionsCash)}</strong>
                <small>Capital ingresado en caja</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("capital-movements")}>
                <span>Retiros</span>
                <strong>{money(totals?.totalWithdrawals)}</strong>
                <small>Efectivo y banco</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("expenses")}>
                <span>Gastos</span>
                <strong>{money(totals?.totalExpenses)}</strong>
                <small>Salidas operativas</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("salary-payments")}>
                <span>Salarios</span>
                <strong>{money(totals?.totalSalaries)}</strong>
                <small>Pagos al personal</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("gifts")}>
                <span>Regalos</span>
                <strong>{money(totals?.giftCash)}</strong>
                <small>Regalos en efectivo</small>
              </button>
            </div>
          )}
          {showInline ? (
            <section className="cashier-inline-view">{children}</section>
          ) : openBalance ? (
            <div className="cashier-secondary-actions">
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                Clientes
              </button>
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
                Resumen cajas
              </button>
              <button className="button muted compact" type="button" disabled>
                Abrir caja
              </button>
              <button className="button soft-blue compact" type="button" onClick={() => setScreen("close-cash")}>
                Cerrar caja
              </button>
            </div>
          ) : (
            <section className="cashier-required">
              <div className="cashier-required-alert">Necesita abrir una nueva caja para poder operar.</div>
              <div className="cashier-secondary-actions cashier-secondary-actions-open">
                <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                  Clientes
                </button>
                <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
                  Resumen cajas
                </button>
                <button className="button success compact" type="button" onClick={() => setScreen("open-cash")}>
                  Abrir caja
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
      {showWindow && (
        <Modal title={titleForScreen(screen, user.role)} onClose={() => setScreen("panel")} closeLabel="Volver al panel" wide>
          {children}
        </Modal>
      )}
    </div>
  );
}

function menuGroupsForRole(role: Role): MenuGroup[] {
  if (role === "ADMINISTRADOR") {
    return [
      {
        title: "Inicio",
        items: [{ label: "Panel general", screen: "panel" }],
      },
      {
        title: "Control y auditoria",
        items: [
          { label: "Diferencias", screen: "differences" },
          { label: "Gastos", screen: "manager-expenses" },
          { label: "Auditoria", screen: "audit" },
          { label: "Cuentas corrientes", screen: "admin-current-accounts" },
        ],
      },
      {
        title: "Cierres y reportes",
        items: [
          { label: "Reportes", screen: "reports" },
          { label: "Cierre periodico", screen: "periodic" },
        ],
      },
      {
        title: "Gestion",
        items: [
          { label: "Locales", screen: "admin-locals" },
          { label: "Maquinas", screen: "admin-machines" },
          { label: "Taller", screen: "workshop" },
          { label: "Categorias gastos", screen: "admin-expense-categories" },
        ],
      },
      {
        title: "Personas",
        items: [
          { label: "Clientes", screen: "admin-clients" },
          { label: "Personal", screen: "admin-staff" },
          { label: "Liquidacion salarios", screen: "admin-salary-settlements" },
          { label: "Usuarios", screen: "admin-users" },
        ],
      },
      {
        title: "Sistema",
        items: [
          { label: "Papelera", screen: "admin-trash" },
        ],
      },
    ];
  }

  if (role === "ENCARGADO") {
    return [
      {
        title: "Inicio",
        items: [{ label: "Panel encargado", screen: "panel" }],
      },
      {
        title: "Control y auditoria",
        items: [
          { label: "Diferencias", screen: "differences" },
          { label: "Gastos", screen: "manager-expenses" },
          { label: "Auditoria", screen: "audit" },
          { label: "Cuentas corrientes", screen: "admin-current-accounts" },
        ],
      },
      {
        title: "Cierres y reportes",
        items: [
          { label: "Caja diaria", screen: "open-cash" },
          { label: "Cierre periodico", screen: "periodic" },
          { label: "Reportes", screen: "reports" },
        ],
      },
      {
        title: "Personas",
        items: [
          { label: "Personal", screen: "admin-staff" },
          { label: "Liquidacion salarios", screen: "admin-salary-settlements" },
          { label: "Clientes", screen: "admin-clients" },
        ],
      },
    ];
  }

  return [
    {
      title: "Caja diaria",
      items: [
        { label: "Panel cajero", screen: "panel" },
        { label: "Caja diaria", screen: "open-cash" },
        { label: "Contadores", screen: "counters" },
        { label: "Gastos", screen: "expenses" },
        { label: "Transferencias", screen: "transfers" },
        { label: "Regalos", screen: "gifts" },
        { label: "Retiros / aportes", screen: "capital-movements" },
        { label: "Cerrar caja", screen: "close-cash" },
      ],
    },
  ];
}

function titleForScreen(screen: Screen, role: Role) {
  const titles: Record<Screen, string> = {
    welcome: "Poseidon",
    login: "Ingreso al sistema",
    panel: role === "ADMINISTRADOR" ? "Reportes y administracion" : role === "ENCARGADO" ? "Panel del encargado" : "Panel del cajero",
    "open-cash": "Caja diaria",
    counters: "Cargar contadores",
    expenses: "Cargar gastos",
    transfers: "Cargar transferencias",
    gifts: "Cargar regalos",
    "salary-payments": "Pago de salarios",
    "capital-movements": "Retiros y aportes",
    "cashier-clients": "Clientes",
    "cashier-summary": "Resumen de cajas",
    "close-cash": "Cerrar caja diaria",
    reports: role === "ADMINISTRADOR" ? "Reportes y administracion" : "Reportes",
    "manager-expenses": "Control de gastos",
    "admin-users": "Usuarios",
    "admin-staff": "Personal",
    "admin-salary-settlements": "Liquidacion de salarios",
    "admin-current-accounts": "Cuentas corrientes",
    "admin-clients": "Clientes",
    "admin-trash": "Papelera",
    "admin-expense-categories": "Categorias de gastos",
    "admin-machines": "Maquinas",
    workshop: "Taller",
    "admin-machine-edit": "Editar maquina",
    "admin-locals": "Locales",
    "admin-local-edit": "Editar local",
    differences: "Diferencias de caja",
    audit: "Auditoria",
    periodic: "Cierre periodico",
  };

  return titles[screen];
}

function Panel({
  data,
  user,
  local,
  openBalance,
  effectiveRole,
  modeStatus,
  setScreen,
  resetDemo,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  effectiveRole: Role;
  modeStatus: string;
  setScreen: (screen: Screen) => void;
  resetDemo: () => void;
}) {
  const activeBalance = openBalance ?? data.balances.find((balance) => balance.status === "CERRADO");
  const totals = activeBalance ? totalsForBalance(data, activeBalance.id) : null;
  const pendingDifferences = pendingDifferenceCount(data);
  const localClosedBalances = data.balances
    .filter((balance) => balance.localId === local.id && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)));
  const localDifferenceBalances = localClosedBalances.filter((balance) => balanceHasDifference(data, balance));
  const localPendingDifferences = localDifferenceBalances.filter(differenceIsPending).length;
  const localCashDifferenceTotal = localDifferenceBalances.reduce((total, balance) => total + cashDifferenceForBalance(data, balance), 0);
  const localBankDifferenceTotal = localDifferenceBalances.reduce((total, balance) => total + bankDifferenceForBalance(balance), 0);
  const localBalances = localAccountBalances(data, local.id);
  const currentDate = today();
  const currentMonthStart = `${currentDate.slice(0, 7)}-01`;
  const currentMonthName = new Date(`${currentMonthStart}T00:00:00`).toLocaleDateString("es-UY", { month: "long", year: "numeric" });
  const monthlyClosedBalances = localClosedBalances.filter((balance) => {
    const balanceDate = balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
    return balanceDate >= currentMonthStart && balanceDate <= currentDate;
  });
  const monthlyEconomicTotals = monthlyClosedBalances.reduce(
    (acc, balance) => {
      const balanceTotals = totalsForBalance(data, balance.id);
      const gifts = balanceTotals.giftCash + balanceTotals.giftCredit;
      return {
        income: acc.income + Math.max(balanceTotals.resultMachines, 0),
        outcome: acc.outcome + Math.max(-balanceTotals.resultMachines, 0) + balanceTotals.totalExpenses + balanceTotals.totalSalaries + gifts,
      };
    },
    { income: 0, outcome: 0 },
  );
  const monthlyNetResult = monthlyEconomicTotals.income - monthlyEconomicTotals.outcome;

  if (effectiveRole === "ADMINISTRADOR") {
    return (
      <>
        <h2>Reportes iniciales</h2>
        <div className="card-grid three">
          <InfoCard tone="blue" title="Cierre diario" lines={["Exportacion Excel", "Caja, maquinas y movimientos"]} />
          <InfoCard tone="green" title="Maquinas" lines={["Resultado por maquina", "Historial de lecturas"]} />
          <InfoCard
            tone="red"
            title="Diferencias"
            lines={[`${pendingDifferences} pendiente(s)`, "Revision obligatoria con observacion"]}
            action={{ label: "Gestionar", onClick: () => setScreen("differences") }}
          />
        </div>
        <h2>Panel administrativo</h2>
        <div className="card-grid three">
          <ActionCard title="Usuarios" text="Cajero, encargado, admin" onClick={() => setScreen("admin-users")} />
          <ActionCard title="Personal" text="Salarios, horarios y bajas" onClick={() => setScreen("admin-staff")} />
          <ActionCard title="Liquidacion salarios" text="Base, pagos, adelantos y total" onClick={() => setScreen("admin-salary-settlements")} />
          <ActionCard title="Clientes" text="Listado para regalos y transferencias" onClick={() => setScreen("admin-clients")} />
          <ActionCard title="Maquinas" text="ID unico, activa, mantenimiento" onClick={() => setScreen("admin-machines")} />
          <ActionCard title="Categorias gastos" text="Categorias y subcategorias" onClick={() => setScreen("admin-expense-categories")} />
          <ActionCard title="Papelera" text="Restaurar o eliminar definitivo" onClick={() => setScreen("admin-trash")} />
          <ActionCard title="Auditoria" text="Cambios sensibles e historial" onClick={() => setScreen("audit")} />
        </div>
        <div className="button-row end">
          <button className="button muted" onClick={resetDemo}>
            Reiniciar demo
          </button>
        </div>
      </>
    );
  }

  if (effectiveRole === "ENCARGADO") {
    return (
      <section className="manager-dashboard manager-dashboard-minimal detail-card-surface">
        <div className="card-grid three manager-kpis manager-minimal-grid">
          <InfoCard
            tone={localPendingDifferences > 0 ? "red" : "green"}
            title="Diferencias"
            variant="cash"
            lines={[
              `*Pendientes: ${localPendingDifferences}`,
              `Total con diferencia: ${localDifferenceBalances.length}`,
              `Efectivo: ${money(localCashDifferenceTotal)}`,
              `Banco: ${money(localBankDifferenceTotal)}`,
            ]}
            action={{ label: "Ver diferencias", onClick: () => setScreen("differences") }}
          />
          <InfoCard
            tone={localBalances.cash < 0 ? "red" : "green"}
            title="Cuenta efectivo"
            variant="cash"
            lines={[`*Saldo actual: ${money(localBalances.cash)}`, "Cuenta corriente de efectivo"]}
            action={{ label: "Ver cuentas", onClick: () => setScreen("admin-current-accounts") }}
          />
          <InfoCard
            tone={localBalances.bank < 0 ? "red" : "blue"}
            title="Cuenta banco"
            variant="cash"
            lines={[`*Saldo actual: ${money(localBalances.bank)}`, "Cuenta corriente de banco"]}
            action={{ label: "Ver cuentas", onClick: () => setScreen("admin-current-accounts") }}
          />
        </div>

        <div className="card-grid three manager-kpis manager-minimal-grid">
          <InfoCard
            tone="green"
            title={`Ingreso total - ${currentMonthName}`}
            variant="cash"
            lines={[`*Total: ${money(monthlyEconomicTotals.income)}`, `Hasta hoy: ${currentDate}`, `Cajas cerradas: ${monthlyClosedBalances.length}`]}
          />
          <InfoCard
            tone="red"
            title={`Salida total - ${currentMonthName}`}
            variant="cash"
            lines={[
              `*Total: ${money(monthlyEconomicTotals.outcome)}`,
              "Incluye gastos, salarios, regalos",
              "y resultado negativo de maquinas",
            ]}
          />
          <InfoCard
            tone={monthlyNetResult < 0 ? "red" : "green"}
            title={`Resultado neto - ${currentMonthName}`}
            variant="cash"
            lines={[
              `*Total: ${money(monthlyNetResult)}`,
              `Ingresos: ${money(monthlyEconomicTotals.income)}`,
              `Salidas: ${money(monthlyEconomicTotals.outcome)}`,
              "Resultado economico mensual",
            ]}
          />
        </div>

        <div className="manager-shortcuts" aria-label="Accesos de revision del encargado">
          <button className="button primary compact" type="button" onClick={() => setScreen("differences")}>
            Ver diferencias
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("admin-current-accounts")}>
            Cuentas corrientes
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("manager-expenses")}>
            Control de gastos
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("admin-salary-settlements")}>
            Salarios
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("cashier-summary")}>
            Resumen de cajas
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <h2>Estado de caja</h2>
      <div className="card-grid three">
        <InfoCard
          tone="green"
          title="Caja del dia"
          lines={[
            `Fecha operativa: ${openBalance?.operatingDate ?? "libre"}`,
            `Estado: ${openBalance?.status ?? "SIN CAJA"}`,
            `Efectivo inicial: ${money(openBalance?.initialFund)}`,
            `Banco inicial: ${money(openBalance?.initialBankFund)}`,
          ]}
        />
        <InfoCard
          tone="blue"
          title="Maquinas"
          lines={[
            `Activas: ${data.machines.filter((machine) => machine.localId === local.id && machine.status === "ACTIVA").length}`,
            `Pendientes: ${openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id && reading.status === "PENDIENTE").length : 0}`,
            `Resultado: ${money(totals?.resultMachines)}`,
          ]}
        />
        <InfoCard
          tone="orange"
          title="Cierre"
          lines={[
            `Efectivo esperado: ${money(totals?.expectedCash)}`,
            `Diferencia: ${money(activeBalance?.cashDifference ?? totals?.difference)}`,
            `Pendientes revision: ${pendingDifferences}`,
            `Modo: ${modeStatus}`,
          ]}
        />
      </div>
      <div className="card-grid three action-area">
        <ActionCard title="Caja diaria" text="Abrir caja o revisar cierres" onClick={() => setScreen("open-cash")} />
        <ActionCard title="Cargar contadores" text="IN / OUT por maquina" onClick={() => setScreen("counters")} />
        <ActionCard title="Cargar gastos" text="Limpieza, repuestos, servicios" onClick={() => setScreen("expenses")} />
        <ActionCard title="Cargar transferencias" text="Comprobante, nombre y monto" onClick={() => setScreen("transfers")} />
        <ActionCard title="Cargar regalos" text="Efectivo o credito" onClick={() => setScreen("gifts")} />
        <ActionCard title="Cerrar caja" text="Declarar efectivo y cerrar" onClick={() => setScreen("close-cash")} />
      </div>
    </>
  );
}

function InfoCard({
  title,
  lines,
  tone,
  action,
  variant,
}: {
  title: string;
  lines: string[];
  tone: "blue" | "green" | "orange" | "red";
  action?: { label: string; onClick: () => void };
  variant?: "cash";
}) {
  const renderLine = (line: string) => {
    if (line === "-----") return <p key={line} className="info-separator" />;
    if (line.startsWith("# ")) return <p key={line} className="info-section-label">{line.replace("# ", "")}</p>;
    if (line.startsWith("*") && line.includes(":")) {
      const cleanLine = line.slice(1);
      const [label, ...rest] = cleanLine.split(":");
      return (
        <p key={line} className="info-row info-row-total">
          <span>{label}</span>
          <strong>{rest.join(":").trim()}</strong>
        </p>
      );
    }
    if (variant === "cash" && line.includes(":")) {
      const [label, ...rest] = line.split(":");
      return (
        <p key={line} className="info-row">
          <span>{label}</span>
          <strong>{rest.join(":").trim()}</strong>
        </p>
      );
    }
    return <p key={line}>{line}</p>;
  };

  return (
    <article className={`info-card ${tone}`}>
      <h3>{title}</h3>
      {lines.map(renderLine)}
      {action && (
        <button className="button primary compact info-card-action" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </article>
  );
}

function ActionCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <article className="action-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button primary small" onClick={onClick}>
        Abrir
      </button>
    </article>
  );
}

function OpenCash({
  data,
  user,
  local,
  openBalance,
  setScreen,
  save,
  summaryOnly = false,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  setScreen: (screen: Screen) => void;
  summaryOnly?: boolean;
  save: (
    date: string,
    initialFund: number,
    initialBankFund: number,
    note: string,
    openingCapitalPerson: CapitalMovementPerson,
    firstOpening: boolean,
  ) => void;
}) {
  const localBalances = localAccountBalances(data, local.id);
  const showSummaryOnly = summaryOnly || Boolean(openBalance);
  const firstOpening = !data.balances.some((balance) => balance.localId === local.id);
  const recentClosedBalances = data.balances
    .filter((balance) => balance.localId === local.id && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)))
    .slice(0, 10);
  const recentClosedIds = recentClosedBalances.map((balance) => balance.id).join("|");
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(recentClosedBalances[0]?.id ?? null);
  const selectedBalance = recentClosedBalances.find((balance) => balance.id === selectedBalanceId) ?? recentClosedBalances[0];
  useEffect(() => {
    const ids = recentClosedIds ? recentClosedIds.split("|") : [];
    if (!ids.length) {
      if (selectedBalanceId !== null) setSelectedBalanceId(null);
      return;
    }
    if (!selectedBalanceId || !ids.includes(selectedBalanceId)) {
      setSelectedBalanceId(ids[0]);
    }
  }, [recentClosedIds, selectedBalanceId]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const initialFund = firstOpening ? parseMoneyInput(form.get("initialFund")) : localBalances.cash;
    const initialBankFund = firstOpening ? parseMoneyInput(form.get("initialBankFund")) : localBalances.bank;
    save(
      String(form.get("operatingDate")),
      initialFund,
      initialBankFund,
      String(form.get("initialNote") ?? ""),
      String(form.get("openingCapitalPerson") ?? "MATHIAS") as CapitalMovementPerson,
      firstOpening,
    );
  };
  const recentCashesPanel = (
    <aside className="recent-cashes-panel recent-cashes-wide">
      <div>
        <h3>Ultimas cajas cerradas</h3>
        <p>Selecciona una caja para ver el resumen en pantalla.</p>
      </div>
      {recentClosedBalances.length ? (
        <div className="table-wrap">
          <table className="data-table recent-cash-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Resultado final</th>
                <th>Declarado</th>
                <th>Dif. efectivo</th>
                <th>Dif. banco</th>
                <th>Estado dif.</th>
                <th>Maquinas</th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {recentClosedBalances.map((balance) => {
                const totals = totalsForBalance(data, balance.id);
                const recalculatedDifference = cashDifferenceForBalance(data, balance);
                const bankDifference = bankDifferenceForBalance(balance);
                const hasDifference = recalculatedDifference !== 0 || bankDifference !== 0;
                const loaded = data.readings.filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA").length;
                const totalReadings = data.readings.filter((reading) => reading.balanceId === balance.id).length;
                const selected = balance.id === selectedBalance?.id;
                return (
                  <tr key={balance.id} className={selected ? "status-selected" : undefined}>
                    <td>{balanceVisibleId(data, balance)}</td>
                    <td>{balance.operatingDate}</td>
                    <td>
                      {formatTime(balance.openedAt)} - {formatTime(balance.closedAt)}
                    </td>
                    <td className={totals.commercialResult >= 0 ? "money-positive" : "money-negative"}>{money(totals.commercialResult)}</td>
                    <td>{money(balance.declaredCash)}</td>
                    <td className={recalculatedDifference === 0 ? "money-positive" : "money-negative"}>{money(recalculatedDifference)}</td>
                    <td className={bankDifference === 0 ? "money-positive" : "money-negative"}>{money(bankDifference)}</td>
                    <td>
                      <span className={`status-pill ${hasDifference && differenceIsPending(balance) ? "danger" : hasDifference ? "warning" : "ok"}`}>
                        {hasDifference ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIF."}
                      </span>
                    </td>
                    <td>
                      {loaded}/{totalReadings}
                    </td>
                    <td>
                      <button className="button primary tiny" type="button" onClick={() => setSelectedBalanceId(balance.id)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-recent-cash">Todavia no hay cajas cerradas para mostrar.</div>
      )}
    </aside>
  );

  return (
    <section className="admin-focus open-cash-page">
      <div className="admin-header">
        <div>
          <h2>{showSummaryOnly ? "Resumen de cajas" : "Caja diaria"}</h2>
          <p className="helper">{showSummaryOnly ? "Revision rapida de ultimas cajas cerradas del local activo." : "Apertura de caja y revision rapida de los ultimos cierres del local activo."}</p>
        </div>
        <div className="admin-header-actions">
          <span>Local: {local.name}</span>
          {showSummaryOnly && (
            <button className="button muted compact" type="button" onClick={() => setScreen("panel")}>
              Volver al panel
            </button>
          )}
        </div>
      </div>

      {showSummaryOnly ? (
        <>
          {recentCashesPanel}
          {selectedBalance ? (
            <ClosedBalanceSummary data={data} balance={selectedBalance} />
          ) : (
            <EmptyState title="Sin cajas cerradas" text="Todavia no hay cajas cerradas para mostrar." />
          )}
        </>
      ) : (
        <>
          <section className="form-card compact-open-cash open-cash-card open-cash-main-card">
            <div className="open-cash-title">
              <div>
                <h2>Nueva caja diaria</h2>
                <p>La apertura toma una foto de las maquinas activas del local.</p>
              </div>
              <span>{firstOpening ? "Primer aporte de capital" : `Saldo heredado ${money(localBalances.cash)}`}</span>
            </div>
            <form onSubmit={submit} className="open-cash-form">
              <label>
                Local
                <input value={local.name} disabled />
              </label>
              <label>
                Fecha operativa
                <input name="operatingDate" type="date" defaultValue={today()} required />
              </label>
              <label>
                {firstOpening ? "Aporte inicial efectivo" : "Saldo inicial efectivo"}
                {firstOpening ? (
                  <input name="initialFund" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
                ) : (
                  <input name="initialFund" value={moneyInputValue(localBalances.cash)} disabled readOnly />
                )}
              </label>
              <label>
                {firstOpening ? "Aporte inicial banco" : "Saldo inicial banco"}
                {firstOpening ? (
                  <input name="initialBankFund" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
                ) : (
                  <input name="initialBankFund" value={moneyInputValue(localBalances.bank)} disabled readOnly />
                )}
              </label>
              {firstOpening && (
                <label>
                  Responsable aporte inicial
                  <select name="openingCapitalPerson" defaultValue="MATHIAS">
                    {CAPITAL_PEOPLE.map((person) => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!firstOpening && (
                <div className="open-cash-rule">
                  <strong>Saldos heredados</strong>
                  <span>
                    Efectivo {money(localBalances.cash)} / Banco {money(localBalances.bank)}. Estos saldos vienen de la cuenta corriente del local.
                  </span>
                </div>
              )}
              <label className={firstOpening ? undefined : "span-2"}>
                Observacion inicial
                <input name="initialNote" placeholder="Opcional" />
              </label>
              <div className="open-cash-rule">
                <strong>Regla clave</strong>
                <span>{firstOpening ? "El primer aporte abre las cuentas del local." : "La caja abre con el saldo que quedo del cierre anterior."} Apertura: {user.name}</span>
              </div>
              <div className="form-actions open-cash-actions">
                <button className="button success compact" type="submit">
                  Abrir caja
                </button>
              </div>
            </form>
          </section>
          {recentCashesPanel}
          {selectedBalance && <ClosedBalanceSummary data={data} balance={selectedBalance} />}
        </>
      )}
    </section>
  );
}

function ClosedBalanceSummary({ data, balance }: { data: AppData; balance: Balance }) {
  const totals = totalsForBalance(data, balance.id);
  const recalculatedDifference = cashDifferenceForBalance(data, balance);
  const declaredBank = balance.declaredBank ?? balance.nextBankBase ?? 0;
  const recalculatedBankDifference = bankDifferenceForBalance(balance);
  const expectedBank = declaredBank - recalculatedBankDifference;
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const expenses = data.expenses.filter((expense) => expense.balanceId === balance.id && expense.status === "ACTIVO");
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balance.id && transfer.status === "ACTIVO");
  const gifts = data.gifts.filter((gift) => gift.balanceId === balance.id && gift.status === "ACTIVO");
  const salaryPayments = data.salarySettlements.filter((settlement) => settlement.balanceId === balance.id && settlement.status !== "ANULADA");
  const capitalMovements = data.capitalMovements.filter((movement) => movement.balanceId === balance.id && movement.status === "ACTIVO");
  const operatingCapitalMovements = capitalMovements.filter((movement) => movement.timing !== "APERTURA");
  const cashWithdrawals = operatingCapitalMovements.filter((movement) => movement.type === "RETIRO" && movement.medium === "EFECTIVO");
  const bankWithdrawals = operatingCapitalMovements.filter((movement) => movement.type === "RETIRO" && movement.medium === "TRANSFERENCIA");
  const cashContributions = operatingCapitalMovements.filter((movement) => movement.type === "APORTE" && movement.medium === "EFECTIVO");
  const bankContributions = operatingCapitalMovements.filter((movement) => movement.type === "APORTE" && movement.medium === "TRANSFERENCIA");
  const loadedReadings = readings.filter((reading) => reading.status === "CARGADA").length;
  const local = localName(data, balance.localId);
  const totalCashOutflows = totals.totalExpenses + totals.totalSalaries + totals.giftCash;
  const hasDifference = recalculatedDifference !== 0 || recalculatedBankDifference !== 0;
  const differenceTone = !hasDifference ? "green" : differenceIsPending(balance) ? "red" : "orange";
  const resultTone = totals.commercialResult >= 0 ? "green" : "red";
  const differenceStatus = hasDifference ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIFERENCIA";
  const financialRows = [
    { concept: "Transferencias", count: String(transfers.length), amount: money(totals.totalTransfers), detail: "Entran a banco / descuentan efectivo" },
    { concept: "Aportes efectivo", count: String(cashContributions.length), amount: money(totals.capitalContributionsCash), detail: "Suman al efectivo de caja" },
    { concept: "Aportes transferencia", count: String(bankContributions.length), amount: money(totals.capitalContributionsBank), detail: "Suman a banco" },
    { concept: "Retiros efectivo", count: String(cashWithdrawals.length), amount: money(totals.withdrawalsCash), detail: "Salen del efectivo de caja" },
    { concept: "Retiros transferencia", count: String(bankWithdrawals.length), amount: money(totals.withdrawalsBank), detail: "Salen de banco" },
  ];
  const outflowRows = [
    { concept: "Gastos", count: String(expenses.length), amount: money(totals.totalExpenses) },
    { concept: "Salarios", count: String(salaryPayments.length), amount: money(totals.totalSalaries) },
    { concept: "Regalos", count: String(gifts.length), amount: money(totals.giftCash) },
    { concept: "Salida total", count: "-", amount: money(totalCashOutflows) },
  ];

  return (
    <section className="closed-summary-panel">
      <div className="section-toolbar close-cash-toolbar">
        <div>
          <h2>Resumen de caja cerrada</h2>
          <p>
            {balanceVisibleId(data, balance)} - {local} - {balance.operatingDate} - apertura {formatTime(balance.openedAt)} - cierre {formatTime(balance.closedAt)}
          </p>
          <p>
            Abierta por {userDisplayNameWithRole(data, balance.openedBy, balance.openedByRole)} - Cerrada por{" "}
            {userDisplayNameWithRole(data, balance.closedBy, balance.closedByRole)}
          </p>
        </div>
        <span className="close-status-pill">
          {loadedReadings}/{readings.length} maquinas recaudadas
        </span>
      </div>

      <div className="close-kpi-grid">
        <article className={`close-kpi ${resultTone}`}>
          <span>Resultado final</span>
          <strong>{money(totals.commercialResult)}</strong>
          <p>Maquinas {money(totals.resultMachines)}</p>
          <p>Salida total {money(totalCashOutflows)}</p>
        </article>
        <article className={`close-kpi ${differenceTone}`}>
          <span>Control diferencias</span>
          <strong>{differenceStatus}</strong>
          <p>Efectivo {money(recalculatedDifference)}</p>
          <p>Banco {money(recalculatedBankDifference)}</p>
        </article>
        <article className="close-kpi blue">
          <span>Maquinas</span>
          <strong>{money(totals.resultMachines)}</strong>
          <p>Entrada {money(totals.totalIn)}</p>
          <p>Salida {money(totals.totalOut)}</p>
        </article>
        <article className="close-kpi slate">
          <span>Saldos proximos</span>
          <strong>{money((balance.nextBase ?? 0) + (balance.nextBankBase ?? 0))}</strong>
          <p>Efectivo {money(balance.nextBase)}</p>
          <p>Banco {money(balance.nextBankBase)}</p>
        </article>
      </div>

      <div className="closed-summary-grid">
        <div className="closed-summary-card">
          <h3>Datos de caja</h3>
          <dl className="summary-detail-list">
            <div>
              <dt>ID recaudacion</dt>
              <dd>{balanceVisibleId(data, balance)}</dd>
            </div>
            <div>
              <dt>Local</dt>
              <dd>{local}</dd>
            </div>
            <div>
              <dt>Fecha operativa</dt>
              <dd>{balance.operatingDate}</dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>
                {formatTime(balance.openedAt)} - {formatTime(balance.closedAt)}
              </dd>
            </div>
            <div>
              <dt>Apertura por</dt>
              <dd>{userDisplayNameWithRole(data, balance.openedBy, balance.openedByRole)}</dd>
            </div>
            <div>
              <dt>Cierre por</dt>
              <dd>{userDisplayNameWithRole(data, balance.closedBy, balance.closedByRole)}</dd>
            </div>
            <div>
              <dt>Efectivo inicial</dt>
              <dd>{money(balance.initialFund)}</dd>
            </div>
            <div>
              <dt>Banco inicial</dt>
              <dd>{money(balance.initialBankFund)}</dd>
            </div>
          </dl>
        </div>

        <div className={`closed-summary-card difference-control-card ${hasDifference && differenceIsPending(balance) ? "danger" : hasDifference ? "warning" : "ok"}`}>
          <h3>Control de diferencias</h3>
          <dl className="summary-detail-list">
            <div>
              <dt>Estado</dt>
              <dd>{differenceStatus}</dd>
            </div>
            <div className={recalculatedDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia efectivo</dt>
              <dd>{money(recalculatedDifference)}</dd>
            </div>
            <div className={recalculatedBankDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia banco</dt>
              <dd>{money(recalculatedBankDifference)}</dd>
            </div>
            <div>
              <dt>Obs. cierre cajero</dt>
              <dd>{balance.differenceNote || "-"}</dd>
            </div>
            <div>
              <dt>Gestionada por</dt>
              <dd>{userDisplayName(data, balance.differenceReviewedBy)}</dd>
            </div>
            <div>
              <dt>Fecha gestion</dt>
              <dd>{balance.differenceReviewedAt ? formatDateTime(balance.differenceReviewedAt) : "-"}</dd>
            </div>
            <div>
              <dt>Revision encargado/admin</dt>
              <dd>{balance.differenceReviewNote || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="closed-summary-card">
          <h3>Salidas operativas</h3>
          <table className="mini-summary-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {outflowRows.map((row) => (
                <tr key={row.concept} className={row.concept === "Salida total" ? "summary-total-row danger" : undefined}>
                  <td>{row.concept}</td>
                  <td>{row.count}</td>
                  <td>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="closed-summary-card">
          <h3>Movimientos financieros</h3>
          <table className="mini-summary-table">
            <thead>
              <tr>
                <th>Movimiento</th>
                <th>Cant.</th>
                <th>Total</th>
                <th>Impacto</th>
              </tr>
            </thead>
            <tbody>
              {financialRows.map((row) => (
                <tr key={row.concept}>
                  <td>{row.concept}</td>
                  <td>{row.count}</td>
                  <td>{row.amount}</td>
                  <td>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="closed-summary-card">
          <h3>Control de efectivo y banco</h3>
          <dl className="summary-detail-list">
            <div>
              <dt>Efectivo esperado</dt>
              <dd>{money(totals.expectedCash)}</dd>
            </div>
            <div>
              <dt>Efectivo declarado</dt>
              <dd>{money(balance.declaredCash)}</dd>
            </div>
            <div className={recalculatedDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia efectivo</dt>
              <dd>{money(recalculatedDifference)}</dd>
            </div>
            <div>
              <dt>Dinero banco esperado</dt>
              <dd>{money(expectedBank)}</dd>
            </div>
            <div>
              <dt>Dinero banco declarado</dt>
              <dd>{money(declaredBank)}</dd>
            </div>
            <div className={recalculatedBankDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia banco</dt>
              <dd>{money(recalculatedBankDifference)}</dd>
            </div>
            <div>
              <dt>Efectivo proxima caja</dt>
              <dd>{money(balance.nextBase)}</dd>
            </div>
            <div>
              <dt>Banco proxima caja</dt>
              <dd>{money(balance.nextBankBase)}</dd>
            </div>
          </dl>
        </div>

        <div className="closed-summary-card closed-summary-wide">
          <h3>Maquinas</h3>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Maquina</th>
                  <th>IN</th>
                  <th>OUT</th>
                  <th>Resultado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => {
                  const machine = data.machines.find((item) => item.id === reading.machineId);
                  return (
                    <tr key={reading.id}>
                      <td>{machine?.visibleId ?? "-"}</td>
                      <td>{machine?.name ?? "-"}</td>
                      <td>{money((reading.inActual ?? reading.inPrevious) - reading.inPrevious)}</td>
                      <td>{money((reading.outActual ?? reading.outPrevious) - reading.outPrevious)}</td>
                      <td>{money(reading.result)}</td>
                      <td>{reading.status}</td>
                    </tr>
                  );
                })}
                {!readings.length && (
                  <tr>
                    <td colSpan={6}>Sin maquinas registradas en esta caja.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Counters({
  data,
  user,
  balance,
  onBack,
  updateReading,
}: {
  data: AppData;
  user: User;
  balance: Balance;
  onBack?: () => void;
  updateReading: (id: string, patch: Partial<Reading>) => void;
}) {
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const [drafts, setDrafts] = useState<Record<string, { status: ReadingStatus; inActual: string; outActual: string; observation: string }>>({});
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        readings.map((reading) => [
          reading.id,
          {
            status: reading.status,
            inActual: counter(reading.inActual ?? reading.inPrevious),
            outActual: counter(reading.outActual ?? reading.outPrevious),
            observation: reading.observation,
          },
        ]),
      ),
    );
  }, [balance.id, readings.length]);

  const updateDraft = (readingId: string, patch: Partial<{ status: ReadingStatus; inActual: string; outActual: string; observation: string }>) => {
    setDrafts((current) => ({
      ...current,
      [readingId]: {
        ...(current[readingId] ?? { status: "PENDIENTE", inActual: "0", outActual: "0", observation: "" }),
        ...patch,
      },
    }));
    setSavedMessage("");
  };

  const invalidReadingIds = new Set(
    readings
      .filter((reading) => {
        const draft = drafts[reading.id];
        if (!draft) return false;
        return parseCounter(draft.inActual) < reading.inPrevious || parseCounter(draft.outActual) < reading.outPrevious;
      })
      .map((reading) => reading.id),
  );

  const saveDrafts = () => {
    const invalid = readings.find((reading) => invalidReadingIds.has(reading.id));
    if (invalid) {
      const machine = data.machines.find((item) => item.id === invalid.machineId);
      setSavedMessage(`Revisar ${machine?.name ?? "maquina"}: IN/OUT actual no puede ser menor al anterior. Fila marcada en rojo.`);
      return;
    }
    readings.forEach((reading) => {
      const draft = drafts[reading.id];
      if (!draft) return;
      updateReading(reading.id, {
        status: draft.status,
        inActual: parseCounter(draft.inActual),
        outActual: parseCounter(draft.outActual),
        observation: draft.observation,
      });
    });
    setSavedMessage("Contadores guardados.");
  };

  const draftSummary = readings.reduce(
    (summary, reading) => {
      const draft = drafts[reading.id];
      const inActual = draft ? parseCounter(draft.inActual) : reading.inActual ?? reading.inPrevious;
      const outActual = draft ? parseCounter(draft.outActual) : reading.outActual ?? reading.outPrevious;
      const totalIn = Math.max(0, inActual - reading.inPrevious);
      const totalOut = Math.max(0, outActual - reading.outPrevious);
      return {
        totalIn: summary.totalIn + totalIn,
        totalOut: summary.totalOut + totalOut,
        resultMachines: summary.resultMachines + totalIn - totalOut,
      };
    },
    { totalIn: 0, totalOut: 0, resultMachines: 0 },
  );
  const pendingCount = readings.filter((reading) => (drafts[reading.id]?.status ?? reading.status) === "PENDIENTE").length;
  const resultTone = draftSummary.resultMachines >= 0 ? "green" : "red";

  return (
    <section className="counters-page">
      <div className="section-toolbar">
        <div>
          <h2>Cargar contadores</h2>
          <p>Entrada y salida total calculada con los valores actuales antes de guardar.</p>
        </div>
        {onBack && (
          <button className="button muted" type="button" onClick={onBack}>
            Volver al panel
          </button>
        )}
      </div>
      <div className="counter-overview">
        <div>
          <span>Maquinas a recaudar</span>
          <strong>{readings.length}</strong>
        </div>
        <div>
          <span>Pendientes de recaudar</span>
          <strong>{pendingCount}</strong>
        </div>
      </div>
      <div className="card-grid three">
        <InfoCard tone="blue" title="Entrada total" lines={[`Total IN: ${money(draftSummary.totalIn)}`]} />
        <InfoCard tone="red" title="Salida total" lines={[`Total OUT: ${money(draftSummary.totalOut)}`]} />
        <InfoCard tone={resultTone} title="Resultado" lines={[`IN - OUT: ${money(draftSummary.resultMachines)}`]} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Maquina</th>
              <th>Estado</th>
              <th>IN ant.</th>
              <th>IN act.</th>
              <th>OUT ant.</th>
              <th>OUT act.</th>
              <th>Resultado</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => {
              const machine = data.machines.find((item) => item.id === reading.machineId);
              const draft = drafts[reading.id] ?? {
                status: reading.status,
                inActual: counter(reading.inActual ?? reading.inPrevious),
                outActual: counter(reading.outActual ?? reading.outPrevious),
                observation: reading.observation,
              };
              const rowIn = parseCounter(draft.inActual) - reading.inPrevious;
              const rowOut = parseCounter(draft.outActual) - reading.outPrevious;
              const invalidIn = parseCounter(draft.inActual) < reading.inPrevious;
              const invalidOut = parseCounter(draft.outActual) < reading.outPrevious;
              const draftResult = rowIn - rowOut;
              return (
                <tr key={reading.id} className={invalidReadingIds.has(reading.id) ? "status-error" : undefined}>
                  <td>{machine?.visibleId}</td>
                  <td>{machine?.name}</td>
                  <td>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(reading.id, { status: event.target.value as ReadingStatus })}
                      disabled={balance.status !== "EN_PROCESO"}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="CARGADA">Cargada</option>
                      <option value="SIN_LECTURA">Sin lectura</option>
                      <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                    </select>
                  </td>
                  <td>{counter(reading.inPrevious)}</td>
                  <td>
                    <input
                      className={invalidIn ? "input-error" : undefined}
                      value={draft.inActual}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateDraft(reading.id, { inActual: formatCounterInput(event.target.value), status: "CARGADA" })}
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                  <td>{counter(reading.outPrevious)}</td>
                  <td>
                    <input
                      className={invalidOut ? "input-error" : undefined}
                      value={draft.outActual}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateDraft(reading.id, { outActual: formatCounterInput(event.target.value), status: "CARGADA" })}
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                  <td>{money(draftResult)}</td>
                  <td>
                    <input
                      value={draft.observation}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateDraft(reading.id, { observation: event.target.value })}
                      placeholder="Tecnico / motivo"
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="button-row end counters-save-row">
        {savedMessage && <span className={savedMessage.startsWith("Revisar") ? "save-feedback error" : "save-feedback"}>{savedMessage}</span>}
        <button className="button success" type="button" disabled={balance.status !== "EN_PROCESO"} onClick={saveDrafts}>
          Guardar contadores
        </button>
      </div>
      <p className="helper">Los cambios se aplican al guardar. Usuario actual: {user.name}.</p>
    </section>
  );
}

function Expenses({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = data.expenses.filter((item) => item.balanceId === balance.id);
  const activeCategories = data.expenseCategories.filter((category) => category.status === "ACTIVA");
  const [selectedCategoryId, setSelectedCategoryId] = useState(activeCategories[0]?.id ?? "");
  const selectedCategory = activeCategories.find((category) => category.id === selectedCategoryId) ?? activeCategories[0];
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const receiptFile = form.get("receiptFile");
    const uploadedReceipt = receiptFile instanceof File && receiptFile.size > 0 ? readUploadFile(receiptFile) : null;
    const expense: Expense = {
      id: uid("expense"),
      balanceId: balance.id,
      category: selectedCategory?.name ?? "",
      subcategory: String(form.get("subcategory") ?? ""),
      amount: parseMoneyInput(form.get("amount")),
      description: String(form.get("description")),
      receipt: uploadedReceipt?.name ?? "",
      receiptFileName: uploadedReceipt?.name,
      receiptFileType: uploadedReceipt?.type,
      receiptDataUrl: undefined,
      status: "ACTIVO",
      userId: user.id,
      createdAt: nowIso(),
    };
    if (!expense.category || !expense.subcategory || !expense.amount) {
      setMessage("Categoria, subcategoria y monto son obligatorios.");
      return;
    }
    patchData((current) =>
      audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, balance.localId),
          accountMovements: upsertAccountMovement(current.accountMovements, localExpenseAccountMovement(expense, balance.localId)),
          expenses: [expense, ...current.expenses],
        },
        "Crear gasto",
        "Gasto",
        expense.id,
        "",
        expense,
      ),
    );
    setMessage("Gasto guardado.");
    event.currentTarget.reset();
  };

  if (!activeCategories.length) {
    return (
      <CashierMovementPanel title="Cargar gastos" detail="Registro de gastos con categoria, subcategoria y comprobante." totalLabel="gastos" total={items.length} onBack={onBack}>
        <p className="notice">No hay categorias de gastos activas.</p>
      </CashierMovementPanel>
    );
  }

  return (
    <CashierMovementPanel
      title="Cargar gastos"
      detail="Registro de gastos con categoria, subcategoria y comprobante."
      totalLabel="gastos"
      total={items.length}
      onBack={onBack}
    >
      <MovementTable
        columns={["Categoria", "Descripcion", "Monto", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [`${item.category} / ${item.subcategory || "-"}`, item.description || "-", money(item.amount)],
          status: item.status,
        }))}
        actionLabel="Eliminar"
        onAnnul={(id) => deleteExpense(id, balance, patchData, audit, setMessage)}
        createRow={
          <tr className="create-row">
            <td>
              <select value={selectedCategory?.id ?? ""} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select form="expense-create-form" name="subcategory" required>
                {(selectedCategory?.subcategories ?? []).map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input form="expense-create-form" name="description" placeholder="Descripcion opcional" />
              <input form="expense-create-form" name="receiptFile" type="file" accept="image/*,.pdf,application/pdf" />
            </td>
            <td>
              <input form="expense-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>
              <form id="expense-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Agregar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}

function ManagerExpenses({
  data,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  type ExpenseRow = { expense: Expense; balance: Balance };
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ExpenseReviewStatus | "TODOS">("TODOS");
  const [statusFilter, setStatusFilter] = useState<MovementStatus | "TODOS">("TODOS");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [draftReviewStatus, setDraftReviewStatus] = useState<ExpenseReviewStatus>("REVISADO");
  const [draftReviewNote, setDraftReviewNote] = useState("");
  const [error, setError] = useState("");
  const allowedLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const rows: ExpenseRow[] = data.expenses
    .map((expense) => {
      const balance = data.balances.find((item) => item.id === expense.balanceId);
      return balance ? { expense, balance } : null;
    })
    .filter((row): row is ExpenseRow => {
      if (!row) return false;
      return !allowedLocalIds || allowedLocalIds.has(row.balance.localId);
    });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows
    .filter(({ expense, balance }) => {
      const reviewStatus = expense.reviewStatus ?? "PENDIENTE";
      if (reviewFilter !== "TODOS" && reviewStatus !== reviewFilter) return false;
      if (statusFilter !== "TODOS" && expense.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [
        expense.category,
        expense.subcategory,
        expense.description,
        expense.receiptFileName,
        expense.receipt,
        balanceVisibleId(data, balance),
        localName(data, balance.localId),
        userDisplayName(data, expense.userId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((a, b) => b.expense.createdAt.localeCompare(a.expense.createdAt));
  const selectedRow = rows.find(({ expense }) => expense.id === selectedExpenseId) ?? null;
  const activeTotal = rows.filter(({ expense }) => expense.status === "ACTIVO").reduce((total, { expense }) => total + expense.amount, 0);
  const pendingCount = rows.filter(({ expense }) => expense.status === "ACTIVO" && (expense.reviewStatus ?? "PENDIENTE") === "PENDIENTE").length;
  const observedCount = rows.filter(({ expense }) => expense.status === "ACTIVO" && expense.reviewStatus === "OBSERVADO").length;
  const reviewedCount = rows.filter(({ expense }) => expense.status === "ACTIVO" && expense.reviewStatus === "REVISADO").length;

  useEffect(() => {
    if (!selectedRow) return;
    setDraftReviewStatus(selectedRow.expense.reviewStatus === "OBSERVADO" ? "OBSERVADO" : "REVISADO");
    setDraftReviewNote(selectedRow.expense.reviewNote ?? "");
    setError("");
  }, [selectedRow?.expense.id]);

  const reviewClass = (expense: Expense) => {
    const reviewStatus = expense.reviewStatus ?? "PENDIENTE";
    if (expense.status === "ANULADO") return "status-inactive";
    if (reviewStatus === "OBSERVADO") return "status-error";
    if (reviewStatus === "REVISADO") return "status-active";
    return "status-maintenance";
  };

  const reviewPill = (expense: Expense) => {
    const reviewStatus = expense.reviewStatus ?? "PENDIENTE";
    const className = reviewStatus === "REVISADO" ? "ok" : reviewStatus === "OBSERVADO" ? "danger" : "warning";
    return <span className={`status-pill ${className}`}>{reviewStatus}</span>;
  };

  const saveReview = () => {
    if (!selectedRow) return;
    const note = draftReviewNote.trim();
    if (draftReviewStatus === "OBSERVADO" && !note) {
      setError("Para observar un gasto tenes que escribir una observacion.");
      return;
    }
    const reviewedAt = nowIso();
    patchData((current) => {
      const previous = current.expenses.find((expense) => expense.id === selectedRow.expense.id);
      const expenses = current.expenses.map((expense) =>
        expense.id === selectedRow.expense.id
          ? {
              ...expense,
              reviewStatus: draftReviewStatus,
              reviewedBy: user.id,
              reviewedAt,
              reviewNote: note,
            }
          : expense,
      );
      const next = expenses.find((expense) => expense.id === selectedRow.expense.id);
      return audit({ ...current, expenses }, "Revisar gasto", "Gasto", selectedRow.expense.id, previous, next, note);
    });
    setMessage("Gasto revisado y auditado.");
    setError("");
  };

  const annulExpense = () => {
    if (!selectedRow) return;
    const note = draftReviewNote.trim();
    if (!note) {
      setError("Para anular un gasto tenes que escribir el motivo.");
      return;
    }
    if (!confirmAction("Anular este gasto? El movimiento queda auditado y no se borra.")) return;
    const reviewedAt = nowIso();
    patchData((current) => {
      const previous = current.expenses.find((expense) => expense.id === selectedRow.expense.id);
      const expenses = current.expenses.map((expense) =>
        expense.id === selectedRow.expense.id
          ? {
              ...expense,
              status: "ANULADO" as MovementStatus,
              reviewStatus: "OBSERVADO" as ExpenseReviewStatus,
              reviewedBy: user.id,
              reviewedAt,
              reviewNote: note,
            }
          : expense,
      );
      const accountMovements = current.accountMovements.map((movement) =>
        movement.sourceType === "GASTO" && movement.sourceId === selectedRow.expense.id ? { ...movement, status: "ANULADO" as MovementStatus } : movement,
      );
      const next = expenses.find((expense) => expense.id === selectedRow.expense.id);
      return audit({ ...current, expenses, accountMovements }, "Anular gasto encargado", "Gasto", selectedRow.expense.id, previous, next, note);
    });
    setMessage("Gasto anulado y auditado.");
    setSelectedExpenseId(null);
    setError("");
  };

  return (
    <section className="admin-focus manager-expenses-page detail-card-surface">
      <div className="admin-header">
        <div>
          <h2>Control de gastos</h2>
          <p className="helper">Revision completa por caja, categoria, comprobante, usuario y estado. No se borra historial operativo.</p>
        </div>
        <div className="admin-header-actions">
          <span>{rows.length} gasto(s)</span>
        </div>
      </div>
      <div className="card-grid three cashier-status-grid">
        <InfoCard tone="green" title="Gastos activos" lines={[money(activeTotal), `${rows.filter(({ expense }) => expense.status === "ACTIVO").length} movimiento(s)`]} />
        <InfoCard tone={pendingCount > 0 ? "orange" : "green"} title="Pendientes" lines={[`${pendingCount} pendiente(s)`, "Requieren revision"]} />
        <InfoCard tone={observedCount > 0 ? "red" : "blue"} title="Control" lines={[`${reviewedCount} revisado(s)`, `${observedCount} observado(s)`]} />
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar gasto, caja, local, usuario..." />
        <label className="compact-filter">
          Revision
          <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ExpenseReviewStatus | "TODOS")}>
            <option value="TODOS">Todas</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="REVISADO">Revisado</option>
            <option value="OBSERVADO">Observado</option>
          </select>
        </label>
        <label className="compact-filter">
          Estado
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MovementStatus | "TODOS")}>
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </label>
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table manager-expenses-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Caja</th>
              <th>Local</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Descripcion</th>
              <th>Comprobante</th>
              <th>Monto</th>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Revision</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ expense, balance }) => (
              <tr key={expense.id} className={reviewClass(expense)}>
                <td>{formatDateTime(expense.createdAt)}</td>
                <td>{balanceVisibleId(data, balance)}</td>
                <td>{localName(data, balance.localId)}</td>
                <td>{expense.category || "-"}</td>
                <td>{expense.subcategory || "-"}</td>
                <td className="long-cell">{expense.description || "-"}</td>
                <td>{expense.receiptFileName || expense.receipt || "-"}</td>
                <td>{money(expense.amount)}</td>
                <td>{userDisplayName(data, expense.userId)}</td>
                <td>{expense.status}</td>
                <td>{reviewPill(expense)}</td>
                <td>
                  <button className="button primary compact" type="button" onClick={() => setSelectedExpenseId(expense.id)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={12}>No hay gastos para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedRow && (
        <Modal title={`Gasto ${balanceVisibleId(data, selectedRow.balance)}`} onClose={() => setSelectedExpenseId(null)} wide>
          <div className="detail-grid">
            <InfoCard
              tone={selectedRow.expense.status === "ACTIVO" ? "blue" : "red"}
              title="Movimiento"
              variant="cash"
              lines={[
                `*Monto: ${money(selectedRow.expense.amount)}`,
                `Categoria: ${selectedRow.expense.category || "-"}`,
                `Subcategoria: ${selectedRow.expense.subcategory || "-"}`,
                `Estado: ${selectedRow.expense.status}`,
              ]}
            />
            <InfoCard
              tone="green"
              title="Origen"
              variant="cash"
              lines={[
                `Caja: ${balanceVisibleId(data, selectedRow.balance)}`,
                `Local: ${localName(data, selectedRow.balance.localId)}`,
                `Usuario: ${userDisplayName(data, selectedRow.expense.userId)}`,
                `Fecha: ${formatDateTime(selectedRow.expense.createdAt)}`,
              ]}
            />
            <InfoCard
              tone={(selectedRow.expense.reviewStatus ?? "PENDIENTE") === "OBSERVADO" ? "red" : "orange"}
              title="Revision"
              variant="cash"
              lines={[
                `Estado: ${selectedRow.expense.reviewStatus ?? "PENDIENTE"}`,
                `Revisado por: ${userDisplayName(data, selectedRow.expense.reviewedBy)}`,
                `Fecha: ${selectedRow.expense.reviewedAt ? formatDateTime(selectedRow.expense.reviewedAt) : "-"}`,
              ]}
            />
          </div>
          <dl className="summary-detail-list">
            <div>
              <dt>Descripcion</dt>
              <dd>{selectedRow.expense.description || "-"}</dd>
            </div>
            <div>
              <dt>Comprobante</dt>
              <dd>{selectedRow.expense.receiptFileName || selectedRow.expense.receipt || "-"}</dd>
            </div>
            <div>
              <dt>Tipo archivo</dt>
              <dd>{selectedRow.expense.receiptFileType || "-"}</dd>
            </div>
            <div>
              <dt>Observacion revision</dt>
              <dd>{selectedRow.expense.reviewNote || "-"}</dd>
            </div>
          </dl>
          {error && <p className="validation error">{error}</p>}
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              Estado de revision
              <select value={draftReviewStatus} onChange={(event) => setDraftReviewStatus(event.target.value as ExpenseReviewStatus)}>
                <option value="REVISADO">Revisado</option>
                <option value="OBSERVADO">Observado</option>
                <option value="PENDIENTE">Pendiente</option>
              </select>
            </label>
            <label className="span-2">
              Observacion / motivo
              <textarea rows={3} value={draftReviewNote} onChange={(event) => setDraftReviewNote(event.target.value)} placeholder="Obligatorio si se observa o se anula." />
            </label>
            <div className="form-actions span-2">
              <div className="button-row end">
                <button className="button success" type="button" onClick={saveReview}>
                  Guardar revision
                </button>
                <button className="button danger" type="button" onClick={annulExpense} disabled={selectedRow.expense.status === "ANULADO"}>
                  Anular gasto
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function Transfers(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = props.data.transfers.filter((item) => item.balanceId === props.balance.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const transfer: Transfer = {
      id: uid("transfer"),
      balanceId: props.balance.id,
      clientId: String(form.get("clientId") || "") || undefined,
      receipt: String(form.get("receipt")),
      name: String(form.get("name")),
      amount: parseMoneyInput(form.get("amount")),
      account: String(form.get("account") || "Cuenta unica inicial"),
      status: "ACTIVO",
      userId: props.user.id,
      createdAt: nowIso(),
    };
    if (!transfer.receipt.trim() || !transfer.name.trim() || !transfer.amount) {
      props.setMessage("Comprobante, nombre y monto son obligatorios.");
      return;
    }
    props.patchData((current) =>
      props.audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(
            {
              ...current,
              currentAccounts: current.currentAccounts.some((account) => account.id === TRANSFER_ACCOUNT_ID)
                ? current.currentAccounts
                : [createTransferCurrentAccount(), ...current.currentAccounts],
            },
            props.balance.localId,
          ),
          accountMovements: upsertAccountMovement(
            upsertAccountMovement(current.accountMovements, transferAccountMovement(transfer)),
            localTransferAccountMovement(transfer, props.balance.localId),
          ),
          transfers: [transfer, ...current.transfers],
        },
        "Crear transferencia",
        "Transferencia",
        transfer.id,
        "",
        transfer,
      ),
    );
    props.setMessage("Transferencia guardada.");
    event.currentTarget.reset();
  };

  return (
    <CashierMovementPanel
      title="Cargar transferencias"
      detail="Registro de transferencias con comprobante, nombre, monto y cuenta."
      totalLabel="transferencias"
      total={items.length}
      onBack={props.onBack}
    >
      <MovementTable
        columns={["Cliente", "Nombre", "Comprobante", "Cuenta", "Monto", "Estado", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [clientNameWithDocument(props.data, item.clientId) || "-", item.name, item.receipt, item.account, money(item.amount), item.status],
          status: item.status,
        }))}
        onAnnul={(id) => annulTransfer(id, props.patchData, props.audit)}
        createRow={
          <tr className="create-row">
            <td>
              <select form="transfer-create-form" name="clientId">
                <option value="">Sin cliente</option>
                {props.data.clients
                  .filter((client) => client.status === "ACTIVO")
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {clientDocumentLabel(client)}
                    </option>
                  ))}
              </select>
            </td>
            <td>
              <input form="transfer-create-form" name="name" placeholder="Nombre" required />
            </td>
            <td>
              <input form="transfer-create-form" name="receipt" placeholder="Comprobante" required />
            </td>
            <td>
              <input form="transfer-create-form" name="account" defaultValue="Cuenta unica inicial" />
            </td>
            <td>
              <input form="transfer-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>Nuevo</td>
            <td>
              <form id="transfer-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Guardar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}

function Gifts(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = props.data.gifts.filter((item) => item.balanceId === props.balance.id);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = parseMoneyInput(form.get("amount"));
    const gift: Gift = {
      id: uid("gift"),
      balanceId: props.balance.id,
      clientId: selectedClientIds[0],
      clientIds: selectedClientIds,
      type: "EFECTIVO",
      cashAmount: amount,
      creditAmount: 0,
      reference: String(form.get("reference") ?? ""),
      description: String(form.get("description")),
      status: "ACTIVO",
      userId: props.user.id,
      createdAt: nowIso(),
    };
    if (selectedClientIds.length === 0 || !gift.reference.trim() || amount <= 0) {
      props.setMessage("Cliente, referencia y monto son obligatorios.");
      return;
    }
    props.patchData((current) =>
      props.audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, props.balance.localId),
          accountMovements: upsertAccountMovement(current.accountMovements, localGiftAccountMovement(gift, props.balance.localId)),
          gifts: [gift, ...current.gifts],
        },
        "Crear regalo",
        "Regalo",
        gift.id,
        "",
        gift,
      ),
    );
    props.setMessage("Regalo guardado.");
    setSelectedClientIds([]);
    event.currentTarget.reset();
  };
  const selectedClientNames = selectedClientIds.map((id) => clientNameWithDocument(props.data, id)).filter(Boolean).join(", ");

  return (
    <CashierMovementPanel
      title="Cargar regalos"
      detail="Registro de regalos en efectivo."
      totalLabel="regalos"
      total={items.length}
      onBack={props.onBack}
    >
      <MovementTable
        columns={["Clientes", "Detalle", "Referencia", "Monto", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [
            (item.clientIds ?? (item.clientId ? [item.clientId] : [])).map((id) => clientNameWithDocument(props.data, id)).filter(Boolean).join(", ") || "-",
            item.description,
            item.reference || "-",
            money(item.cashAmount),
          ],
          status: item.status,
        }))}
        actionLabel="Eliminar"
        onAnnul={(id) => deleteGift(id, props.balance, props.patchData, props.audit, props.setMessage)}
        createRow={
          <tr className="create-row">
            <td>
              <button className="button primary compact" type="button" onClick={() => setClientPickerOpen(true)}>
                Seleccionar
              </button>
              <p className="helper">{selectedClientNames || "Sin clientes seleccionados"}</p>
            </td>
            <td>
              <input form="gift-create-form" name="description" placeholder="Detalle opcional" />
            </td>
            <td>
              <select form="gift-create-form" name="reference" defaultValue="Cajero" required>
                <option value="Mathias">Mathias</option>
                <option value="Ricardo">Ricardo</option>
                <option value="Cajero">Cajero</option>
                <option value="Encargado">Encargado</option>
                <option value="Otro">Otro</option>
              </select>
            </td>
            <td>
              <input className="compact-money-input" form="gift-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>
              <form id="gift-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Agregar
                </button>
              </form>
            </td>
          </tr>
        }
      />
      {clientPickerOpen && (
        <ClientPickerModal
          clients={props.data.clients.filter((client) => client.status === "ACTIVO")}
          selectedIds={selectedClientIds}
          onChange={setSelectedClientIds}
          onClose={() => setClientPickerOpen(false)}
        />
      )}
    </CashierMovementPanel>
  );
}

function ClientPickerModal({
  clients,
  selectedIds,
  onChange,
  onClose,
}: {
  clients: Client[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredClients = normalizedQuery
    ? clients.filter((client) =>
        [client.visibleId, client.name, clientDocumentSearchText(client), client.phone, client.email, client.category].join(" ").toLowerCase().includes(normalizedQuery),
      )
    : clients;
  const toggleClient = (clientId: string) => {
    onChange(selectedIds.includes(clientId) ? selectedIds.filter((id) => id !== clientId) : [...selectedIds, clientId]);
  };

  return (
    <Modal title="Seleccionar clientes" onClose={onClose} wide>
      <div className="modal-toolbar">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..." />
        <span>{selectedIds.length} seleccionados</span>
      </div>
      <div className="table-wrap compact-table">
        <table className="data-table compact-data-table">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Categoria</th>
              <th>Telefono</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id}>
                <td>
                  <input type="checkbox" checked={selectedIds.includes(client.id)} onChange={() => toggleClient(client.id)} />
                </td>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{clientDocumentLabel(client)}</td>
                <td>{client.category}</td>
                <td>{client.phone || "-"}</td>
              </tr>
            ))}
            {!filteredClients.length && (
              <tr>
                <td colSpan={6}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="button-row end">
        <button className="button muted" type="button" onClick={() => onChange([])}>
          Limpiar
        </button>
        <button className="button success" type="button" onClick={onClose}>
          Confirmar seleccion
        </button>
      </div>
    </Modal>
  );
}

function CashierSalaryPayments({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const period = balance.operatingDate.slice(0, 7);
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const items = data.salarySettlements.filter((settlement) => settlement.balanceId === balance.id && settlement.status !== "ANULADA");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const staff = data.staff.find((item) => item.id === String(form.get("staffId")));
    if (!staff) {
      setMessage("Selecciona una persona activa.");
      return;
    }
    const concept = normalizeSalaryConcept(form.get("concept") ?? "SALARIO");
    const amount = parseMoneyInput(form.get("amount"));
    if (!amount) {
      setMessage("Ingresa un monto.");
      return;
    }
    const salaryValidationError = validateSalarySettlementLimit(data, staff, period, concept, amount);
    if (salaryValidationError) {
      setMessage(salaryValidationError);
      return;
    }
    const { baseSalary, advances, extraAmount, extraConcept, aguinaldo, vacationSalary, otherDeductions, totalToPay } = salaryConceptBreakdown(concept, amount);
    const settlement: SalarySettlement = {
      id: uid("salary-settlement"),
      period,
      balanceId: balance.id,
      staffId: staff.id,
      staffName: staffFullName(staff),
      localId: staff.localId,
      baseSalary,
      advances,
      extraAmount,
      extraConcept,
      aguinaldo,
      vacationSalary,
      otherDeductions,
      totalToPay,
      concept,
      notes: `Cargado desde panel cajero por ${user.name}`,
      status: "CONFIRMADA",
      origin: "CAJA",
      createdBy: user.id,
      createdByName: user.name,
      approvedBy: user.id,
      approvedByName: user.name,
      approvedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    patchData((current) => {
      const staffUpdated = current.staff.map((staffItem) => {
        if (staffItem.id !== staff.id) return staffItem;
        const nextAdvance =
          concept === "ADELANTO"
            ? staffItem.salaryAdvanceBalance + amount
            : staffItem.salaryAdvanceBalance;
        return { ...staffItem, salaryAdvanceBalance: nextAdvance, updatedAt: nowIso() };
      });
      const currentAccounts = current.currentAccounts.some((account) => account.id === staffAccountId(staff.id))
        ? current.currentAccounts
        : [createStaffCurrentAccount(staff), ...current.currentAccounts];
      const withLocalAccounts = ensureLocalCurrentAccounts({ ...current, currentAccounts }, balance.localId);
      return audit(
        {
          ...current,
          currentAccounts: withLocalAccounts,
          accountMovements: upsertAccountMovement(
            upsertAccountMovement(current.accountMovements, salaryAccountMovement(settlement, user.id)),
            localSalaryAccountMovement(settlement, user.id),
          ),
          staff: staffUpdated,
          salarySettlements: [settlement, ...current.salarySettlements],
        },
        "Cargar pago salario cajero",
        "LiquidacionSalario",
        settlement.id,
        "",
        settlement,
      );
    });
    setMessage("Pago de salario registrado.");
    event.currentTarget.reset();
  };
  const deleteSalaryPayment = (id: string) => {
    if (balance.status !== "EN_PROCESO") {
      setMessage("Solo se pueden eliminar salarios antes de cerrar la caja.");
      return;
    }
    if (!confirmAction("Eliminar este pago de salario de la caja abierta?")) return;
    patchData((current) => {
      const previous = current.salarySettlements.find((item) => item.id === id);
      if (!previous) return current;
      const staffUpdated = current.staff.map((staffItem) => {
        if (staffItem.id !== previous.staffId || previous.concept !== "ADELANTO") return staffItem;
        return {
          ...staffItem,
          salaryAdvanceBalance: Math.max(0, staffItem.salaryAdvanceBalance - previous.advances),
          updatedAt: nowIso(),
        };
      });
      return audit(
        {
          ...current,
          staff: staffUpdated,
          accountMovements: current.accountMovements.filter((movement) => movement.sourceType !== "SUELDO" || movement.sourceId !== id),
          salarySettlements: current.salarySettlements.filter((item) => item.id !== id),
        },
        "Eliminar pago salario antes de cierre",
        "LiquidacionSalario",
        id,
        previous,
        "",
        "Caja abierta",
      );
    });
    setMessage("Pago de salario eliminado.");
  };

  return (
    <CashierMovementPanel title="Pago de salarios" detail="Carga rapida al personal." totalLabel="pagos de la caja" total={items.length} onBack={onBack}>
      {!activeStaff.length && <p className="notice">No hay personal activo cargado.</p>}
      <MovementTable
        columns={["Personal", "Concepto", "Monto", "Estado", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.staffName, salaryConceptLabel(normalizeSalaryConcept(item.concept)), money(salarySettlementDisplayAmount(item)), item.status],
          status: item.status === "ANULADA" ? "ANULADO" : "ACTIVO",
        }))}
        actionLabel="Eliminar"
        onAnnul={deleteSalaryPayment}
        createRow={
          <tr className="create-row">
            <td>
              <select form="salary-payment-create-form" name="staffId" defaultValue="" required>
                <option value="" disabled>
                  Seleccionar personal
                </option>
                {activeStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staffFullName(staff)}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select form="salary-payment-create-form" name="concept" defaultValue="ADELANTO">
                {salaryConceptOptions.map((concept) => (
                  <option key={concept} value={concept}>
                    {salaryConceptLabel(concept)}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input className="compact-money-input" form="salary-payment-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>Nuevo</td>
            <td>
              <form id="salary-payment-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit" disabled={!activeStaff.length}>
                  Guardar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}

function CapitalMovements({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = data.capitalMovements.filter((item) => item.balanceId === balance.id);
  const activeItems = items.filter((item) => item.status === "ACTIVO");
  const totalWithdrawals = activeItems.filter((item) => item.type === "RETIRO").reduce((total, item) => total + item.amount, 0);
  const totalContributions = activeItems.filter((item) => item.type === "APORTE").reduce((total, item) => total + item.amount, 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type") ?? "") as CapitalMovementType;
    if (type !== "RETIRO" && type !== "APORTE") {
      setMessage("Selecciona si es retiro o aporte.");
      return;
    }
    const movement: CapitalMovement = {
      id: uid("capital"),
      balanceId: balance.id,
      localId: balance.localId,
      type,
      medium: String(form.get("medium") ?? "EFECTIVO") as CapitalMovementMedium,
      timing: "OPERATIVO",
      person: String(form.get("person") ?? "RICARDO") as CapitalMovementPerson,
      amount: parseMoneyInput(form.get("amount")),
      note: String(form.get("note") ?? "").trim(),
      status: "ACTIVO",
      userId: user.id,
      createdAt: nowIso(),
    };
    if (!movement.amount || movement.amount <= 0) {
      setMessage("El monto es obligatorio y debe ser mayor a cero.");
      return;
    }
    patchData((current) =>
      audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, balance.localId),
          accountMovements: upsertAccountMovement(current.accountMovements, capitalAccountMovement(movement)),
          capitalMovements: [movement, ...current.capitalMovements],
        },
        movement.type === "RETIRO" ? "Crear retiro" : "Crear aporte de capital",
        "MovimientoCapital",
        movement.id,
        "",
        movement,
      ),
    );
    setMessage(movement.type === "RETIRO" ? "Retiro registrado." : "Aporte de capital registrado.");
    event.currentTarget.reset();
  };

  const annulMovement = (id: string) => {
    if (!confirmAction("Anular este retiro/aporte?")) return;
    patchData((current) => {
      const previous = current.capitalMovements.find((item) => item.id === id);
      const capitalMovements = current.capitalMovements.map((item) => (item.id === id ? { ...item, status: "ANULADO" as MovementStatus } : item));
      const accountMovements = current.accountMovements.map((movement) =>
        (movement.sourceType === "RETIRO" || movement.sourceType === "APORTE") && movement.sourceId === id
          ? { ...movement, status: "ANULADO" as MovementStatus }
          : movement,
      );
      const next = capitalMovements.find((item) => item.id === id);
      return audit({ ...current, capitalMovements, accountMovements }, "Anular retiro/aporte", "MovimientoCapital", id, previous, next, "Anulacion operativa");
    });
    setMessage("Movimiento anulado.");
  };

  return (
    <CashierMovementPanel
      title="Retiros y aportes"
      detail="Movimientos de capital del local en efectivo o por transferencia."
      totalLabel="movimientos"
      total={items.length}
      onBack={onBack}
    >
      <div className="account-summary-grid movement-summary-grid">
        <div>
          <span>Retiros</span>
          <strong>{money(totalWithdrawals)}</strong>
        </div>
        <div>
          <span>Aportes</span>
          <strong>{money(totalContributions)}</strong>
        </div>
        <div>
          <span>Neto capital</span>
          <strong>{money(totalContributions - totalWithdrawals)}</strong>
        </div>
      </div>
      <MovementTable
        columns={["Tipo", "Medio", "Persona", "Monto", "Fecha", "Nota", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.type, item.medium === "EFECTIVO" ? "Efectivo" : "Transferencia", item.person, money(item.amount), formatDateTime(item.createdAt), item.note || "-"],
          status: item.status,
        }))}
        onAnnul={annulMovement}
        createRow={
          <tr className="create-row">
            <td>
              <select form="capital-create-form" name="type" defaultValue="" required>
                <option value="" disabled>
                  Seleccionar
                </option>
                <option value="RETIRO">Retiro</option>
                <option value="APORTE">Aporte</option>
              </select>
            </td>
            <td>
              <select form="capital-create-form" name="medium" defaultValue="EFECTIVO">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </td>
            <td>
              <select form="capital-create-form" name="person" defaultValue="RICARDO">
                {CAPITAL_PEOPLE.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input className="compact-money-input" form="capital-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>Ahora</td>
            <td>
              <input form="capital-create-form" name="note" placeholder="Nota opcional" />
            </td>
            <td>
              <form id="capital-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Agregar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}

function CashierClients({
  data,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const normalizedQuery = query.trim().toLowerCase();
  const clients = data.clients.filter((client) => client.status !== "PAPELERA");
  const filtered = normalizedQuery
    ? clients.filter((client) =>
        [client.visibleId, client.name, clientDocumentSearchText(client), client.phone, client.email, client.category, client.status].join(" ").toLowerCase().includes(normalizedQuery),
      )
    : clients;
  const sendToTrash = (client: Client) => {
    if (!confirmAction(`Enviar a papelera a ${client.name}?`)) return;
    patchData((current) => {
      const previous = current.clients.find((item) => item.id === client.id);
      const clients = current.clients.map((item) => (item.id === client.id ? { ...item, status: "PAPELERA" as ClientStatus, deletedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = clients.find((item) => item.id === client.id);
      return audit({ ...current, clients }, "Enviar cliente a papelera cajero", "Cliente", client.id, previous, next);
    });
    setMessage("Cliente enviado a papelera.");
  };

  return (
    <CashierMovementPanel title="Clientes" detail="Alta y mantenimiento rapido de clientes desde caja." totalLabel="clientes" total={clients.length} onBack={onBack} onAdd={() => setEditorId(null)}>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, documento, telefono..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table movement-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Categoria</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} className={clientStatusClass(client.status)}>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{clientDocumentLabel(client)}</td>
                <td>{client.category}</td>
                <td>{client.phone || "-"}</td>
                <td>{client.email || "-"}</td>
                <td>{client.status}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => setEditorId(client.id)}>
                      Editar
                    </button>
                    <button className="button muted compact" onClick={() => sendToTrash(client)}>
                      Papelera
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <ClientEditor data={data} clientId={editorId} onClose={() => setEditorId(undefined)} patchData={patchData} audit={audit} />
      )}
    </CashierMovementPanel>
  );
}

function CashierMovementPanel({
  title,
  detail,
  totalLabel,
  total,
  onBack,
  onAdd,
  children,
}: {
  title: string;
  detail?: string;
  totalLabel: string;
  total: number;
  onBack?: () => void;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="admin-focus movement-admin-page">
      <div className="admin-header">
        <div>
          <h2>{title}</h2>
          {detail && <p className="helper">{detail}</p>}
        </div>
        <div className="admin-header-actions">
          <span>
            {total} {totalLabel}
          </span>
          {onAdd && (
            <button className="button success compact" type="button" onClick={onAdd}>
              Agregar
            </button>
          )}
          {onBack && (
            <button className="button muted compact" type="button" onClick={onBack}>
              Volver al panel
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function MovementTable({
  columns,
  rows,
  onAnnul,
  createRow,
  actionLabel = "Anular",
}: {
  columns: string[];
  rows: { id: string; cells: string[]; status: MovementStatus }[];
  onAnnul: (id: string) => void;
  createRow?: ReactNode;
  actionLabel?: string;
}) {
  return (
    <div className="table-wrap grow">
      <table className="data-table movement-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {createRow}
          {rows.map((row) => (
            <tr key={row.id} className={row.status === "ANULADO" ? "status-inactive" : undefined}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${index}`}>{cell}</td>
              ))}
              <td>
                {row.status === "ACTIVO" ? (
                  <button className="button muted compact" type="button" onClick={() => onAnnul(row.id)}>
                    {actionLabel}
                  </button>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length}>Sin movimientos cargados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function deleteExpense(
  id: string,
  balance: Balance,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
  setMessage: (message: string) => void,
) {
  if (balance.status !== "EN_PROCESO") {
    setMessage("Solo se pueden eliminar gastos antes de cerrar la caja.");
    return;
  }
  if (!confirmAction("Eliminar este gasto de la caja abierta?")) return;
  patchData((current) => {
    const previous = current.expenses.find((expense) => expense.id === id);
    if (!previous) return current;
    return audit(
      {
        ...current,
        accountMovements: current.accountMovements.filter((movement) => movement.sourceType !== "GASTO" || movement.sourceId !== id),
        expenses: current.expenses.filter((expense) => expense.id !== id),
      },
      "Eliminar gasto antes de cierre",
      "Gasto",
      id,
      previous,
      "",
      "Caja abierta",
    );
  });
  setMessage("Gasto eliminado.");
}

function deleteGift(
  id: string,
  balance: Balance,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
  setMessage: (message: string) => void,
) {
  if (balance.status !== "EN_PROCESO") {
    setMessage("Solo se pueden eliminar regalos antes de cerrar la caja.");
    return;
  }
  if (!confirmAction("Eliminar este regalo de la caja abierta?")) return;
  patchData((current) => {
    const previous = current.gifts.find((gift) => gift.id === id);
    if (!previous) return current;
    return audit(
      {
        ...current,
        accountMovements: current.accountMovements.filter((movement) => movement.sourceType !== "REGALO" || movement.sourceId !== id),
        gifts: current.gifts.filter((gift) => gift.id !== id),
      },
      "Eliminar regalo antes de cierre",
      "Regalo",
      id,
      previous,
      "",
      "Caja abierta",
    );
  });
  setMessage("Regalo eliminado.");
}

function FormButtons() {
  return (
    <div className="button-row">
      <button className="button success" type="submit">
        Guardar
      </button>
      <button className="button muted" type="reset">
        Anular
      </button>
    </div>
  );
}

function MovementList({
  items,
  onAnnul,
}: {
  items: { id: string; title: string; amount: number; status: MovementStatus }[];
  onAnnul: (id: string) => void;
}) {
  if (items.length === 0) return <p className="helper">Sin movimientos cargados.</p>;

  return (
    <div className="mini-list">
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.title}</span>
          <strong>{money(item.amount)}</strong>
          <em>{item.status}</em>
          {item.status === "ACTIVO" && (
            <button className="link-button" onClick={() => onAnnul(item.id)}>
              Anular
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function annulTransfer(
  id: string,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
) {
  if (!confirmAction("Anular esta transferencia?")) return;
  patchData((current) => {
    const previous = current.transfers.find((item) => item.id === id);
    const transfers = current.transfers.map((item) => (item.id === id ? { ...item, status: "ANULADO" as MovementStatus } : item));
    const accountMovements = current.accountMovements.map((movement) =>
      movement.sourceType === "TRANSFERENCIA" && movement.sourceId === id ? { ...movement, status: "ANULADO" as MovementStatus } : movement,
    );
    const next = transfers.find((item) => item.id === id);
    return audit({ ...current, transfers, accountMovements }, "Anular transferencia", "Transferencia", id, previous, next, "Anulacion operativa");
  });
}

function CloseCash({
  data,
  balance,
  user,
  actorRole,
  patchData,
  audit,
  setMessage,
  setScreen,
  afterCloseScreen = "panel",
}: {
  data: AppData;
  balance: Balance;
  user: User;
  actorRole: Role;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  setScreen: (screen: Screen) => void;
  afterCloseScreen?: Screen;
}) {
  const totals = totalsForBalance(data, balance.id);
  const [declaredCashDraft, setDeclaredCashDraft] = useState("0");
  const [declaredBankDraft, setDeclaredBankDraft] = useState("0");
  const [finalWithdrawalCashDraft, setFinalWithdrawalCashDraft] = useState("0");
  const [finalWithdrawalBankDraft, setFinalWithdrawalBankDraft] = useState("0");
  const [finalWithdrawalCashPerson, setFinalWithdrawalCashPerson] = useState<CapitalMovementPerson>("MATHIAS");
  const [finalWithdrawalBankPerson, setFinalWithdrawalBankPerson] = useState<CapitalMovementPerson>("MATHIAS");
  const [closeError, setCloseError] = useState("");
  const localBalances = localAccountBalances(data, balance.localId);
  const balanceReadings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const loadedReadings = balanceReadings.filter((reading) => reading.status === "CARGADA");
  const pendingReadings = balanceReadings.filter((reading) => reading.status === "PENDIENTE");
  const pendingInvalid = data.readings.filter(
    (reading) => reading.balanceId === balance.id && reading.status === "PENDIENTE" && !reading.observation.trim(),
  );
  const finalEconomicResult = totals.commercialResult;
  const declaredCashPreview = parseMoneyInput(declaredCashDraft);
  const declaredBankPreview = parseMoneyInput(declaredBankDraft);
  const finalWithdrawalCashPreview = parseMoneyInput(finalWithdrawalCashDraft);
  const finalWithdrawalBankPreview = parseMoneyInput(finalWithdrawalBankDraft);
  const cashWithdrawalPersonDisabled = finalWithdrawalCashPreview <= 0;
  const bankWithdrawalPersonDisabled = finalWithdrawalBankPreview <= 0;
  const totalCashOutflows = totals.totalExpenses + totals.totalSalaries + totals.giftCash;
  const hasDeclaredCash = declaredCashDraft.trim() !== "";
  const hasDeclaredBank = declaredBankDraft.trim() !== "";
  const expectedCashAfterFinalWithdrawal = totals.expectedCash - finalWithdrawalCashPreview;
  const expectedBankAfterFinalWithdrawal = localBalances.bank - finalWithdrawalBankPreview;
  const nextBankPreview = declaredBankPreview;
  const differencePreview = declaredCashPreview - expectedCashAfterFinalWithdrawal;
  const bankDifferencePreview = declaredBankPreview - expectedBankAfterFinalWithdrawal;
  const differenceClass = !hasDeclaredCash ? "neutral" : differencePreview === 0 ? "positive" : "negative";
  const bankDifferenceClass = !hasDeclaredBank ? "neutral" : bankDifferencePreview === 0 ? "positive" : "negative";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCloseError("");
    if (pendingInvalid.length > 0) {
      setCloseError("No se puede cerrar: hay maquinas activas pendientes sin observacion.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const declaredCash = parseMoneyInput(form.get("declaredCash"));
    const declaredBank = parseMoneyInput(form.get("declaredBank"));
    const finalWithdrawalCash = parseMoneyInput(form.get("finalWithdrawalCash"));
    const finalWithdrawalBank = parseMoneyInput(form.get("finalWithdrawalBank"));
    const withdrawalCashPerson = String(form.get("finalWithdrawalCashPerson") ?? "MATHIAS") as CapitalMovementPerson;
    const withdrawalBankPerson = String(form.get("finalWithdrawalBankPerson") ?? "MATHIAS") as CapitalMovementPerson;
    if (finalWithdrawalCash < 0 || finalWithdrawalBank < 0) {
      setCloseError("Los retiros finales no pueden ser negativos.");
      return;
    }
    if (finalWithdrawalCash > totals.expectedCash) {
      setCloseError("El retiro final en efectivo no puede superar el efectivo esperado antes del retiro.");
      return;
    }
    if (finalWithdrawalBank > localBalances.bank) {
      setCloseError("El retiro final por transferencia no puede superar el saldo banco del local.");
      return;
    }
    const nextBase = declaredCash;
    const expectedBankAfterWithdrawal = localBalances.bank - finalWithdrawalBank;
    const nextBankBase = declaredBank;
    const withdrawal = finalWithdrawalCash;
    const difference = declaredCash - (totals.expectedCash - finalWithdrawalCash);
    const bankDifference = declaredBank - expectedBankAfterWithdrawal;
    const differenceNote = String(form.get("differenceNote") ?? "").trim();
    if ((difference !== 0 || bankDifference !== 0) && !differenceNote.trim()) {
      setCloseError("Toda diferencia requiere observacion.");
      return;
    }

    patchData((current) => {
      const previous = current.balances.find((item) => item.id === balance.id);
      const closingCapitalMovements: CapitalMovement[] = [
        finalWithdrawalCash > 0
          ? {
              id: uid("capital-close-cash"),
              balanceId: balance.id,
              localId: balance.localId,
              type: "RETIRO" as CapitalMovementType,
              medium: "EFECTIVO" as CapitalMovementMedium,
              timing: "CIERRE" as CapitalMovementTiming,
              person: withdrawalCashPerson,
              amount: finalWithdrawalCash,
              note: `Retiro final caja ${balanceVisibleId(current, balance)}`,
              status: "ACTIVO" as MovementStatus,
              userId: user.id,
              createdAt: nowIso(),
            }
          : null,
        finalWithdrawalBank > 0
          ? {
              id: uid("capital-close-bank"),
              balanceId: balance.id,
              localId: balance.localId,
              type: "RETIRO" as CapitalMovementType,
              medium: "TRANSFERENCIA" as CapitalMovementMedium,
              timing: "CIERRE" as CapitalMovementTiming,
              person: withdrawalBankPerson,
              amount: finalWithdrawalBank,
              note: `Retiro final banco caja ${balanceVisibleId(current, balance)}`,
              status: "ACTIVO" as MovementStatus,
              userId: user.id,
              createdAt: nowIso(),
            }
          : null,
      ].filter((movement): movement is CapitalMovement => Boolean(movement));
      const accountMovements = closingCapitalMovements.reduce(
        (movements, movement) => upsertAccountMovement(movements, capitalAccountMovement(movement)),
        current.accountMovements,
      );
      const balances = current.balances.map((item) =>
        item.id === balance.id
          ? {
              ...item,
              status: "CERRADO" as BalanceStatus,
              closedBy: user.id,
              closedByRole: actorRole,
              closedAt: nowIso(),
              declaredCash,
              declaredBank,
              nextBase,
              nextBankBase,
              withdrawal,
              finalWithdrawalCash,
              finalWithdrawalBank,
              cashDifference: difference,
              bankDifference,
              differenceNote,
              differenceStatus: difference === 0 && bankDifference === 0 ? "RESUELTA" : ("PENDIENTE" as DifferenceStatus),
            }
          : item,
      );
      const machines = current.machines.map((machine) => {
        const reading = current.readings.find((item) => item.balanceId === balance.id && item.machineId === machine.id && item.status === "CARGADA");
        return reading ? { ...machine, lastIn: reading.inActual ?? machine.lastIn, lastOut: reading.outActual ?? machine.lastOut } : machine;
      });
      const machineLocalHistory = [
        ...current.readings
          .filter((item) => item.balanceId === balance.id && item.status === "CARGADA")
          .map((reading) => {
            const machine = current.machines.find((item) => item.id === reading.machineId);
            return machine
              ? machineHistoryEvent(
                  machine,
                  machine.localId,
                  "CONTADORES",
                  `Cierre ${balance.operatingDate}: IN ${counter(reading.inPrevious)} -> ${counter(reading.inActual)}, OUT ${counter(reading.outPrevious)} -> ${counter(reading.outActual)}`,
                  user.id,
                )
              : null;
          })
          .filter((event): event is MachineLocalHistory => Boolean(event)),
        ...current.machineLocalHistory,
      ];
      const next = balances.find((item) => item.id === balance.id);
      const synced = syncMachineResultAccountMovement(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, balance.localId),
          accountMovements,
          capitalMovements: [...closingCapitalMovements, ...current.capitalMovements],
          balances,
          machines,
          machineLocalHistory,
        },
        balance.id,
        user.id,
      );
      return audit(synced, "Cerrar caja", "BalanceDiario", balance.id, previous, next, differenceNote);
    });
    setMessage("Caja cerrada correctamente.");
    setScreen(afterCloseScreen);
  };

  return (
    <section className="close-cash-page">
      <div className="section-toolbar close-cash-toolbar">
        <div>
          <h2>Control de cierre</h2>
          <p>Control final de caja, maquinas, movimientos, salarios y salidas del dia.</p>
        </div>
        <span className="close-status-pill">
          {loadedReadings.length}/{balanceReadings.length} maquinas recaudadas
        </span>
      </div>

      <section className="close-workspace">
        <div className="close-breakdown">
          <h3>Balance de control</h3>
          <dl>
            <div>
              <dt>Efectivo inicial</dt>
              <dd>{money(balance.initialFund)}</dd>
            </div>
            <div>
              <dt>Banco inicial</dt>
              <dd>{money(balance.initialBankFund)}</dd>
            </div>
            <div>
              <dt>Resultado maquinas</dt>
              <dd>{money(totals.resultMachines)}</dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd>- {money(totals.totalExpenses)}</dd>
            </div>
            <div>
              <dt>Salarios</dt>
              <dd>- {money(totals.totalSalaries)}</dd>
            </div>
            <div>
              <dt>Regalos</dt>
              <dd>- {money(totals.giftCash)}</dd>
            </div>
            <div>
              <dt>Transferencias</dt>
              <dd>- {money(totals.totalTransfers)}</dd>
            </div>
            <div>
              <dt>Aportes efectivo</dt>
              <dd>+ {money(totals.capitalContributionsCash)}</dd>
            </div>
            <div>
              <dt>Retiros efectivo</dt>
              <dd>- {money(totals.withdrawalsCash)}</dd>
            </div>
            <div>
              <dt>Retiros transferencia</dt>
              <dd>- {money(totals.withdrawalsBank)}</dd>
            </div>
            <div>
              <dt>Resultado final</dt>
              <dd>{money(finalEconomicResult)}</dd>
            </div>
            <div className="total total-danger">
              <dt>Salida total</dt>
              <dd>- {money(totalCashOutflows)}</dd>
            </div>
            <div className="total">
              <dt>Efectivo esperado</dt>
              <dd>{money(expectedCashAfterFinalWithdrawal)}</dd>
            </div>
            <div className="total">
              <dt>Dinero en banco esperado</dt>
              <dd>{money(expectedBankAfterFinalWithdrawal)}</dd>
            </div>
            <div className="total">
              <dt>Efectivo</dt>
              <dd>{hasDeclaredCash ? money(declaredCashPreview) : "Se calcula al declarar"}</dd>
            </div>
            <div className="total">
              <dt>Dinero en banco</dt>
              <dd>{hasDeclaredBank ? money(declaredBankPreview) : "Se calcula al declarar"}</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={submit} className="close-form">
          <h3>Declaracion final</h3>
          <div className="close-form-grid">
            <label>
              Retiro final efectivo
              <input
                name="finalWithdrawalCash"
                inputMode="numeric"
                value={finalWithdrawalCashDraft}
                onFocus={() => setFinalWithdrawalCashDraft(clearZeroMoneyInput(finalWithdrawalCashDraft))}
                onChange={(event) => setFinalWithdrawalCashDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setFinalWithdrawalCashDraft(normalizeMoneyInput(event.target.value))}
              />
            </label>
            <label>
              Retiro final banco
              <input
                name="finalWithdrawalBank"
                inputMode="numeric"
                value={finalWithdrawalBankDraft}
                onFocus={() => setFinalWithdrawalBankDraft(clearZeroMoneyInput(finalWithdrawalBankDraft))}
                onChange={(event) => setFinalWithdrawalBankDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setFinalWithdrawalBankDraft(normalizeMoneyInput(event.target.value))}
              />
            </label>
            <label>
              Quien retira efectivo
              <select
                name="finalWithdrawalCashPerson"
                value={cashWithdrawalPersonDisabled ? "SIN_RETIROS" : finalWithdrawalCashPerson}
                onChange={(event) => setFinalWithdrawalCashPerson(event.target.value as CapitalMovementPerson)}
                disabled={cashWithdrawalPersonDisabled}
              >
                {cashWithdrawalPersonDisabled ? (
                  <option value="SIN_RETIROS">Sin retiros finales</option>
                ) : (
                  CAPITAL_PEOPLE.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Quien retira banco
              <select
                name="finalWithdrawalBankPerson"
                value={bankWithdrawalPersonDisabled ? "SIN_RETIROS" : finalWithdrawalBankPerson}
                onChange={(event) => setFinalWithdrawalBankPerson(event.target.value as CapitalMovementPerson)}
                disabled={bankWithdrawalPersonDisabled}
              >
                {bankWithdrawalPersonDisabled ? (
                  <option value="SIN_RETIROS">Sin retiros finales</option>
                ) : (
                  CAPITAL_PEOPLE.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Efectivo declarado final
              <input
                name="declaredCash"
                inputMode="numeric"
                value={declaredCashDraft}
                onFocus={() => setDeclaredCashDraft(clearZeroMoneyInput(declaredCashDraft))}
                onChange={(event) => setDeclaredCashDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setDeclaredCashDraft(normalizeMoneyInput(event.target.value))}
                required
              />
            </label>
            <label>
              Dinero banco declarado final
              <input
                name="declaredBank"
                inputMode="numeric"
                value={declaredBankDraft}
                onFocus={() => setDeclaredBankDraft(clearZeroMoneyInput(declaredBankDraft))}
                onChange={(event) => setDeclaredBankDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setDeclaredBankDraft(normalizeMoneyInput(event.target.value))}
                required
              />
            </label>
            <label>
              Efectivo proxima caja
              <input value={hasDeclaredCash ? money(declaredCashPreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Banco proxima caja
              <input value={hasDeclaredBank ? money(nextBankPreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Efectivo esperado final
              <input value={money(expectedCashAfterFinalWithdrawal)} disabled readOnly />
            </label>
            <label>
              Dinero en banco esperado final
              <input value={money(expectedBankAfterFinalWithdrawal)} disabled readOnly />
            </label>
            <label>
              Diferencia efectivo
              <input className={`close-difference-input ${differenceClass}`} value={hasDeclaredCash ? money(differencePreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Diferencia banco
              <input className={`close-difference-input ${bankDifferenceClass}`} value={hasDeclaredBank ? money(bankDifferencePreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label className="span-2">
              Observacion por diferencia
              <textarea name="differenceNote" placeholder={differencePreview !== 0 || bankDifferencePreview !== 0 ? "Obligatoria si hay diferencia" : "Opcional"} />
            </label>
          </div>
          {closeError ? <div className="close-alert danger">{closeError}</div> : null}

          {pendingInvalid.length > 0 ? (
            <div className="close-alert danger">
              Hay {pendingInvalid.length} maquinas pendientes sin observacion. Para cerrar, cargalas o deja una observacion.
            </div>
          ) : pendingReadings.length > 0 ? (
            <div className="close-alert warning">
              Hay {pendingReadings.length} maquinas pendientes con observacion. El cierre puede continuar y queda registrado.
            </div>
          ) : (
            <div className="close-alert ok">Todas las maquinas de la caja fueron recaudadas.</div>
          )}

          <div className="close-actions">
            <button className="button success" type="submit">
              Cerrar caja
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

function Reports({ data, user }: { data: AppData; user: User }) {
  const closedBalances = data.balances.filter((balance) => balance.status === "CERRADO");
  const latest = closedBalances[0];
  const diffs = closedBalances.filter((balance) => (balance.cashDifference ?? 0) !== 0 || (balance.bankDifference ?? 0) !== 0);

  return (
    <>
      <h2>Reportes iniciales</h2>
      <div className="card-grid three">
        <article className="action-card">
          <h3>Cierre diario</h3>
          <p>Exportacion Excel con caja, maquinas y movimientos</p>
          <button className="button primary small" disabled={!latest} onClick={() => latest && exportDailyExcel(data, latest)}>
            Exportar
          </button>
        </article>
        <article className="action-card">
          <h3>Maquinas</h3>
          <p>Resultado por maquina e historial de lecturas</p>
          <button
            className="button primary small"
            onClick={() =>
              exportCsv("poseidon-maquinas.csv", [
                ["ID", "Nombre", "Estado", "Ultimo IN", "Ultimo OUT"],
                ...data.machines.map((machine) => [machine.visibleId, machine.name, machine.status, String(machine.lastIn), String(machine.lastOut)]),
              ])
            }
          >
            Exportar
          </button>
        </article>
        <article className="action-card">
          <h3>Diferencias</h3>
          <p>Pendientes / revisadas con observacion</p>
          <button
            className="button primary small"
            onClick={() =>
              exportCsv("poseidon-diferencias.csv", [
                ["Fecha", "Diferencia efectivo", "Diferencia banco", "Estado", "Observacion"],
                ...diffs.map((balance) => [
                  balance.operatingDate,
                  String(balance.cashDifference ?? 0),
                  String(balance.bankDifference ?? 0),
                  balance.differenceStatus ?? "",
                  balance.differenceNote ?? "",
                ]),
              ])
            }
          >
            Exportar
          </button>
        </article>
      </div>
      <h2>Historial de cierres</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Efectivo esperado</th>
              <th>Declarado</th>
              <th>Diferencia efectivo</th>
              <th>Diferencia banco</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {closedBalances.map((balance) => {
              const totals = totalsForBalance(data, balance.id);
              return (
                <tr key={balance.id}>
                  <td>{balance.operatingDate}</td>
                  <td>{balance.status}</td>
                  <td>{money(totals.expectedCash)}</td>
                  <td>{money(balance.declaredCash)}</td>
                  <td>{money(balance.cashDifference)}</td>
                  <td>{money(balance.bankDifference)}</td>
                  <td>
                    <button className="link-button" onClick={() => exportDailyExcel(data, balance)}>
                      Excel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {user.role === "CAJERO" && <p className="helper">El cajero ve reportes de la caja operativa, no historicos generales.</p>}
    </>
  );
}

function AdminSalarySettlements({
  data,
  user,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  type SalaryEmployeeRow = {
    staffId: string;
    name: string;
    position: string;
    localId: string;
    salaryType: SalaryType;
    baseSalary: number;
    salaryPaid: number;
    advances: number;
    extraAmount: number;
    bonuses: number;
    otherDeductions: number;
    totalAmount: number;
    liquidatedAmount: number;
    pendingAmount: number;
    activeSettlementCount: number;
    status: "Pendiente" | "Borrador" | "Confirmada" | "Anulada" | "Mixta";
    settlements: SalarySettlement[];
    staff?: StaffMember;
  };

  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [editorStaffId, setEditorStaffId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffMovementId, setSelectedStaffMovementId] = useState<string | null>(null);
  const [closureMessage, setClosureMessage] = useState("");
  const [settlementSort, setSettlementSort] = useState<
    SortState<"period" | "concept" | "salaryPaid" | "advances" | "extraAmount" | "bonuses" | "otherDeductions" | "status">
  >({
    key: "period",
    direction: "desc",
  });
  const [staffAccountSort, setStaffAccountSort] = useState<SortState<"createdAt" | "concept" | "amount" | "totalAfter" | "pendingAfter" | "user">>({
    key: "createdAt",
    direction: "desc",
  });
  const currentRange = monthRange(0);
  const previousRange = monthRange(-1);
  const [periodMode, setPeriodMode] = useState<"current" | "previous" | "custom">("current");
  const [customStart, setCustomStart] = useState(currentRange.start);
  const [customEnd, setCustomEnd] = useState(currentRange.end);
  const [sort, setSort] = useState<SortState<"name" | "baseSalary" | "extraAmount" | "bonuses" | "otherDeductions" | "totalAmount" | "advances" | "salaryPaid" | "pendingAmount">>({
    key: "name",
    direction: "asc",
  });
  const selectedRange = periodMode === "current" ? currentRange : periodMode === "previous" ? previousRange : { start: customStart, end: customEnd };
  const activeRange = selectedRange.start <= selectedRange.end ? selectedRange : { start: selectedRange.end, end: selectedRange.start };
  const startMonth = activeRange.start.slice(0, 7);
  const endMonth = activeRange.end.slice(0, 7);
  const defaultPeriod = startMonth;
  const monthsInPeriod = (() => {
    const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
    const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
    const months: string[] = [];
    if (!startYear || !startMonthNumber || !endYear || !endMonthNumber) return [startMonth];
    const cursor = new Date(startYear, startMonthNumber - 1, 1);
    const end = new Date(endYear, endMonthNumber - 1, 1);
    while (cursor <= end) {
      months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months.length ? months : [startMonth];
  })();
  const projectedSalaryBase = (staff: StaffMember | undefined) =>
    staff?.status === "ACTIVO" ? monthsInPeriod.reduce((total, period) => total + salaryBaseForPeriod(data, staff, period).amount, 0) : 0;
  const monthLabel = (period: string) => new Date(`${period}-01T00:00:00`).toLocaleDateString("es-UY", { month: "long", year: "numeric" });
  const periodLabel = periodMode === "custom" && startMonth !== endMonth ? `${monthLabel(startMonth)} a ${monthLabel(endMonth)}` : monthLabel(startMonth);
  const rangeSettlements = data.salarySettlements.filter((settlement) => settlement.period >= startMonth && settlement.period <= endMonth);
  const payableRows = rangeSettlements.filter((settlement) => settlement.status !== "ANULADA");
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const allRelevantStaff = data.staff.filter((staff) => staff.status !== "PAPELERA");

  const employeeRowsMap = new Map<string, SalaryEmployeeRow>();
  const ensureEmployeeRow = (staff: StaffMember | undefined, settlement?: SalarySettlement) => {
    const staffId = staff?.id ?? settlement?.staffId ?? "";
    const existing = employeeRowsMap.get(staffId);
    if (existing) return existing;
    const row: SalaryEmployeeRow = {
      staffId,
      name: staff ? staffFullName(staff) : settlement?.staffName ?? "Personal sin ficha",
      position: staff?.position ?? "Sin cargo",
      localId: staff?.localId ?? settlement?.localId ?? POSEIDON_LOCAL_ID,
      salaryType: salaryBaseForPeriod(data, staff, endMonth).salaryType,
      baseSalary: projectedSalaryBase(staff),
      salaryPaid: 0,
      advances: 0,
      extraAmount: 0,
      bonuses: 0,
      otherDeductions: 0,
      totalAmount: projectedSalaryBase(staff),
      liquidatedAmount: 0,
      pendingAmount: projectedSalaryBase(staff),
      activeSettlementCount: 0,
      status: "Pendiente",
      settlements: [],
      staff,
    };
    employeeRowsMap.set(staffId, row);
    return row;
  };

  activeStaff.forEach((staff) => ensureEmployeeRow(staff));
  rangeSettlements.forEach((settlement) => {
    const staff = allRelevantStaff.find((item) => item.id === settlement.staffId);
    const row = ensureEmployeeRow(staff, settlement);
    row.settlements.push(settlement);
  });

  const employeeRowsAll: SalaryEmployeeRow[] = [...employeeRowsMap.values()].map((row) => {
    const activeSettlements = row.settlements.filter((settlement) => settlement.status !== "ANULADA");
    const statuses = [...new Set(row.settlements.map((settlement) => settlement.status))];
    const activeStatuses = [...new Set(activeSettlements.map((settlement) => settlement.status))];
    const baseSalary = projectedSalaryBase(row.staff);
    const salaryPaid = activeSettlements
      .filter((settlement) => isSalaryPaymentConcept(normalizeSalaryConcept(settlement.concept)))
      .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
    const advances = activeSettlements.reduce((total, settlement) => total + Number(settlement.advances ?? 0), 0);
    const extraAmount = activeSettlements.reduce((total, settlement) => total + Number(settlement.extraAmount ?? 0), 0);
    const bonuses = activeSettlements.reduce((total, settlement) => total + Number(settlement.aguinaldo ?? 0) + Number(settlement.vacationSalary ?? 0), 0);
    const otherDeductions = activeSettlements.reduce((total, settlement) => total + Number(settlement.otherDeductions ?? 0), 0);
    const totalAmount = Math.max(0, baseSalary + extraAmount + bonuses - otherDeductions);
    const liquidatedAmount = salaryPaid + advances + extraAmount + bonuses - otherDeductions;
    const pendingAmount = baseSalary - advances - salaryPaid - otherDeductions;
    const status: SalaryEmployeeRow["status"] =
      row.settlements.length === 0 || (row.staff?.status === "ACTIVO" && activeSettlements.length === 0)
        ? "Pendiente"
        : activeStatuses.length > 1
          ? "Mixta"
          : activeStatuses[0] === "CONFIRMADA"
            ? "Confirmada"
            : statuses[0] === "BORRADOR"
              ? "Borrador"
              : statuses[0] === "ANULADA"
              ? "Anulada"
              : "Pendiente";
    return { ...row, baseSalary, salaryPaid, advances, extraAmount, bonuses, otherDeductions, totalAmount, liquidatedAmount, pendingAmount, activeSettlementCount: activeSettlements.length, status };
  });
  const summaryRows = employeeRowsAll.filter((row) => row.staff?.status === "ACTIVO" || row.settlements.length > 0);
  const periodTotal = summaryRows.reduce((total, row) => total + row.totalAmount, 0);
  const periodPending = summaryRows.reduce((total, row) => total + row.pendingAmount, 0);
  const periodBase = summaryRows.reduce((total, row) => total + row.baseSalary, 0);
  const periodSalaryPaid = summaryRows.reduce((total, row) => total + row.salaryPaid, 0);
  const periodAdvances = summaryRows.reduce((total, row) => total + row.advances, 0);
  const periodExtras = summaryRows.reduce((total, row) => total + row.extraAmount, 0);
  const periodBonuses = summaryRows.reduce((total, row) => total + row.bonuses, 0);
  const periodDeductions = summaryRows.reduce((total, row) => total + row.otherDeductions, 0);
  const periodLiquidated = summaryRows.reduce((total, row) => total + row.liquidatedAmount, 0);
  const employeeValue = (row: SalaryEmployeeRow, key: typeof sort.key): string | number => {
    if (key === "name") return row.name;
    return row[key];
  };
  const settlementSortValue = (settlement: SalarySettlement, key: typeof settlementSort.key): string | number => {
    const concept = normalizeSalaryConcept(settlement.concept);
    if (key === "period") return settlement.period;
    if (key === "concept") return salaryConceptLabel(concept);
    if (key === "salaryPaid") return isSalaryPaymentConcept(concept) ? salarySettlementAmount(settlement) : 0;
    if (key === "bonuses") return Number(settlement.aguinaldo ?? 0) + Number(settlement.vacationSalary ?? 0);
    if (key === "status") return settlement.status;
    return Number(settlement[key] ?? 0);
  };
  const sortedSettlements = (settlements: SalarySettlement[]) =>
    [...settlements].sort((a, b) => {
      const result = compareValues(settlementSortValue(a, settlementSort.key), settlementSortValue(b, settlementSort.key));
      return settlementSort.direction === "asc" ? result : -result;
    });
  const rows = employeeRowsAll.sort((a, b) => {
      const result = compareValues(employeeValue(a, sort.key), employeeValue(b, sort.key));
      return sort.direction === "asc" ? result : -result;
    });
  const selectedEmployee = selectedStaffId ? employeeRowsAll.find((row) => row.staffId === selectedStaffId) : undefined;
  const salarySettlementForMovement = (movement: AccountMovement) =>
    movement.sourceType === "SUELDO" ? data.salarySettlements.find((settlement) => settlement.id === movement.sourceId) : undefined;
  const selectedPeriodSalaryMovements = selectedEmployee
    ? data.salarySettlements
        .filter(
          (settlement) =>
            settlement.staffId === selectedEmployee.staffId &&
            settlement.status !== "ANULADA" &&
            settlement.period >= startMonth &&
            settlement.period <= endMonth,
        )
        .map((settlement) => salaryAccountMovement(settlement, settlement.approvedBy ?? settlement.createdBy ?? "system"))
    : [];
  const movementMatchesSelectedSalaryPeriod = (movement: AccountMovement) => {
    const settlement = salarySettlementForMovement(movement);
    if (settlement) return settlement.period >= startMonth && settlement.period <= endMonth;
    return movement.createdAt.slice(0, 10) >= activeRange.start && movement.createdAt.slice(0, 10) <= activeRange.end;
  };
  const selectedAccountMovementMap = new Map<string, AccountMovement>();
  selectedPeriodSalaryMovements.forEach((movement) => selectedAccountMovementMap.set(movement.id, movement));
  if (selectedEmployee) {
    data.accountMovements
      .filter(
        (movement) =>
          movement.accountId === staffAccountId(selectedEmployee.staffId) &&
          movement.status === "ACTIVO" &&
          movementMatchesSelectedSalaryPeriod(movement),
      )
      .forEach((movement) => selectedAccountMovementMap.set(movement.id, movement));
  }
  const selectedAccountMovements = [...selectedAccountMovementMap.values()]
    .filter((movement) => movement.status === "ACTIVO")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pendingReductionForMovement = (movement: AccountMovement) => {
    if (movement.sourceType !== "SUELDO" || movement.status !== "ACTIVO" || movement.direction !== "SALIDA") return 0;
    const settlement = salarySettlementForMovement(movement);
    const concept = normalizeSalaryConcept(settlement?.concept ?? movement.concept);
    if (isSalaryPaymentConcept(concept)) return settlement ? salarySettlementAmount(settlement) : movement.amount;
    if (concept === "ADELANTO") return settlement ? Number(settlement.advances ?? movement.amount) : movement.amount;
    if (concept === "DESCUENTO") return settlement ? Number(settlement.otherDeductions ?? movement.amount) : movement.amount;
    return 0;
  };
  const totalDeltaForMovement = (movement: AccountMovement) => {
    if (movement.sourceType !== "SUELDO" || movement.status !== "ACTIVO" || movement.direction !== "SALIDA") return 0;
    const settlement = salarySettlementForMovement(movement);
    if (settlement) return salarySettlementTotalDelta(settlement);
    const concept = normalizeSalaryConcept(movement.concept);
    if (concept === "EXTRA" || concept === "HORAS_EXTRAS" || concept === "AGUINALDO" || concept === "SALARIO_VACACIONAL") return movement.amount;
    if (concept === "DESCUENTO") return -movement.amount;
    return 0;
  };
  let selectedRunningPending = selectedEmployee ? selectedEmployee.baseSalary : 0;
  let selectedRunningTotal = selectedEmployee ? selectedEmployee.baseSalary : 0;
  const selectedAccountRowsChronological = [...selectedAccountMovements]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((movement) => {
      const activeAmount = movement.status === "ACTIVO" ? movement.amount : 0;
      const debit = movement.direction === "SALIDA" ? activeAmount : 0;
      const credit = movement.direction === "ENTRADA" ? activeAmount : 0;
      selectedRunningTotal += totalDeltaForMovement(movement);
      selectedRunningPending -= pendingReductionForMovement(movement);
      return { movement, debit, credit, balance: credit - debit, amount: activeAmount, totalAfter: selectedRunningTotal, pendingAfter: selectedRunningPending };
    });
  const staffAccountRowValue = (row: (typeof selectedAccountRowsChronological)[number], key: typeof staffAccountSort.key): string | number => {
    if (key === "createdAt") return row.movement.createdAt;
    if (key === "concept") return movementConceptLabel(row.movement.concept);
    if (key === "amount") return row.amount;
    if (key === "totalAfter") return row.totalAfter;
    if (key === "pendingAfter") return row.pendingAfter;
    return userDisplayName(data, row.movement.userId);
  };
  const selectedAccountRows = [...selectedAccountRowsChronological].sort((a, b) => {
    const result = compareValues(staffAccountRowValue(a, staffAccountSort.key), staffAccountRowValue(b, staffAccountSort.key));
    return staffAccountSort.direction === "asc" ? result : -result;
  });
  const selectedStaffMovementRow = selectedAccountRows.find((row) => row.movement.id === selectedStaffMovementId);
  const selectedStaffMovement = selectedStaffMovementRow?.movement;
  const selectedStaffMovementBalance = selectedStaffMovement?.balanceId ? data.balances.find((balance) => balance.id === selectedStaffMovement.balanceId) : undefined;
  const selectedStaffMovementSettlement =
    selectedStaffMovement?.sourceType === "SUELDO" ? data.salarySettlements.find((settlement) => settlement.id === selectedStaffMovement.sourceId) : undefined;
  const salaryClosures = [...data.salaryClosures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const nextSalaryClosureVisibleId = (current: AppData) => {
    const max = current.salaryClosures
      .map((closure) => {
        const match = String(closure.visibleId ?? "").match(/LS-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0);
    return `LS-${max + 1}`;
  };
  const closeSalaryPeriod = () => {
    if (!summaryRows.length) {
      setClosureMessage("No hay empleados para cerrar en este periodo.");
      return;
    }
    const duplicate = data.salaryClosures.some((closure) => closure.status === "CERRADO" && closure.startDate === activeRange.start && closure.endDate === activeRange.end);
    if (duplicate) {
      setClosureMessage("Este periodo ya tiene un cierre de liquidacion guardado.");
      return;
    }
    if (!confirmAction(`Cerrar liquidacion de ${periodLabel}? Se guardara una foto auditada del periodo.`)) return;
    patchData((current) => {
      const closure: SalaryClosure = {
        id: uid("salary-closure"),
        visibleId: nextSalaryClosureVisibleId(current),
        startDate: activeRange.start,
        endDate: activeRange.end,
        periodLabel,
        employeeCount: summaryRows.length,
        settlementIds: payableRows.map((settlement) => settlement.id),
        totalBase: periodBase,
        totalExtras: periodExtras,
        totalBonuses: periodBonuses,
        totalDeductions: periodDeductions,
        totalSalaries: periodTotal,
        totalSalaryPaid: periodSalaryPaid,
        totalAdvances: periodAdvances,
        totalLiquidated: periodLiquidated,
        totalPending: periodPending,
        status: "CERRADO",
        note: "Cierre manual de liquidacion de salarios",
        createdBy: user.id,
        createdByName: user.name,
        createdAt: nowIso(),
      };
      return audit(
        { ...current, salaryClosures: [closure, ...current.salaryClosures] },
        "Cerrar liquidacion salarios",
        "LiquidacionSalarioCierre",
        closure.id,
        "",
        closure,
        closure.note,
      );
    });
    setClosureMessage("Cierre de liquidacion guardado.");
  };
  const annulSalaryClosure = (closure: SalaryClosure) => {
    if (!confirmAction(`Anular cierre ${closure.visibleId}? La auditoria se conserva.`)) return;
    patchData((current) => {
      const previous = current.salaryClosures.find((item) => item.id === closure.id);
      const salaryClosures = current.salaryClosures.map((item) => (item.id === closure.id ? { ...item, status: "ANULADO" as const } : item));
      const next = salaryClosures.find((item) => item.id === closure.id);
      return audit({ ...current, salaryClosures }, "Anular cierre liquidacion salarios", "LiquidacionSalarioCierre", closure.id, previous, next, "Anulacion de cierre");
    });
    setClosureMessage("Cierre de liquidacion anulado.");
  };

  const changeStatus = (settlement: SalarySettlement, status: SalarySettlementStatus) => {
    if (status === "ANULADA" && !confirmAction(`Eliminar liquidacion de ${settlement.staffName}? Queda registrada en auditoria y no impacta los totales.`)) return;
    patchData((current) => {
      const previous = current.salarySettlements.find((item) => item.id === settlement.id);
      const updatedAt = nowIso();
      const salarySettlements = current.salarySettlements.map((item) =>
        item.id === settlement.id
          ? {
              ...item,
              status,
              approvedBy: status === "CONFIRMADA" ? user.id : item.approvedBy,
              approvedByName: status === "CONFIRMADA" ? user.name : item.approvedByName,
              approvedAt: status === "CONFIRMADA" ? updatedAt : item.approvedAt,
              annulledBy: status === "ANULADA" ? user.id : item.annulledBy,
              annulledByName: status === "ANULADA" ? user.name : item.annulledByName,
              annulledAt: status === "ANULADA" ? updatedAt : item.annulledAt,
              updatedAt,
            }
          : item,
      );
      const next = salarySettlements.find((item) => item.id === settlement.id);
      const staffMember = current.staff.find((item) => item.id === settlement.staffId);
      const currentAccounts = staffMember && !current.currentAccounts.some((account) => account.id === staffAccountId(staffMember.id))
        ? [createStaffCurrentAccount(staffMember), ...current.currentAccounts]
        : current.currentAccounts;
      const withLocalAccounts = ensureLocalCurrentAccounts({ ...current, currentAccounts }, settlement.localId);
      const accountMovements = next
        ? upsertAccountMovement(upsertAccountMovement(current.accountMovements, salaryAccountMovement(next, user.id)), localSalaryAccountMovement(next, user.id))
        : current.accountMovements;
      const activeAdvanceBalance = salarySettlements
        .filter((item) => item.staffId === settlement.staffId && item.status !== "ANULADA" && item.concept === "ADELANTO")
        .reduce((total, item) => total + Number(item.advances ?? 0), 0);
      const staff = current.staff.map((item) =>
        item.id === settlement.staffId ? { ...item, salaryAdvanceBalance: activeAdvanceBalance, updatedAt: nowIso() } : item,
      );
      const action = status === "ANULADA" ? "Eliminar liquidacion salario" : "Cambiar estado liquidacion salario";
      return audit({ ...current, currentAccounts: withLocalAccounts, accountMovements, salarySettlements, staff }, action, "LiquidacionSalario", settlement.id, previous, next);
    });
  };
  const exportSalaryExcel = () => {
    exportCsv(`poseidon-liquidacion-salarios-${startMonth}-${endMonth}.csv`, [
      ["Periodo", periodLabel],
      ["Pendiente", money(periodPending)],
      ["Total salarios", money(periodTotal)],
      ["Total salarios base", money(periodBase)],
      ["Salario pagado", money(periodSalaryPaid)],
      ["Adelantos", money(periodAdvances)],
      ["Extras", money(periodExtras)],
      ["Bonos", money(periodBonuses)],
      ["Descuentos", money(periodDeductions)],
      ["Liquidado", money(periodLiquidated)],
      [],
      ["Nombre", "Liquidaciones", "Salario Base", "Extras", "Bonos", "Descuentos", "Total", "Adelantos", "Salario pagado", "Pendiente"],
      ...rows.map((row) => [
        row.name,
        row.activeSettlementCount ? `${row.activeSettlementCount} - ${row.status}` : "Sin liquidacion cargada",
        money(row.baseSalary),
        money(row.extraAmount),
        money(row.bonuses),
        money(row.otherDeductions),
        money(row.totalAmount),
        money(row.advances),
        money(row.salaryPaid),
        money(row.pendingAmount),
      ]),
    ]);
  };

  return (
    <section className="admin-focus detail-card-surface salary-page">
      <div className="admin-header">
        <div>
          <p className="helper">Registro mensual para saber cuanto pagar, a quien y por que concepto.</p>
        </div>
        <div className="admin-header-actions">
          <span>{payableRows.length} liquidaciones activas</span>
          <button className="button success compact" type="button" onClick={closeSalaryPeriod}>
            Cerrar liquidacion
          </button>
        </div>
      </div>
      {closureMessage && <p className="notice">{closureMessage}</p>}
      <div className="accounts-period-bar salary-period-bar">
        <div className="button-row">
          <button className={periodMode === "current" ? "button primary compact" : "button muted compact"} type="button" onClick={() => setPeriodMode("current")}>
            Mes actual
          </button>
          <button className={periodMode === "previous" ? "button primary compact" : "button muted compact"} type="button" onClick={() => setPeriodMode("previous")}>
            Mes anterior
          </button>
          <button className={periodMode === "custom" ? "button primary compact" : "button muted compact"} type="button" onClick={() => setPeriodMode("custom")}>
            Consulta historica
          </button>
        </div>
        <div className="accounts-date-range">
          <span>{periodLabel}</span>
          {periodMode === "custom" && (
            <>
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </>
          )}
          <button className="button primary compact" type="button" onClick={exportSalaryExcel}>
            Exportar Excel
          </button>
        </div>
      </div>
      <div className="card-grid four salary-summary-grid">
        <InfoCard tone={periodPending > 0 ? "orange" : "green"} title="Pendientes" lines={[money(periodPending), "Base - salario - adelantos - descuentos"]} />
        <InfoCard tone="blue" title="Total salarios" lines={[money(periodTotal), "Base + extras + horas extras + bonos - descuentos"]} />
        <InfoCard tone="blue" title="Total salarios base" lines={[money(periodBase), "Segun ficha vigente"]} />
        <InfoCard tone="orange" title="Extras" lines={[money(periodExtras), "Extras y horas extras"]} />
      </div>
      {!activeStaff.length && <p className="notice">Primero agrega personal activo para poder liquidar salarios.</p>}
      <section className="embedded-panel salary-main-panel">
        <div className="section-toolbar">
          <div>
            <h3>Liquidacion por empleado</h3>
            <p>Resumen consolidado del periodo seleccionado. Usa Detalle para cargar o revisar liquidaciones.</p>
          </div>
          <span className="close-status-pill">{rows.length} empleado(s)</span>
        </div>
        <div className="table-wrap grow">
          <table className="data-table admin-data-table salary-table">
            <thead>
              <tr>
                {[
                  ["name", "Nombre"],
                  ["baseSalary", "Salario Base"],
                  ["extraAmount", "Extras"],
                  ["bonuses", "Bonos"],
                  ["otherDeductions", "Descuentos"],
                  ["totalAmount", "Total"],
                  ["advances", "Adelantos"],
                  ["salaryPaid", "Salario pagado"],
                  ["pendingAmount", "Pendiente"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                      {label}
                      {sortIndicator(sort, key as typeof sort.key)}
                    </button>
                  </th>
                ))}
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staffId} className={row.status === "Pendiente" ? "status-maintenance" : row.status === "Anulada" ? "status-inactive" : row.status === "Confirmada" ? "status-active" : ""}>
                  <td>
                    <div className="cell-stack">
                      <strong>{row.name}</strong>
                      <small>
                        {row.activeSettlementCount
                          ? `${row.activeSettlementCount} liquidacion${row.activeSettlementCount === 1 ? "" : "es"} activa${row.activeSettlementCount === 1 ? "" : "s"} - ${row.status}`
                          : "Sin liquidacion cargada"}
                      </small>
                    </div>
                  </td>
                  <td>{row.baseSalary ? money(row.baseSalary) : "-"}</td>
                  <td>{row.extraAmount ? money(row.extraAmount) : "-"}</td>
                  <td>{row.bonuses ? money(row.bonuses) : "-"}</td>
                  <td>{row.otherDeductions ? money(row.otherDeductions) : "-"}</td>
                  <td className={row.totalAmount < 0 ? "money-negative" : "money-positive"}>{row.totalAmount ? money(row.totalAmount) : "-"}</td>
                  <td>{row.advances ? money(row.advances) : "-"}</td>
                  <td>{row.salaryPaid ? money(row.salaryPaid) : "-"}</td>
                  <td className={row.pendingAmount < 0 ? "money-negative" : "money-positive"}>{row.pendingAmount ? money(row.pendingAmount) : "-"}</td>
                  <td>
                    <button className="button primary compact" type="button" onClick={() => setSelectedStaffId(row.staffId)}>
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={10}>No hay empleados para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="embedded-panel salary-closures-panel">
        <div className="section-toolbar">
          <div>
            <h3>Historial de cierres</h3>
            <p>Cierres guardados de liquidacion de salarios. Son fotos auditadas del periodo.</p>
          </div>
          <span className="close-status-pill">{salaryClosures.length} cierre(s)</span>
        </div>
        <div className="table-wrap">
          <table className="data-table admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Periodo</th>
                <th>Empleados</th>
                <th>Total salarios</th>
                <th>Liquidado</th>
                <th>Pendiente</th>
                <th>Usuario</th>
                <th>Fecha cierre</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {salaryClosures.map((closure) => (
                <tr key={closure.id} className={closure.status === "ANULADO" ? "status-inactive" : ""}>
                  <td>{closure.visibleId}</td>
                  <td>{closure.periodLabel}</td>
                  <td>{closure.employeeCount}</td>
                  <td>{money(closure.totalSalaries)}</td>
                  <td>{money(closure.totalLiquidated)}</td>
                  <td className={closure.totalPending > 0 ? "money-negative" : "money-positive"}>{money(closure.totalPending)}</td>
                  <td>{closure.createdByName}</td>
                  <td>{formatDateTime(closure.createdAt)}</td>
                  <td>{closure.status}</td>
                  <td>
                    {closure.status === "CERRADO" ? (
                      <button className="button muted compact" type="button" onClick={() => annulSalaryClosure(closure)}>
                        Anular
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {!salaryClosures.length && (
                <tr>
                  <td colSpan={10}>Todavia no hay cierres de liquidacion guardados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedEmployee && (
        <Modal
          title={`Detalle de ${selectedEmployee.name}`}
          onClose={() => {
            setSelectedStaffId(null);
            setSelectedStaffMovementId(null);
          }}
          wide
        >
          <div className="salary-detail-modal">
            <div className="salary-detail-compact">
              <div className="salary-detail-context">
                <div>
                  <span>Local</span>
                  <strong>{localName(data, selectedEmployee.localId)}</strong>
                </div>
                <div>
                  <span>Periodo</span>
                  <strong>{periodLabel}</strong>
                </div>
                <div>
                  <span>Tipo / cargo</span>
                  <strong>{selectedEmployee.salaryType} - {selectedEmployee.position}</strong>
                </div>
                <div>
                  <span>Descuentos</span>
                  <strong>{money(selectedEmployee.otherDeductions)}</strong>
                </div>
              </div>
              <div className="salary-detail-metrics">
                {[
                  ["Salario base", money(selectedEmployee.baseSalary), ""],
                  ["Adelantos", money(selectedEmployee.advances), ""],
                  ["Extras", money(selectedEmployee.extraAmount), ""],
                  ["Bonos", money(selectedEmployee.bonuses), ""],
                  ["Total", money(selectedEmployee.totalAmount), selectedEmployee.totalAmount < 0 ? "money-negative" : "money-positive"],
                  ["Liquidado", money(selectedEmployee.liquidatedAmount), "money-positive"],
                  ["Pendiente", money(selectedEmployee.pendingAmount), selectedEmployee.pendingAmount > 0 ? "money-negative" : "money-positive"],
                ].map(([label, value, className]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong className={className}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <section className="embedded-panel">
              <div className="section-toolbar">
                <div>
                  <h3>Liquidaciones del periodo</h3>
                  <p>Detalle de conceptos cargados para este empleado.</p>
                </div>
                <button
                  className="button success compact"
                  type="button"
                  onClick={() => {
                    setEditorStaffId(selectedEmployee.staffId);
                    setEditorId(null);
                  }}
                >
                  Agregar liquidacion
                </button>
              </div>
              <div className="table-wrap">
                <table className="data-table admin-data-table salary-detail-table">
                  <thead>
                    <tr>
                      {[
                        ["period", "Mes"],
                        ["concept", "Concepto"],
                        ["salaryPaid", "Salario pagado"],
                        ["advances", "Adelanto"],
                        ["extraAmount", "Extra"],
                        ["bonuses", "Bonos"],
                        ["otherDeductions", "Descuento"],
                        ["status", "Estado"],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button className="sort-button" type="button" onClick={() => setSettlementSort((current) => nextSort(current, key as typeof settlementSort.key))}>
                            {label}
                            {sortIndicator(settlementSort, key as typeof settlementSort.key)}
                          </button>
                        </th>
                      ))}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSettlements(selectedEmployee.settlements).map((settlement) => (
                      <tr key={settlement.id} className={settlement.status === "ANULADA" ? "status-inactive" : settlement.status === "CONFIRMADA" ? "status-active" : ""}>
                        <td>{settlement.period}</td>
                        <td>{salaryConceptLabel(normalizeSalaryConcept(settlement.concept))}</td>
                        <td>{isSalaryPaymentConcept(normalizeSalaryConcept(settlement.concept)) ? money(salarySettlementAmount(settlement)) : "-"}</td>
                        <td>{settlement.advances ? money(settlement.advances) : "-"}</td>
                        <td>{settlement.extraAmount ? money(settlement.extraAmount) : "-"}</td>
                        <td>{settlement.aguinaldo + settlement.vacationSalary ? money(settlement.aguinaldo + settlement.vacationSalary) : "-"}</td>
                        <td>{settlement.otherDeductions ? money(settlement.otherDeductions) : "-"}</td>
                        <td>{settlement.status}</td>
                        <td>
                          <div className="table-actions">
                            {settlement.status !== "ANULADA" && (
                              <button
                                className="button primary compact"
                                type="button"
                                onClick={() => {
                                  setEditorStaffId(selectedEmployee.staffId);
                                  setEditorId(settlement.id);
                                }}
                              >
                                Editar
                              </button>
                            )}
                            {settlement.status !== "ANULADA" && (
                              <button className="button muted compact" type="button" onClick={() => changeStatus(settlement, "ANULADA")}>
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!selectedEmployee.settlements.length && (
                      <tr>
                        <td colSpan={9}>Este empleado no tiene liquidaciones en el periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="embedded-panel">
              <div className="section-toolbar">
                <div>
                  <h3>Cuenta corriente del empleado</h3>
                  <p>Movimientos personales del periodo trabajado seleccionado.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table admin-data-table">
                  <thead>
                    <tr>
                      {[
                        ["createdAt", "Fecha"],
                        ["concept", "Concepto"],
                        ["amount", "Monto"],
                        ["totalAfter", "Total"],
                        ["pendingAfter", "Pendiente"],
                        ["user", "Usuario"],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button className="sort-button" type="button" onClick={() => setStaffAccountSort((current) => nextSort(current, key as typeof staffAccountSort.key))}>
                            {label}
                            {sortIndicator(staffAccountSort, key as typeof staffAccountSort.key)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAccountRows.map(({ movement, amount, totalAfter, pendingAfter }) => (
                      <tr key={movement.id} className="clickable-row" onClick={() => setSelectedStaffMovementId(movement.id)}>
                        <td>{formatDateTime(movement.createdAt)}</td>
                        <td>{movementConceptLabel(movement.concept)}</td>
                        <td>{amount ? money(amount) : "-"}</td>
                        <td className={totalAfter < 0 ? "money-negative" : "money-positive"}>{money(totalAfter)}</td>
                        <td className={pendingAfter > 0 ? "money-negative" : "money-positive"}>{money(pendingAfter)}</td>
                        <td>{userDisplayName(data, movement.userId)}</td>
                      </tr>
                    ))}
                    {!selectedAccountRows.length && (
                      <tr>
                        <td colSpan={6}>Sin movimientos personales en el periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </Modal>
      )}
      {selectedStaffMovement && selectedEmployee && (
        <Modal title="Detalle de movimiento" onClose={() => setSelectedStaffMovementId(null)} wide>
          <div className="movement-detail-modal">
            <div className="account-summary-grid">
              <div>
                <span>Monto</span>
                <strong>{selectedStaffMovementRow?.amount ? money(selectedStaffMovementRow.amount) : "-"}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(selectedStaffMovementRow?.totalAfter)}</strong>
              </div>
              <div>
                <span>Pendiente</span>
                <strong>{money(selectedStaffMovementRow?.pendingAfter)}</strong>
              </div>
              <div>
                <span>Usuario</span>
                <strong>{userDisplayName(data, selectedStaffMovement.userId)}</strong>
              </div>
            </div>
            <dl className="summary-detail-list">
              <div>
                <dt>Empleado</dt>
                <dd>{selectedEmployee.name}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDateTime(selectedStaffMovement.createdAt)}</dd>
              </div>
              <div>
                <dt>Concepto</dt>
                <dd>{movementConceptLabel(selectedStaffMovement.concept)}</dd>
              </div>
              <div>
                <dt>Origen</dt>
                <dd>{selectedStaffMovementSettlement?.origin === "CAJA" ? "Pago desde caja" : "Liquidacion administrativa"}</dd>
              </div>
              <div>
                <dt>Monto</dt>
                <dd>{money(selectedStaffMovement.amount)}</dd>
              </div>
              <div>
                <dt>Direccion</dt>
                <dd>{selectedStaffMovement.direction === "SALIDA" ? "Debito / salida" : "Credito / entrada"}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{selectedStaffMovement.status}</dd>
              </div>
              <div>
                <dt>Usuario movimiento</dt>
                <dd>{userDisplayName(data, selectedStaffMovement.userId)}</dd>
              </div>
              <div>
                <dt>Creado por</dt>
                <dd>{selectedStaffMovementSettlement?.createdByName ?? userDisplayName(data, selectedStaffMovementSettlement?.createdBy)}</dd>
              </div>
              <div>
                <dt>Aprobado por</dt>
                <dd>{selectedStaffMovementSettlement?.approvedByName ?? userDisplayName(data, selectedStaffMovementSettlement?.approvedBy)}</dd>
              </div>
              <div>
                <dt>Aprobado</dt>
                <dd>{selectedStaffMovementSettlement?.approvedAt ? formatDateTime(selectedStaffMovementSettlement.approvedAt) : "-"}</dd>
              </div>
              <div>
                <dt>Anulado por</dt>
                <dd>{selectedStaffMovementSettlement?.annulledByName ?? userDisplayName(data, selectedStaffMovementSettlement?.annulledBy)}</dd>
              </div>
              <div>
                <dt>Anulado</dt>
                <dd>{selectedStaffMovementSettlement?.annulledAt ? formatDateTime(selectedStaffMovementSettlement.annulledAt) : "-"}</dd>
              </div>
              <div>
                <dt>Recaudacion asociada</dt>
                <dd>{selectedStaffMovementBalance ? `${balanceVisibleId(data, selectedStaffMovementBalance)} - ${selectedStaffMovementBalance.operatingDate}` : "Sin recaudacion asociada"}</dd>
              </div>
              <div>
                <dt>Notas</dt>
                <dd>{selectedStaffMovementSettlement?.notes || selectedStaffMovement.detail || "-"}</dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}
      {editorId !== undefined && (
        <SalarySettlementEditor
          data={data}
          user={user}
          settlementId={editorId}
          defaultPeriod={defaultPeriod}
          fixedStaffId={editorStaffId ?? undefined}
          onClose={() => {
            setEditorId(undefined);
            setEditorStaffId(null);
          }}
          patchData={patchData}
          audit={audit}
        />
      )}
    </section>
  );
}

function monthRange(monthOffset: number) {
  const base = new Date(`${today()}T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const end = new Date(base.getFullYear(), base.getMonth() + monthOffset + 1, 0);
  const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { start: toInputDate(start), end: toInputDate(end) };
}

function accountTotalsFromMovements(movements: AccountMovement[]) {
  const activeMovements = movements.filter((movement) => movement.status === "ACTIVO");
  const income = activeMovements.filter((movement) => movement.direction === "ENTRADA").reduce((total, movement) => total + movement.amount, 0);
  const outcome = activeMovements.filter((movement) => movement.direction === "SALIDA").reduce((total, movement) => total + movement.amount, 0);
  return { income, outcome, balance: income - outcome, count: activeMovements.length };
}

function AdminCurrentAccounts({ data, user, effectiveRole, local }: { data: AppData; user: User; effectiveRole: Role; local: Local }) {
  const [query, setQuery] = useState("");
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [showMovementBalance, setShowMovementBalance] = useState(false);
  const currentRange = monthRange(0);
  const previousRange = monthRange(-1);
  const [periodMode, setPeriodMode] = useState<"current" | "previous" | "custom">("current");
  const [customStart, setCustomStart] = useState(currentRange.start);
  const [customEnd, setCustomEnd] = useState(currentRange.end);
  const activeRange = periodMode === "current" ? currentRange : periodMode === "previous" ? previousRange : { start: customStart, end: customEnd };
  const activeRangeLabel =
    periodMode === "current"
      ? "Mes actual"
      : periodMode === "previous"
        ? "Mes anterior"
        : `${activeRange.start || "-"} al ${activeRange.end || "-"}`;
  const scopedLocalIds = effectiveRole === "ENCARGADO" ? (user.localIds.length ? user.localIds : [local.id]) : data.locals.map((item) => item.id);
  const scopedLocalSet = new Set(scopedLocalIds);
  const accountInScope = (account: CurrentAccount) => {
    if (account.kind === "PERSONAL") return false;
    if (effectiveRole !== "ENCARGADO") return true;
    if (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") return Boolean(account.entityId && scopedLocalSet.has(account.entityId));
    return account.kind === "TRANSFERENCIAS";
  };
  const movementInScope = (movement: AccountMovement) => {
    const account = data.currentAccounts.find((item) => item.id === movement.accountId);
    if (!account || account.kind === "PERSONAL") return false;
    if (effectiveRole !== "ENCARGADO") return true;
    const balance = movement.balanceId ? data.balances.find((item) => item.id === movement.balanceId) : undefined;
    if (balance) return scopedLocalSet.has(balance.localId);
    if (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") return Boolean(account.entityId && scopedLocalSet.has(account.entityId));
    return false;
  };
  const movementInRange = (movement: AccountMovement) => {
    const movementDate = movement.createdAt.slice(0, 10);
    return (!activeRange.start || movementDate >= activeRange.start) && (!activeRange.end || movementDate <= activeRange.end);
  };
  const visibleMovements = data.accountMovements.filter((movement) => movementInScope(movement) && movementInRange(movement));
  const totalsForVisibleAccount = (accountId: string) => accountTotalsFromMovements(visibleMovements.filter((movement) => movement.accountId === accountId));
  const normalizedQuery = query.trim().toLowerCase();
  const scopedAccounts = data.currentAccounts.filter(accountInScope);
  const accounts = [...scopedAccounts]
    .filter((account) =>
      normalizedQuery
        ? [account.name, account.kind, account.status, account.entityId ?? ""].join(" ").toLowerCase().includes(normalizedQuery)
        : true,
    )
    .sort((a, b) => accountKindLabel(a.kind).localeCompare(accountKindLabel(b.kind), "es-UY") || a.name.localeCompare(b.name, "es-UY"));
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  useEffect(() => {
    if (!accounts.length) {
      if (selectedAccountId !== null) setSelectedAccountId(null);
      return;
    }
    if (!selectedAccountId || !accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts.map((account) => account.id).join("|"), selectedAccountId]);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];
  const selectedTotals = selectedAccount ? totalsForVisibleAccount(selectedAccount.id) : { income: 0, outcome: 0, balance: 0, count: 0 };
  const movements = selectedAccount
    ? visibleMovements
        .filter((movement) => movement.accountId === selectedAccount.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const openingBalance =
    selectedAccount && activeRange.start
      ? data.accountMovements
          .filter((movement) => movementInScope(movement) && movement.accountId === selectedAccount.id && movement.status === "ACTIVO" && movement.createdAt.slice(0, 10) < activeRange.start)
          .reduce((total, movement) => total + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount), 0)
      : 0;
  let runningBalance = openingBalance;
  const ledgerRows = [...movements]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((movement) => {
      const activeAmount = movement.status === "ACTIVO" ? movement.amount : 0;
      const debit = movement.direction === "SALIDA" ? activeAmount : 0;
      const credit = movement.direction === "ENTRADA" ? activeAmount : 0;
      runningBalance += credit - debit;
      return { movement, debit, credit, balance: runningBalance };
    })
    .reverse();
  const selectedMovementRow = ledgerRows.find((row) => row.movement.id === selectedMovementId);
  const selectedMovement = selectedMovementRow?.movement ?? null;
  const selectedMovementBalance = selectedMovement?.balanceId ? data.balances.find((balance) => balance.id === selectedMovement.balanceId) : undefined;

  return (
    <section className="admin-focus detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Libro interno de empleados, transferencias y cuentas por local en efectivo/banco.</p>
        </div>
        <div className="admin-header-actions">
          <span>{accounts.length} cuentas</span>
          <span>{visibleMovements.length} movimientos</span>
        </div>
      </div>

      <div className="accounts-period-bar">
        <div className="button-row">
          <button className={periodMode === "current" ? "button primary compact" : "button muted compact"} type="button" onClick={() => setPeriodMode("current")}>
            Mes actual
          </button>
          <button className={periodMode === "previous" ? "button primary compact" : "button muted compact"} type="button" onClick={() => setPeriodMode("previous")}>
            Mes anterior
          </button>
          <button className={periodMode === "custom" ? "button primary compact" : "button muted compact"} type="button" onClick={() => setPeriodMode("custom")}>
            Consulta historica
          </button>
        </div>
        <div className="accounts-date-range">
          <span>{activeRangeLabel}</span>
          {periodMode === "custom" && (
            <>
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </>
          )}
        </div>
      </div>

      <div className="accounts-layout">
        <aside className="accounts-list-panel">
          <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cuenta..." />
          <div className="account-selector-list">
            {accounts.map((account) => {
              const totals = totalsForVisibleAccount(account.id);
              return (
                <button
                  key={account.id}
                  className={account.id === selectedAccount?.id ? "account-selector active" : "account-selector"}
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <span>{accountKindLabel(account.kind)}</span>
                  <strong>{account.name}</strong>
                  <small>Saldo {money(totals.balance)}</small>
                </button>
              );
            })}
            {!accounts.length && <div className="empty-recent-cash">No hay cuentas para mostrar.</div>}
          </div>
        </aside>

        <section className="account-detail-panel">
          {selectedAccount ? (
            <>
              <div className="section-toolbar close-cash-toolbar">
                <div>
                  <h2>{selectedAccount.name}</h2>
                  <p>
                    {accountKindLabel(selectedAccount.kind)} - {selectedAccount.status}
                  </p>
                </div>
                <span className="close-status-pill">{selectedTotals.count} movimientos activos</span>
              </div>
              <div className="account-summary-grid">
                <div>
                  <span>Entradas</span>
                  <strong>{money(selectedTotals.income)}</strong>
                </div>
                <div>
                  <span>Salidas</span>
                  <strong>{money(selectedTotals.outcome)}</strong>
                </div>
                <div>
                  <span>Saldo</span>
                  <strong>{money(selectedTotals.balance)}</strong>
                </div>
              </div>
              <div className="table-wrap grow">
                <table className="data-table admin-data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Detalle</th>
                      <th>Usuario</th>
                      <th>Debito</th>
                      <th>Credito</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map(({ movement, debit, credit, balance }) => (
                      <tr
                        key={movement.id}
                        className={movement.status === "ANULADO" ? "status-inactive clickable-row" : "clickable-row"}
                        onClick={() => {
                          setSelectedMovementId(movement.id);
                          setShowMovementBalance(false);
                        }}
                      >
                        <td>{formatDateTime(movement.createdAt)}</td>
                        <td>{movement.sourceType}</td>
                        <td>{movement.detail || movement.concept || "-"}</td>
                        <td>{data.users.find((item) => item.id === movement.userId)?.name ?? movement.userId}</td>
                        <td>{debit ? money(debit) : "-"}</td>
                        <td>{credit ? money(credit) : "-"}</td>
                        <td>{money(balance)}</td>
                      </tr>
                    ))}
                    {!ledgerRows.length && (
                      <tr>
                        <td colSpan={7}>No hay movimientos para esta cuenta.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState title="Sin cuentas" text="Todavia no hay cuentas corrientes para mostrar." />
          )}
        </section>
      </div>
      {selectedMovement && (
        <Modal
          title={showMovementBalance ? `Recaudacion ${selectedMovementBalance ? balanceVisibleId(data, selectedMovementBalance) : ""}` : "Detalle de movimiento"}
          onClose={() => {
            setSelectedMovementId(null);
            setShowMovementBalance(false);
          }}
          wide
        >
          {showMovementBalance && selectedMovementBalance ? (
            <ClosedBalanceSummary data={data} balance={selectedMovementBalance} />
          ) : (
            <div className="movement-detail-modal">
              <div className="account-summary-grid">
                <div>
                  <span>Debito</span>
                  <strong>{selectedMovementRow?.debit ? money(selectedMovementRow.debit) : "-"}</strong>
                </div>
                <div>
                  <span>Credito</span>
                  <strong>{selectedMovementRow?.credit ? money(selectedMovementRow.credit) : "-"}</strong>
                </div>
                <div>
                  <span>Saldo</span>
                  <strong>{money(selectedMovementRow?.balance)}</strong>
                </div>
              </div>
              <dl className="summary-detail-list">
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatDateTime(selectedMovement.createdAt)}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{selectedMovement.sourceType}</dd>
                </div>
                <div>
                  <dt>Concepto</dt>
                  <dd>{selectedMovement.concept || "-"}</dd>
                </div>
                <div>
                  <dt>Detalle</dt>
                  <dd>{selectedMovement.detail || "-"}</dd>
                </div>
                <div>
                  <dt>Usuario</dt>
                  <dd>{data.users.find((item) => item.id === selectedMovement.userId)?.name ?? selectedMovement.userId}</dd>
                </div>
                <div>
                  <dt>Direccion original</dt>
                  <dd>{selectedMovement.direction}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{selectedMovement.status}</dd>
                </div>
                <div>
                  <dt>Recaudacion asociada</dt>
                  <dd>{selectedMovementBalance ? `${balanceVisibleId(data, selectedMovementBalance)} - ${selectedMovementBalance.operatingDate}` : "Sin recaudacion asociada"}</dd>
                </div>
              </dl>
              {selectedMovementBalance && (
                <div className="button-row end">
                  <button className="button primary compact" type="button" onClick={() => setShowMovementBalance(true)}>
                    Ver recaudacion completa
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}

function SalarySettlementEditor({
  data,
  user,
  settlementId,
  defaultPeriod,
  fixedStaffId,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  settlementId: string | null;
  defaultPeriod: string;
  fixedStaffId?: string;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = settlementId ? data.salarySettlements.find((settlement) => settlement.id === settlementId) : undefined;
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const [staffId, setStaffId] = useState(existing?.staffId ?? fixedStaffId ?? activeStaff[0]?.id ?? "");
  const selectedStaff = data.staff.find((staff) => staff.id === staffId);
  const defaultConcept = normalizeSalaryConcept(existing?.concept ?? "SALARIO");
  const defaultAmount = existing ? salarySettlementDisplayAmount(existing) : 0;
  const staffLocked = Boolean(fixedStaffId);
  const isNew = !existing;
  const [formError, setFormError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const staff = data.staff.find((item) => item.id === (fixedStaffId ?? String(form.get("staffId"))));
    if (!staff) return;
    const concept = normalizeSalaryConcept(form.get("concept") ?? "SALARIO");
    const amount = parseMoneyInput(form.get("amount"));
    if (!amount) {
      setFormError("Ingresa un monto para guardar la liquidacion.");
      return;
    }
    const period = String(form.get("period") || defaultPeriod);
    const salaryValidationError = validateSalarySettlementLimit(data, staff, period, concept, amount, existing?.id);
    if (salaryValidationError) {
      setFormError(salaryValidationError);
      return;
    }
    setFormError("");
    const { baseSalary, advances, extraAmount, extraConcept, aguinaldo, vacationSalary, otherDeductions, totalToPay } = salaryConceptBreakdown(concept, amount);
    const timestamp = nowIso();
    const next: SalarySettlement = {
      id: existing?.id ?? uid("salary-settlement"),
      period,
      staffId: staff.id,
      staffName: staffFullName(staff),
      localId: staff.localId,
      baseSalary,
      advances,
      extraAmount,
      extraConcept,
      aguinaldo,
      vacationSalary,
      otherDeductions,
      totalToPay,
      concept,
      notes: String(form.get("notes") ?? ""),
      status: existing?.status === "ANULADA" ? "ANULADA" : "CONFIRMADA",
      origin: existing?.origin ?? "LIQUIDACION",
      createdBy: existing?.createdBy ?? user.id,
      createdByName: existing?.createdByName ?? user.name,
      approvedBy: existing?.status === "ANULADA" ? existing.approvedBy : user.id,
      approvedByName: existing?.status === "ANULADA" ? existing.approvedByName : user.name,
      approvedAt: existing?.status === "ANULADA" ? existing.approvedAt : timestamp,
      annulledBy: existing?.annulledBy,
      annulledByName: existing?.annulledByName,
      annulledAt: existing?.annulledAt,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    patchData((current) => {
      const previous = current.salarySettlements.find((settlement) => settlement.id === next.id);
      const salarySettlements = isNew
        ? [next, ...current.salarySettlements]
        : current.salarySettlements.map((settlement) => (settlement.id === next.id ? next : settlement));
      const activeAdvanceBalance = salarySettlements
        .filter((settlement) => settlement.staffId === next.staffId && settlement.status !== "ANULADA" && settlement.concept === "ADELANTO")
        .reduce((total, settlement) => total + Number(settlement.advances ?? 0), 0);
      const staffUpdated = current.staff.map((staffItem) =>
        staffItem.id === next.staffId ? { ...staffItem, salaryAdvanceBalance: activeAdvanceBalance, updatedAt: nowIso() } : staffItem,
      );
      const currentAccounts = current.currentAccounts.some((account) => account.id === staffAccountId(staff.id))
        ? current.currentAccounts
        : [createStaffCurrentAccount(staff), ...current.currentAccounts];
      const withLocalAccounts = ensureLocalCurrentAccounts({ ...current, currentAccounts }, next.localId);
      const accountMovements = upsertAccountMovement(
        upsertAccountMovement(current.accountMovements, salaryAccountMovement(next, user.id)),
        localSalaryAccountMovement(next, user.id),
      );
      return audit(
        { ...current, currentAccounts: withLocalAccounts, accountMovements, salarySettlements, staff: staffUpdated },
        isNew ? "Crear liquidacion salario" : "Editar liquidacion salario",
        "LiquidacionSalario",
        next.id,
        previous ?? "",
        next,
      );
    });
    onClose();
  };

  return (
    <Modal title={isNew ? "Agregar liquidacion" : `Editar liquidacion ${existing?.period}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        {formError && <p className="notice warning span-2">{formError}</p>}
        <label>
          Mes
          <input name="period" type="month" defaultValue={existing?.period ?? defaultPeriod} required />
        </label>
        <label>
          Personal
          {staffLocked ? (
            <>
              <input value={selectedStaff ? `${selectedStaff.visibleId} - ${staffFullName(selectedStaff)}` : "Personal no disponible"} disabled />
              <input name="staffId" type="hidden" value={staffId} />
            </>
          ) : (
            <select name="staffId" value={staffId} onChange={(event) => setStaffId(event.target.value)} required>
              {activeStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.visibleId} - {staffFullName(staff)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          Concepto principal
          <select name="concept" defaultValue={defaultConcept}>
            {salaryConceptOptions.map((concept) => (
              <option key={concept} value={concept}>
                {salaryConceptLabel(concept)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Monto
          <input name="amount" inputMode="numeric" defaultValue={moneyInputValue(defaultAmount)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
        </label>
        <label className="span-2">
          Notas
          <textarea name="notes" rows={3} defaultValue={existing?.notes} placeholder="Detalle del pago, observaciones o motivo." />
        </label>
        <InfoCard
          tone="blue"
          title="Liquidacion"
          lines={["Salario, adelanto y descuento bajan pendiente.", "Extras y bonos aumentan el total del periodo."]}
        />
        <InfoCard
          tone="green"
          title="Empleado"
          lines={[selectedStaff ? staffFullName(selectedStaff) : "Sin empleado", `Salario nominal: ${money(selectedStaff?.nominalSalary)}`, `Adelantos actuales: ${money(selectedStaff?.salaryAdvanceBalance)}`]}
        />
        <div className="form-actions span-2">
          <div className="button-row end">
            <button className="button muted" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button success" type="submit">
              Guardar liquidacion
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AdminStaff({
  data,
  user,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<SortState<"visibleId" | "name" | "position" | "local" | "status" | "salary">>({ key: "visibleId", direction: "asc" });
  const activeStaff = data.staff.filter((staff) => staff.status !== "PAPELERA");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? activeStaff.filter((staff) =>
        [staff.visibleId, staffFullName(staff), staff.documentId, staff.phone, staff.position, localName(data, staff.localId), staff.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : activeStaff;
  const staffValue = (staff: StaffMember, key: typeof sort.key): string | number => {
    if (key === "visibleId") return Number(staff.visibleId);
    if (key === "name") return staffFullName(staff);
    if (key === "position") return staff.position;
    if (key === "local") return localName(data, staff.localId);
    if (key === "salary") return staff.nominalSalary;
    return staff.status;
  };
  const rows = [...filtered].sort((a, b) => {
    const result = compareValues(staffValue(a, sort.key), staffValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const sendToTrash = (staff: StaffMember) => {
    if (!confirmAction(`Enviar a papelera a ${staffFullName(staff)}?`)) return;
    patchData((current) => {
      const previous = current.staff.find((item) => item.id === staff.id);
      const nextStaff = current.staff.map((item) => (item.id === staff.id ? { ...item, status: "PAPELERA" as StaffStatus, deletedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = nextStaff.find((item) => item.id === staff.id);
      return audit({ ...current, staff: nextStaff }, "Enviar personal a papelera", "Personal", staff.id, previous, next);
    });
  };
  const markTerminated = (staff: StaffMember) => {
    if (!confirmAction(`Dar de baja a ${staffFullName(staff)}?`)) return;
    patchData((current) => {
      const previous = current.staff.find((item) => item.id === staff.id);
      const nextStaff = current.staff.map((item) => (item.id === staff.id ? { ...item, status: "BAJA" as StaffStatus, terminatedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = nextStaff.find((item) => item.id === staff.id);
      return audit({ ...current, staff: nextStaff }, "Dar de baja personal", "Personal", staff.id, previous, next);
    });
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">Gestion de empleados, horarios, salario, aguinaldo, salario vacacional y vacaciones.</p>
        </div>
        <div className="admin-header-actions">
          <span>{activeStaff.length} personas</span>
          <button className="button success compact" onClick={() => setEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personal, cargo, documento..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {[
                ["visibleId", "ID"],
                ["name", "Nombre"],
                ["position", "Cargo"],
                ["local", "Local"],
                ["salary", "Salario"],
                ["status", "Estado"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                    {label}
                    {sortIndicator(sort, key as typeof sort.key)}
                  </button>
                </th>
              ))}
              <th>Vacaciones</th>
              <th>Aguinaldo est.</th>
              <th>Sal. vacacional est.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((staff) => (
              <tr key={staff.id} className={staffStatusClass(staff.status)}>
                <td>{staff.visibleId}</td>
                <td>{staffFullName(staff)}</td>
                <td>{staff.position}</td>
                <td>{localName(data, staff.localId)}</td>
                <td>{money(staff.nominalSalary)}</td>
                <td>{staff.status}</td>
                <td>{staff.usedVacationDays}/{staff.vacationDays}</td>
                <td>{money(staff.estimatedAguinaldo)}</td>
                <td>{money(staff.estimatedVacationSalary)}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => setEditorId(staff.id)}>
                      Editar
                    </button>
                    {staff.status === "ACTIVO" && (
                      <button className="button muted compact" onClick={() => markTerminated(staff)}>
                        Baja
                      </button>
                    )}
                    <button className="button muted compact" onClick={() => sendToTrash(staff)}>
                      Papelera
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10}>No hay personal para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <StaffEditor
          data={data}
          user={user}
          staffId={editorId}
          onClose={() => setEditorId(undefined)}
          patchData={patchData}
          audit={audit}
        />
      )}
    </section>
  );
}

function StaffEditor({
  data,
  user,
  staffId,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  staffId: string | null;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = staffId ? data.staff.find((staff) => staff.id === staffId) : undefined;
  const isNew = !existing;
  const [schedule, setSchedule] = useState<StaffSchedule[]>(existing?.schedule ?? defaultSchedule);
  const salaryHistory = existing
    ? data.salaryHistories
        .filter((history) => history.staffId === existing.id)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt))
    : [];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nominalSalary = parseMoneyInput(form.get("nominalSalary"));
    const vacationDays = asNumber(form.get("vacationDays")) || 20;
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const position = String(form.get("position") ?? "").trim();
    const localId = String(form.get("localId") ?? "");
    const salaryType = String(form.get("salaryType") ?? "") as SalaryType;
    const status = String(form.get("status") ?? "") as StaffStatus;
    if (!firstName || !lastName || !position || !localId || !salaryType || !status || !nominalSalary) return;
    const next: StaffMember = {
      id: existing?.id ?? uid("staff"),
      visibleId: existing?.visibleId ?? nextShortId(data.staff.map((staff) => staff.visibleId)),
      firstName,
      lastName,
      documentId: sanitizeDigits(String(form.get("documentId") ?? ""), 12),
      address: String(form.get("address") ?? ""),
      phone: sanitizeDigits(String(form.get("phone") ?? ""), 20),
      email: String(form.get("email") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      hireDate: String(form.get("hireDate") ?? today()),
      position,
      localId,
      salaryType,
      nominalSalary,
      salaryAdvanceBalance: parseMoneyInput(form.get("salaryAdvanceBalance")),
      vacationDays,
      usedVacationDays: asNumber(form.get("usedVacationDays")),
      estimatedAguinaldo: Math.round(nominalSalary / 12),
      estimatedVacationSalary: Math.round((nominalSalary / 30) * vacationDays),
      emergencyContact: String(form.get("emergencyContact") ?? ""),
      bankAccount: String(form.get("bankAccount") ?? ""),
      schedule,
      notes: String(form.get("notes") ?? ""),
      status,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      terminatedAt: existing?.terminatedAt,
      deletedAt: existing?.deletedAt,
    };
    const salaryChanged = !existing || existing.salaryType !== next.salaryType || Number(existing.nominalSalary ?? 0) !== next.nominalSalary;
    const effectiveDate = String(form.get("salaryEffectiveDate") || today());
    const salaryReason = String(form.get("salaryReason") ?? "").trim() || (isNew ? "Alta inicial de salario" : "Cambio salarial");
    const salaryHistoryEntry = salaryChanged
      ? salaryHistoryEvent(
          next,
          existing?.salaryType ?? next.salaryType,
          Number(existing?.nominalSalary ?? next.nominalSalary),
          next.salaryType,
          next.nominalSalary,
          effectiveDate,
          salaryReason,
          user.id,
          user.name,
        )
      : null;
    patchData((current) => {
      const previous = current.staff.find((staff) => staff.id === next.id);
      const staff = isNew ? [next, ...current.staff] : current.staff.map((item) => (item.id === next.id ? next : item));
      const salaryHistories = salaryHistoryEntry ? [salaryHistoryEntry, ...current.salaryHistories] : current.salaryHistories;
      return audit({ ...current, staff, salaryHistories }, isNew ? "Crear personal" : "Editar personal", "Personal", next.id, previous ?? "", next, salaryHistoryEntry?.reason);
    });
    onClose();
  };
  const updateSchedule = (day: WeekDay, patch: Partial<StaffSchedule>) => {
    setSchedule((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  };

  return (
    <Modal title={isNew ? "Agregar personal" : `Editar ${staffFullName(existing)}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <p className="required-note span-2">Campos obligatorios marcados con *</p>
        <label>
          Nombre *
          <input name="firstName" defaultValue={existing?.firstName} required />
        </label>
        <label>
          Apellido *
          <input name="lastName" defaultValue={existing?.lastName} required />
        </label>
        <label>
          Documento
          <input name="documentId" defaultValue={existing?.documentId} onChange={(event) => (event.currentTarget.value = sanitizeDigits(event.currentTarget.value, 12))} />
        </label>
        <label>
          Telefono
          <input name="phone" defaultValue={existing?.phone} onChange={(event) => (event.currentTarget.value = sanitizeDigits(event.currentTarget.value, 20))} />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={existing?.email} />
        </label>
        <label>
          Fecha nacimiento
          <input name="birthDate" type="date" defaultValue={existing?.birthDate} />
        </label>
        <label className="span-2">
          Direccion
          <input name="address" defaultValue={existing?.address} />
        </label>
        <label>
          Cargo *
          <select name="position" defaultValue={existing?.position ?? ""} required>
            <option value="" disabled>
              Seleccionar cargo
            </option>
            <option value="Cajera/o">Cajera/o</option>
            <option value="Encargado/a">Encargado/a</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Limpieza">Limpieza</option>
          </select>
        </label>
        <label>
          Local *
          <select name="localId" defaultValue={existing?.localId ?? POSEIDON_LOCAL_ID} required>
            {data.locals.map((local) => (
              <option key={local.id} value={local.id}>
                {localOptionName(local)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha ingreso
          <input name="hireDate" type="date" defaultValue={existing?.hireDate ?? today()} />
        </label>
        <label>
          Estado *
          <select name="status" defaultValue={existing?.status ?? "ACTIVO"} required>
            <option value="ACTIVO">Activo</option>
            <option value="BAJA">Baja</option>
            <option value="PAPELERA">Papelera</option>
          </select>
        </label>
        <label>
          Tipo salario *
          <select name="salaryType" defaultValue={existing?.salaryType ?? "MENSUAL"} required>
            <option value="MENSUAL">Mensual</option>
            <option value="JORNAL">Jornal</option>
            <option value="HORA">Hora</option>
          </select>
        </label>
        <label>
          Salario base *
          <input name="nominalSalary" inputMode="numeric" defaultValue={moneyInputValue(existing?.nominalSalary)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
        </label>
        <label>
          Fecha efectiva salario
          <input name="salaryEffectiveDate" type="date" defaultValue={today()} />
        </label>
        <label className="span-2">
          Motivo cambio salarial
          <input name="salaryReason" placeholder="Recomendado si cambia tipo o salario base" />
        </label>
        <label>
          Adelantos acumulados
          <input name="salaryAdvanceBalance" inputMode="numeric" defaultValue={moneyInputValue(existing?.salaryAdvanceBalance)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Dias vacaciones
          <input name="vacationDays" type="number" min="0" defaultValue={existing?.vacationDays ?? 20} />
        </label>
        <label>
          Vacaciones usadas
          <input name="usedVacationDays" type="number" min="0" defaultValue={existing?.usedVacationDays ?? 0} />
        </label>
        <label>
          Contacto emergencia
          <input name="emergencyContact" defaultValue={existing?.emergencyContact} />
        </label>
        <label>
          Cuenta bancaria
          <input name="bankAccount" defaultValue={existing?.bankAccount} />
        </label>
        <section className="embedded-panel span-2">
          <div className="admin-header">
            <div>
              <h3>Dias y horarios</h3>
              <p className="helper">Base operativa. Los calculos legales finales se agregan en el modulo de salarios.</p>
            </div>
          </div>
          <div className="schedule-grid">
            {schedule.map((item) => (
              <div key={item.day}>
                <strong>{item.day}</strong>
                <label>
                  Descanso
                  <input type="checkbox" checked={item.rest} onChange={(event) => updateSchedule(item.day, { rest: event.target.checked })} />
                </label>
                <input value={item.start} onChange={(event) => updateSchedule(item.day, { start: event.target.value })} placeholder="Inicio" disabled={item.rest} />
                <input value={item.end} onChange={(event) => updateSchedule(item.day, { end: event.target.value })} placeholder="Fin" disabled={item.rest} />
              </div>
            ))}
          </div>
        </section>
        <section className="embedded-panel span-2">
          <div className="section-toolbar">
            <div>
              <h3>Historial salarial</h3>
              <p>Registro de cambios de tipo y salario base.</p>
            </div>
            <span className="close-status-pill">{salaryHistory.length} cambio(s)</span>
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Fecha efectiva</th>
                  <th>Tipo anterior</th>
                  <th>Tipo nuevo</th>
                  <th>Salario anterior</th>
                  <th>Salario nuevo</th>
                  <th>Usuario</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map((history) => (
                  <tr key={history.id}>
                    <td>{history.effectiveDate}</td>
                    <td>{history.previousSalaryType}</td>
                    <td>{history.newSalaryType}</td>
                    <td>{money(history.previousNominalSalary)}</td>
                    <td>{money(history.newNominalSalary)}</td>
                    <td>{history.userName}</td>
                    <td>{history.reason || "-"}</td>
                  </tr>
                ))}
                {!salaryHistory.length && (
                  <tr>
                    <td colSpan={7}>Todavia no hay cambios salariales registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <label className="span-2">
          Notas
          <textarea name="notes" defaultValue={existing?.notes} rows={3} />
        </label>
        <div className="form-actions span-2">
          <div className="button-row end">
            <button className="button muted" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button success" type="submit">
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AdminClients({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<SortState<"visibleId" | "name" | "document" | "category" | "local" | "status">>({ key: "visibleId", direction: "asc" });
  const activeClients = data.clients.filter((client) => client.status !== "PAPELERA");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? activeClients.filter((client) =>
        [
          client.visibleId,
          client.name,
          clientDocumentSearchText(client),
          fileMetaLabel(client.photoFile),
          fileMetaLabel(client.identityDocumentFile),
          client.phone,
          client.email,
          client.category,
          localName(data, client.localId),
          client.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : activeClients;
  const clientValue = (client: Client, key: typeof sort.key): string | number => {
    if (key === "visibleId") return Number(client.visibleId);
    if (key === "document") return clientDocumentKey(normalizeClientDocumentType(client.documentType), client.documentId);
    if (key === "local") return localName(data, client.localId);
    return client[key];
  };
  const rows = [...filtered].sort((a, b) => {
    const result = compareValues(clientValue(a, sort.key), clientValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const sendToTrash = (client: Client) => {
    if (!confirmAction(`Enviar a papelera a ${client.name}?`)) return;
    patchData((current) => {
      const previous = current.clients.find((item) => item.id === client.id);
      const clients = current.clients.map((item) => (item.id === client.id ? { ...item, status: "PAPELERA" as ClientStatus, deletedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = clients.find((item) => item.id === client.id);
      return audit({ ...current, clients }, "Enviar cliente a papelera", "Cliente", client.id, previous, next);
    });
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">Listado para asociar regalos, transferencias y futuras acciones comerciales.</p>
        </div>
        <div className="admin-header-actions">
          <span>{activeClients.length} clientes</span>
          <button className="button success compact" onClick={() => setEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, documento, telefono..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {[
                ["visibleId", "ID"],
                ["name", "Cliente"],
                ["document", "Documento"],
                ["category", "Categoria"],
                ["local", "Local"],
                ["status", "Estado"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                    {label}
                    {sortIndicator(sort, key as typeof sort.key)}
                  </button>
                </th>
              ))}
              <th>Telefono</th>
              <th>Email</th>
              <th>Foto</th>
              <th>Cedula</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client) => (
              <tr key={client.id} className={clientStatusClass(client.status)}>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{clientDocumentLabel(client)}</td>
                <td>{client.category}</td>
                <td>{localName(data, client.localId)}</td>
                <td>{client.status}</td>
                <td>{client.phone || "-"}</td>
                <td>{client.email || "-"}</td>
                <td>{fileMetaLabel(client.photoFile)}</td>
                <td>{fileMetaLabel(client.identityDocumentFile)}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => setEditorId(client.id)}>
                      Editar
                    </button>
                    <button className="button muted compact" onClick={() => sendToTrash(client)}>
                      Papelera
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={11}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <ClientEditor data={data} clientId={editorId} onClose={() => setEditorId(undefined)} patchData={patchData} audit={audit} />
      )}
    </section>
  );
}

function ClientEditor({
  data,
  clientId,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  clientId: string | null;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = clientId ? data.clients.find((client) => client.id === clientId) : undefined;
  const isNew = !existing;
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState<ClientDocumentType>(normalizeClientDocumentType(existing?.documentType));
  const [documentDraft, setDocumentDraft] = useState(normalizeClientDocument(normalizeClientDocumentType(existing?.documentType), existing?.documentId ?? ""));
  const [photoFile, setPhotoFile] = useState<StoredFileMeta | undefined>(existing?.photoFile);
  const [identityDocumentFile, setIdentityDocumentFile] = useState<StoredFileMeta | undefined>(existing?.identityDocumentFile);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const nextDocumentType = normalizeClientDocumentType(form.get("documentType"));
    const documentId = normalizeClientDocument(nextDocumentType, String(form.get("documentId") ?? ""));
    if (!name) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!documentId) {
      setError("El documento es obligatorio.");
      return;
    }
    if (hasClientDocumentDuplicate(data.clients, nextDocumentType, documentId, existing?.id)) {
      setError("Ya existe un cliente activo o inactivo con ese documento.");
      return;
    }
    const next: Client = {
      id: existing?.id ?? uid("client"),
      visibleId: existing?.visibleId ?? nextShortId(data.clients.map((client) => client.visibleId)),
      name,
      documentType: nextDocumentType,
      documentId,
      photoFile,
      identityDocumentFile,
      phone: sanitizeDigits(String(form.get("phone") ?? ""), 20),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      localId: String(form.get("localId") ?? POSEIDON_LOCAL_ID),
      category: String(form.get("category") ?? "GENERAL") as Client["category"],
      notes: String(form.get("notes") ?? ""),
      status: String(form.get("status") ?? "ACTIVO") as ClientStatus,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      deletedAt: existing?.deletedAt,
    };
    patchData((current) => {
      const previous = current.clients.find((client) => client.id === next.id);
      const clients = isNew ? [next, ...current.clients] : current.clients.map((item) => (item.id === next.id ? next : item));
      return audit({ ...current, clients }, isNew ? "Crear cliente" : "Editar cliente", "Cliente", next.id, previous ?? "", next);
    });
    onClose();
  };
  return (
    <Modal title={isNew ? "Agregar cliente" : `Editar ${existing?.name}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Nombre
          <input name="name" defaultValue={existing?.name} required />
        </label>
        <label>
          Categoria
          <select name="category" defaultValue={existing?.category ?? "GENERAL"}>
            <option value="GENERAL">General</option>
            <option value="FRECUENTE">Frecuente</option>
            <option value="VIP">VIP</option>
          </select>
        </label>
        <label>
          Tipo documento
          <select
            name="documentType"
            value={documentType}
            onChange={(event) => {
              const nextType = normalizeClientDocumentType(event.currentTarget.value);
              setDocumentType(nextType);
              setDocumentDraft((current) => normalizeClientDocument(nextType, current));
              setError("");
            }}
          >
            <option value="CEDULA">Cedula</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </label>
        <label>
          Documento
          <input
            name="documentId"
            value={documentDraft}
            inputMode={documentType === "CEDULA" ? "numeric" : "text"}
            placeholder={documentType === "CEDULA" ? "Numero de cedula" : "Numero de pasaporte"}
            onChange={(event) => {
              setDocumentDraft(normalizeClientDocument(documentType, event.currentTarget.value));
              setError("");
            }}
            required
          />
        </label>
        <label>
          Foto
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) setPhotoFile(readUploadFile(file));
              event.currentTarget.value = "";
            }}
          />
          <span className="helper">{fileMetaLabel(photoFile)}</span>
        </label>
        <label>
          Cedula / pasaporte
          <input
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) setIdentityDocumentFile(readUploadFile(file));
              event.currentTarget.value = "";
            }}
          />
          <span className="helper">{fileMetaLabel(identityDocumentFile)}</span>
        </label>
        <label>
          Telefono
          <input name="phone" defaultValue={existing?.phone} onChange={(event) => (event.currentTarget.value = sanitizeDigits(event.currentTarget.value, 20))} />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={existing?.email} />
        </label>
        <label>
          Fecha nacimiento
          <input name="birthDate" type="date" defaultValue={existing?.birthDate} />
        </label>
        <label>
          Local de referencia
          <select name="localId" defaultValue={existing?.localId ?? POSEIDON_LOCAL_ID}>
            {data.locals.map((local) => (
              <option key={local.id} value={local.id}>
                {localOptionName(local)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select name="status" defaultValue={existing?.status ?? "ACTIVO"}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="PAPELERA">Papelera</option>
          </select>
        </label>
        <label className="span-2">
          Direccion
          <input name="address" defaultValue={existing?.address} />
        </label>
        <label className="span-2">
          Notas
          <textarea name="notes" defaultValue={existing?.notes} rows={3} />
        </label>
        {error && <p className="validation error span-2">{error}</p>}
        <div className="form-actions span-2">
          <div className="button-row end">
            <button className="button muted" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button success" type="submit">
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AdminTrash({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const trashedStaff = data.staff.filter((staff) => staff.status === "PAPELERA");
  const trashedClients = data.clients.filter((client) => client.status === "PAPELERA");
  const restoreStaff = (staff: StaffMember) => {
    patchData((current) => {
      const previous = current.staff.find((item) => item.id === staff.id);
      const nextStaff = current.staff.map((item) => (item.id === staff.id ? { ...item, status: "BAJA" as StaffStatus, deletedAt: undefined, updatedAt: nowIso() } : item));
      const next = nextStaff.find((item) => item.id === staff.id);
      return audit({ ...current, staff: nextStaff }, "Restaurar personal", "Personal", staff.id, previous, next);
    });
  };
  const restoreClient = (client: Client) => {
    const documentType = normalizeClientDocumentType(client.documentType);
    const documentId = normalizeClientDocument(documentType, client.documentId);
    if (!documentId) {
      window.alert("No se puede restaurar: el cliente no tiene documento.");
      return;
    }
    if (hasClientDocumentDuplicate(data.clients, documentType, documentId, client.id)) {
      window.alert("No se puede restaurar: ya existe otro cliente activo o inactivo con ese documento.");
      return;
    }
    patchData((current) => {
      const previous = current.clients.find((item) => item.id === client.id);
      const clients = current.clients.map((item) => (item.id === client.id ? { ...item, status: "INACTIVO" as ClientStatus, deletedAt: undefined, updatedAt: nowIso() } : item));
      const next = clients.find((item) => item.id === client.id);
      return audit({ ...current, clients }, "Restaurar cliente", "Cliente", client.id, previous, next);
    });
  };
  const deleteStaff = (staff: StaffMember) => {
    if (!confirmAction(`Eliminar definitivamente a ${staffFullName(staff)}?`)) return;
    patchData((current) => audit({ ...current, staff: current.staff.filter((item) => item.id !== staff.id) }, "Eliminar definitivo personal", "Personal", staff.id, staff, ""));
  };
  const deleteClient = (client: Client) => {
    if (!confirmAction(`Eliminar definitivamente a ${client.name}?`)) return;
    patchData((current) => audit({ ...current, clients: current.clients.filter((item) => item.id !== client.id) }, "Eliminar definitivo cliente", "Cliente", client.id, client, ""));
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <h2>Papelera</h2>
          <p className="helper">Todo pasa por aca antes de eliminarse definitivamente.</p>
        </div>
        <span>{trashedStaff.length + trashedClients.length} elementos</span>
      </div>
      <section className="embedded-panel">
        <h3>Personal</h3>
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Eliminado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {trashedStaff.map((staff) => (
                <tr key={staff.id} className="status-disused">
                  <td>{staff.visibleId}</td>
                  <td>{staffFullName(staff)}</td>
                  <td>{staff.position}</td>
                  <td>{staff.deletedAt ? formatDateTime(staff.deletedAt) : "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="button primary compact" onClick={() => restoreStaff(staff)}>
                        Restaurar
                      </button>
                      <button className="button muted compact" onClick={() => deleteStaff(staff)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!trashedStaff.length && (
                <tr>
                  <td colSpan={5}>No hay personal en papelera.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="embedded-panel">
        <h3>Clientes</h3>
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Eliminado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {trashedClients.map((client) => (
                <tr key={client.id} className="status-disused">
                  <td>{client.visibleId}</td>
                  <td>{client.name}</td>
                  <td>{clientDocumentLabel(client)}</td>
                  <td>{client.category}</td>
                  <td>{client.deletedAt ? formatDateTime(client.deletedAt) : "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="button primary compact" onClick={() => restoreClient(client)}>
                        Restaurar
                      </button>
                      <button className="button muted compact" onClick={() => deleteClient(client)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!trashedClients.length && (
                <tr>
                  <td colSpan={6}>No hay clientes en papelera.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function AdminUsers({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [visibleColumns, setVisibleColumns] = useState<UserColumnKey[]>(() => readColumnPreference(USER_COLUMNS_STORAGE_KEY, userColumns, fixedUserColumns));
  const [sort, setSort] = useState<SortState<UserColumnKey>>({ key: "name", direction: "asc" });
  useEffect(() => {
    localStorage.setItem(USER_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const toggleColumn = (key: UserColumnKey) => {
    setVisibleColumns((current) => {
      if (fixedUserColumns.includes(key)) return current;
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  };
  const userSortValue = (item: User, key: UserColumnKey): string | number => {
    if (key === "role") return roleLabels[item.role];
    if (key === "locals") return item.localIds.length;
    if (key === "actions") return "";
    return item[key] ?? "";
  };
  const sortedUsers = [...data.users].sort((a, b) => {
    const result = compareValues(userSortValue(a, sort.key), userSortValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const visibleUserColumns = userColumns.filter((column) => visibleColumns.includes(column.key));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user: User = {
      id: uid("user"),
      name: String(form.get("name")),
      username: String(form.get("username")),
      password: String(form.get("password") || "poseidon123"),
      role: String(form.get("role")) as Role,
      status: "ACTIVO",
      localIds: [POSEIDON_LOCAL_ID],
    };
    if (!user.name.trim() || !user.username.trim()) return;
    if (!confirmAction(`Confirmar creacion del usuario ${user.name}?`)) return;
    patchData((current) => audit({ ...current, users: [...current.users, user] }, "Crear usuario", "Usuario", user.id, "", user));
    event.currentTarget.reset();
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">Alta rapida y vista configurable de usuarios del sistema.</p>
        </div>
        <div className="admin-header-actions">
          <span>{data.users.length} usuarios</span>
        </div>
      </div>
      <div className="admin-layout users-admin-layout">
        <section className="form-card compact-form">
          <h2>Crear usuario</h2>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Nombre
              <input name="name" required />
            </label>
            <label>
              Login
              <input name="username" required />
            </label>
            <label>
              Contrasena
              <input name="password" placeholder="poseidon123" />
            </label>
            <label>
              Rol
              <select name="role">
                <option value="CAJERO">Cajero</option>
                <option value="ENCARGADO">Encargado</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </label>
            <button className="button success compact" type="submit">
              Guardar
            </button>
          </form>
        </section>
        <section className="table-panel">
          <ColumnChooser label="Columnas" columns={userColumns} visible={visibleColumns} fixed={fixedUserColumns} onToggle={toggleColumn} />
          <div className="table-wrap grow">
            <table className="data-table admin-data-table user-data-table">
              <thead>
                <tr>
                  {visibleUserColumns.map((column) => (
                    <th key={column.key}>
                      {column.sortable ? (
                        <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                          {column.label}
                          {sortIndicator(sort, column.key)}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((item) => (
                  <tr key={item.id} className={item.status === "ACTIVO" ? "status-active" : "status-inactive"}>
                    {visibleColumns.includes("name") && <td>{item.name}</td>}
                    {visibleColumns.includes("username") && <td>{item.username}</td>}
                    {visibleColumns.includes("role") && <td>{roleLabels[item.role]}</td>}
                    {visibleColumns.includes("status") && <td>{item.status}</td>}
                    {visibleColumns.includes("locals") && <td>{item.localIds.map((localId) => localName(data, localId)).join(", ")}</td>}
                    {visibleColumns.includes("actions") && <td className="muted-cell">Edicion futura</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function AdminExpenseCategories({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, string>>({});

  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    const category: ExpenseCategory = { id: uid("expense-cat"), name, subcategories: [], status: "ACTIVA" };
    patchData((current) =>
      audit({ ...current, expenseCategories: [...current.expenseCategories, category] }, "Crear categoria gasto", "CategoriaGasto", category.id, "", category),
    );
    setCategoryName("");
  };

  const addSubcategory = (category: ExpenseCategory) => {
    const name = (subcategoryDrafts[category.id] ?? "").trim();
    if (!name || category.subcategories.includes(name)) return;
    patchData((current) => {
      const previous = current.expenseCategories.find((item) => item.id === category.id);
      const expenseCategories = current.expenseCategories.map((item) =>
        item.id === category.id ? { ...item, subcategories: [...item.subcategories, name] } : item,
      );
      return audit({ ...current, expenseCategories }, "Crear subcategoria gasto", "CategoriaGasto", category.id, previous, { subcategory: name });
    });
    setSubcategoryDrafts((current) => ({ ...current, [category.id]: "" }));
  };

  const removeSubcategory = (category: ExpenseCategory, subcategory: string) => {
    if (!confirmAction(`Quitar subcategoria ${subcategory}?`)) return;
    patchData((current) => {
      const previous = current.expenseCategories.find((item) => item.id === category.id);
      const expenseCategories = current.expenseCategories.map((item) =>
        item.id === category.id ? { ...item, subcategories: item.subcategories.filter((name) => name !== subcategory) } : item,
      );
      return audit({ ...current, expenseCategories }, "Quitar subcategoria gasto", "CategoriaGasto", category.id, previous, { subcategory });
    });
  };

  const toggleCategory = (category: ExpenseCategory) => {
    patchData((current) => {
      const nextStatus: ExpenseCategory["status"] = category.status === "ACTIVA" ? "INACTIVA" : "ACTIVA";
      const expenseCategories = current.expenseCategories.map((item) => (item.id === category.id ? { ...item, status: nextStatus } : item));
      return audit({ ...current, expenseCategories }, "Cambiar estado categoria gasto", "CategoriaGasto", category.id, category, { status: nextStatus });
    });
  };

  const removeCategory = (category: ExpenseCategory) => {
    const used = data.expenses.some((expense) => expense.category === category.name);
    if (used) return;
    if (!confirmAction(`Quitar categoria ${category.name}?`)) return;
    patchData((current) =>
      audit(
        { ...current, expenseCategories: current.expenseCategories.filter((item) => item.id !== category.id) },
        "Quitar categoria gasto",
        "CategoriaGasto",
        category.id,
        category,
        "",
      ),
    );
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">El cajero solo puede cargar gastos usando estas categorias y subcategorias.</p>
        </div>
        <span>{data.expenseCategories.length} categorias</span>
      </div>
      <form className="toolbar-row" onSubmit={addCategory}>
        <input className="search-input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nueva categoria" />
        <button className="button success compact" type="submit">
          Agregar
        </button>
      </form>
      <div className="category-admin-grid">
        {data.expenseCategories.map((category) => {
          const used = data.expenses.some((expense) => expense.category === category.name);
          return (
            <article className="category-card" key={category.id}>
              <div className="admin-header">
                <div>
                  <h3>{category.name}</h3>
                  <p className="helper">{category.status}</p>
                </div>
                <div className="table-actions">
                  <button className="button muted compact" type="button" onClick={() => toggleCategory(category)}>
                    {category.status === "ACTIVA" ? "Inactivar" : "Activar"}
                  </button>
                  <button className="button danger compact" type="button" disabled={used} onClick={() => removeCategory(category)}>
                    Quitar
                  </button>
                </div>
              </div>
              <div className="tag-list">
                {category.subcategories.map((subcategory) => (
                  <span key={subcategory}>
                    {subcategory}
                    <button type="button" onClick={() => removeSubcategory(category, subcategory)}>
                      x
                    </button>
                  </span>
                ))}
                {!category.subcategories.length && <p className="helper">Sin subcategorias.</p>}
              </div>
              <div className="toolbar-row">
                <input
                  value={subcategoryDrafts[category.id] ?? ""}
                  onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [category.id]: event.target.value }))}
                  placeholder="Nueva subcategoria"
                />
                <button className="button primary compact" type="button" onClick={() => addSubcategory(category)}>
                  Agregar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type MachineModalState = {
  machineId: string | null;
  localId?: string;
};

type LocalHistoryTab = "resumen" | "datos" | "maquinas" | "estados" | "recaudaciones" | "auditoria";
type MachineHistoryTab = "resumen" | "locales" | "contadores" | "auditoria";
type SortDirection = "asc" | "desc";
type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
};
type LocalColumnKey =
  | "id"
  | "name"
  | "tenantName"
  | "phone"
  | "email"
  | "address"
  | "google"
  | "status"
  | "machines"
  | "images"
  | "balances"
  | "actions";
type MachineColumnKey = "visibleId" | "name" | "local" | "location" | "status" | "lastIn" | "lastOut" | "notes" | "actions";
type UserColumnKey = "name" | "username" | "role" | "status" | "locals" | "actions";
type BalanceColumnKey =
  | "operatingDate"
  | "local"
  | "status"
  | "initialFund"
  | "declaredCash"
  | "nextBase"
  | "withdrawal"
  | "cashDifference"
  | "openedBy"
  | "closedBy"
  | "actions";

type TableColumn<Key extends string> = {
  key: Key;
  label: string;
  sortable?: boolean;
};

const LOCAL_COLUMNS_STORAGE_KEY = "poseidon-locales-columnas-v2";
const MACHINE_COLUMNS_STORAGE_KEY = "poseidon-maquinas-columnas-v2";
const USER_COLUMNS_STORAGE_KEY = "poseidon-usuarios-columnas-v1";
const BALANCE_COLUMNS_STORAGE_KEY = "poseidon-caja-diaria-columnas-v1";

const localColumns: TableColumn<LocalColumnKey>[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Local", sortable: true },
  { key: "tenantName", label: "Locatario", sortable: true },
  { key: "phone", label: "Telefono", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "address", label: "Direccion", sortable: true },
  { key: "google", label: "Google" },
  { key: "status", label: "Estado", sortable: true },
  { key: "machines", label: "Maquinas", sortable: true },
  { key: "images", label: "Imagenes", sortable: true },
  { key: "balances", label: "Recaudaciones", sortable: true },
  { key: "actions", label: "Acciones" },
];

const machineColumns: TableColumn<MachineColumnKey>[] = [
  { key: "visibleId", label: "ID", sortable: true },
  { key: "name", label: "Maquina", sortable: true },
  { key: "local", label: "Local", sortable: true },
  { key: "location", label: "Ubicacion", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "lastIn", label: "IN actual", sortable: true },
  { key: "lastOut", label: "OUT actual", sortable: true },
  { key: "notes", label: "Obs.", sortable: true },
  { key: "actions", label: "Acciones" },
];
const userColumns: TableColumn<UserColumnKey>[] = [
  { key: "name", label: "Usuario", sortable: true },
  { key: "username", label: "Login", sortable: true },
  { key: "role", label: "Rol", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "locals", label: "Locales", sortable: true },
  { key: "actions", label: "Acciones" },
];
const balanceColumns: TableColumn<BalanceColumnKey>[] = [
  { key: "operatingDate", label: "Fecha", sortable: true },
  { key: "local", label: "Local", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "initialFund", label: "Efectivo inicial", sortable: true },
  { key: "declaredCash", label: "Declarado", sortable: true },
  { key: "nextBase", label: "Base prox.", sortable: true },
  { key: "withdrawal", label: "Retiro", sortable: true },
  { key: "cashDifference", label: "Diferencia", sortable: true },
  { key: "openedBy", label: "Apertura", sortable: true },
  { key: "closedBy", label: "Cierre", sortable: true },
  { key: "actions", label: "Acciones" },
];
const fixedLocalColumns: LocalColumnKey[] = ["id", "name", "status", "machines", "balances", "actions"];
const fixedMachineColumns: MachineColumnKey[] = ["visibleId", "name", "local", "status", "lastIn", "lastOut", "actions"];
const fixedUserColumns: UserColumnKey[] = ["name", "username", "role", "status", "actions"];
const fixedBalanceColumns: BalanceColumnKey[] = ["operatingDate", "status", "initialFund", "declaredCash", "cashDifference", "actions"];

function ColumnChooser<Key extends string>({
  label,
  columns,
  visible,
  fixed,
  onToggle,
}: {
  label: string;
  columns: TableColumn<Key>[];
  visible: Key[];
  fixed: Key[];
  onToggle: (key: Key) => void;
}) {
  return (
    <details className="column-menu">
      <summary>{label}</summary>
      <div className="column-chooser" aria-label="Columnas visibles">
        {columns.map((column) => (
          <label key={column.key}>
            <input type="checkbox" checked={visible.includes(column.key)} disabled={fixed.includes(column.key)} onChange={() => onToggle(column.key)} />
            {column.label}
            {fixed.includes(column.key) && <span>fijo</span>}
          </label>
        ))}
      </div>
    </details>
  );
}

function readColumnPreference<Key extends string>(storageKey: string, columns: TableColumn<Key>[], fixed: Key[]): Key[] {
  const fallback = fixed;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Key[];
    const allowed = new Set(columns.map((column) => column.key));
    const next = parsed.filter((key) => allowed.has(key));
    return [...next, ...fixed.filter((key) => !next.includes(key))];
  } catch {
    return fallback;
  }
}

function Modal({
  title,
  children,
  onClose,
  closeLabel = "Cerrar",
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={wide ? "modal-card wide" : "modal-card"} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="button muted compact" type="button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function AdminMachines({
  data,
  user,
  patchData,
  audit,
  setMessage,
  onlyWorkshop = false,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onlyWorkshop?: boolean;
}) {
  const [editor, setEditor] = useState<MachineModalState | null>(null);
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<MachineColumnKey[]>(() =>
    readColumnPreference(MACHINE_COLUMNS_STORAGE_KEY, machineColumns, fixedMachineColumns),
  );
  const [sort, setSort] = useState<SortState<MachineColumnKey>>({ key: "visibleId", direction: "asc" });
  useEffect(() => {
    localStorage.setItem(MACHINE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const toggleColumn = (key: MachineColumnKey) => {
    setVisibleColumns((current) => {
      if (fixedMachineColumns.includes(key)) return current;
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  };
  const machineSortValue = (machine: Machine, key: MachineColumnKey): string | number => {
    if (key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
    if (key === "local") return localName(data, machine.localId);
    if (key === "lastIn") return machine.lastIn;
    if (key === "lastOut") return machine.lastOut;
    if (key === "actions") return "";
    return machine[key] ?? "";
  };
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID);
  const disusedWorkshopMachines = workshopMachines.filter((machine) => machine.status === "DESUSO");
  const machinesSource = onlyWorkshop ? workshopMachines.filter((machine) => machine.status !== "DESUSO") : data.machines.filter((machine) => machine.status !== "DESUSO");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMachines = normalizedQuery
    ? machinesSource.filter((machine) =>
        [machine.visibleId, machine.name, localName(data, machine.localId), machine.location, machine.status, machine.notes]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : machinesSource;
  const sortedMachines = [...filteredMachines].sort((a, b) => {
    const result = compareValues(machineSortValue(a, sort.key), machineSortValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const visibleMachineColumns = machineColumns.filter((column) => visibleColumns.includes(column.key));
  const historyMachine = historyMachineId ? data.machines.find((machine) => machine.id === historyMachineId) : undefined;

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">
            {onlyWorkshop
              ? "Maquinas disponibles antes de asignarlas a locales. Las de estado Desuso quedan en su apartado."
              : "La grilla muestra el estado actual. Para modificar, usar la ventana flotante."}
          </p>
        </div>
        <div className="admin-header-actions">
          {onlyWorkshop && <span>{disusedWorkshopMachines.length} en desuso</span>}
          <span>{machinesSource.length} maquinas</span>
          <button className="button success compact" onClick={() => setEditor({ machineId: null })}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar maquina, local, estado..." />
        <ColumnChooser label="Columnas" columns={machineColumns} visible={visibleColumns} fixed={fixedMachineColumns} onToggle={toggleColumn} />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {visibleMachineColumns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                      {column.label}
                      {sortIndicator(sort, column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMachines.map((machine) => (
              <tr key={machine.id} className={machineStatusClass(machine.status)}>
                {visibleColumns.includes("visibleId") && <td>{machine.visibleId}</td>}
                {visibleColumns.includes("name") && (
                  <td>
                    <button className="link-button" onClick={() => setHistoryMachineId(machine.id)}>
                      {machine.name}
                    </button>
                  </td>
                )}
                {visibleColumns.includes("local") && <td>{localName(data, machine.localId)}</td>}
                {visibleColumns.includes("location") && <td>{machine.location}</td>}
                {visibleColumns.includes("status") && <td>{machine.status}</td>}
                {visibleColumns.includes("lastIn") && <td>{counter(machine.lastIn)}</td>}
                {visibleColumns.includes("lastOut") && <td>{counter(machine.lastOut)}</td>}
                {visibleColumns.includes("notes") && <td>{machine.notes || "-"}</td>}
                {visibleColumns.includes("actions") && (
                  <td>
                    <div className="table-actions">
                      <button className="button primary compact" onClick={() => setEditor({ machineId: machine.id })}>
                        Editar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onlyWorkshop && (
        <section className="embedded-panel">
          <div className="admin-header">
            <div>
              <h3>Maquinas en desuso</h3>
              <p className="helper">Maquinas con estado Desuso dentro del taller. Desde aca se pueden revisar, editar o eliminar si nunca tuvieron recaudaciones.</p>
            </div>
            <span>{disusedWorkshopMachines.length} maquinas</span>
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Maquina</th>
                  <th>IN actual</th>
                  <th>OUT actual</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {disusedWorkshopMachines.map((machine) => (
                  <tr key={machine.id} className={machineStatusClass(machine.status)}>
                    <td>{machine.visibleId}</td>
                    <td>
                      <button className="link-button" onClick={() => setHistoryMachineId(machine.id)}>
                        {machine.name}
                      </button>
                    </td>
                    <td>{counter(machine.lastIn)}</td>
                    <td>{counter(machine.lastOut)}</td>
                    <td>
                      <button className="button primary compact" onClick={() => setEditor({ machineId: machine.id })}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {!disusedWorkshopMachines.length && (
                  <tr>
                    <td colSpan={5}>No hay maquinas en desuso.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {historyMachine && <MachineHistoryModal data={data} machine={historyMachine} onClose={() => setHistoryMachineId(null)} />}
      {editor && (
        <AdminMachineEditor
          data={data}
          user={user}
          machineId={editor.machineId}
          initialLocalId={editor.localId}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

function AdminMachineEditor({
  data,
  user,
  machineId,
  initialLocalId,
  patchData,
  audit,
  setMessage,
  onClose,
}: {
  data: AppData;
  user: User;
  machineId: string | null;
  initialLocalId?: string;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
}) {
  const existing = machineId ? data.machines.find((machine) => machine.id === machineId) : undefined;
  const nextVisibleId = nextShortId(data.machines.map((machine) => machine.visibleId));
  const [draft, setDraft] = useState({
    visibleId: existing?.visibleId ?? nextVisibleId,
    name: existing?.name ?? "",
    localId: existing?.localId ?? initialLocalId ?? WORKSHOP_LOCAL_ID,
    location: existing?.location ?? WORKSHOP_LABEL,
    status: existing?.status ?? "ACTIVA",
    lastIn: counter(existing?.lastIn ?? 0),
    lastOut: counter(existing?.lastOut ?? 0),
    notes: existing?.notes ?? "",
  });
  const [error, setError] = useState("");
  const isNew = !existing;
  const hasReadings = Boolean(existing && data.readings.some((reading) => reading.machineId === existing.id));
  const isInWorkshop = existing?.localId === WORKSHOP_LOCAL_ID;
  const blockingBalance = existing ? data.balances.find((balance) => balance.localId === existing.localId && balance.status === "EN_PROCESO") : undefined;
  const machineHistory = existing
    ? data.machineLocalHistory
        .filter((event) => event.machineId === existing.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const visibleId = shortNumberId(draft.visibleId);
    if (!visibleId || !draft.name.trim()) {
      setError("ID numerico corto y nombre son obligatorios.");
      return;
    }
    const duplicate = data.machines.some((machine) => machine.id !== existing?.id && shortNumberId(machine.visibleId) === visibleId);
    if (duplicate) {
      setError("Ya existe una maquina con ese ID.");
      return;
    }
    if (draft.status === "DESUSO" && draft.localId !== WORKSHOP_LOCAL_ID) {
      setError("El estado Desuso solo se puede aplicar a maquinas que estan en Taller.");
      return;
    }
    if (!confirmAction(isNew ? "Confirmar creacion de esta maquina." : "Confirmar cambios de esta maquina.")) return;

    const next: Machine = {
      id: existing?.id ?? uid("machine"),
      visibleId,
      name: draft.name.trim(),
      localId: draft.localId,
      location: draft.location.trim() || (draft.localId === WORKSHOP_LOCAL_ID ? WORKSHOP_LABEL : "Salon"),
      status: draft.status as MachineStatus,
      lastIn: isNew ? 0 : parseCounter(draft.lastIn),
      lastOut: isNew ? 0 : parseCounter(draft.lastOut),
      notes: draft.notes.trim(),
    };

    patchData((current) => {
      if (isNew) {
        const history = machineHistoryEvent(next, WORKSHOP_LOCAL_ID, "AGREGADA", "Alta de maquina en taller", user.id);
        return audit(
          { ...current, machines: [...current.machines, next], machineLocalHistory: [history, ...current.machineLocalHistory] },
          "Crear maquina",
          "Maquina",
          next.id,
          "",
          next,
          "Autorizado",
        );
      }

      const machines = current.machines.map((machine) => (machine.id === next.id ? next : machine));
      const history: MachineLocalHistory[] = [];
      if (existing.localId !== next.localId) {
        history.push(
          machineHistoryEvent(next, next.localId, "MOVIDA", `Recibida desde ${localName(current, existing.localId)}`, user.id),
          machineHistoryEvent(existing, existing.localId, "MOVIDA", `Movida a ${localName(current, next.localId)}`, user.id),
        );
      }
      if (existing.lastIn !== next.lastIn || existing.lastOut !== next.lastOut) {
        history.push(
          machineHistoryEvent(
            next,
            next.localId,
            "CONTADORES",
            `Ajuste admin: IN ${counter(existing.lastIn)} -> ${counter(next.lastIn)}, OUT ${counter(existing.lastOut)} -> ${counter(next.lastOut)}`,
            user.id,
          ),
        );
      }
      if (!history.length || existing.status !== next.status || existing.name !== next.name || existing.location !== next.location || existing.notes !== next.notes) {
        history.push(machineHistoryEvent(next, next.localId, "MODIFICADA", "Edicion administrativa", user.id));
      }
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Modificar maquina",
        "Maquina",
        next.id,
        existing,
        next,
        "Autorizado",
      );
    });
    setMessage(isNew ? "Maquina creada." : "Maquina modificada.");
    onClose();
  };

  const resetCounters = () => {
    if (!existing) return;
    if (blockingBalance) {
      setMessage(`No se puede resetear ${existing.name}: hay una caja abierta del ${blockingBalance.operatingDate}. Primero hay que cerrar esa caja.`);
      return;
    }
    if (!confirmAction(`Confirmar reset de contadores de ${existing.name}.`)) return;
    patchData((current) => {
      const previous = current.machines.find((machine) => machine.id === existing.id);
      const nextMachine = { ...existing, lastIn: 0, lastOut: 0 };
      const machines = current.machines.map((machine) => (machine.id === existing.id ? nextMachine : machine));
      const history = machineHistoryEvent(existing, existing.localId, "RESET", `Reset admin: IN ${counter(existing.lastIn)} -> 0, OUT ${counter(existing.lastOut)} -> 0`, user.id);
      return audit(
        { ...current, machines, machineLocalHistory: [history, ...current.machineLocalHistory] },
        "Reset contadores",
        "Maquina",
        existing.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Contadores reiniciados.");
    onClose();
  };

  const sendToWorkshop = () => {
    if (!existing || existing.localId === WORKSHOP_LOCAL_ID || !confirmAction(`Confirmar envio de ${existing.name} al Taller.`)) return;
    patchData((current) => {
      const previous = current.machines.find((machine) => machine.id === existing.id);
      const nextMachine = { ...existing, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
      const machines = current.machines.map((machine) => (machine.id === existing.id ? nextMachine : machine));
      const history = [
        machineHistoryEvent(existing, existing.localId, "MOVIDA", `Enviada a ${WORKSHOP_LABEL}`, user.id),
        machineHistoryEvent(nextMachine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde ${localName(current, existing.localId)}`, user.id),
      ];
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Enviar maquina al taller",
        "Maquina",
        existing.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Maquina enviada al taller.");
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    if (!isInWorkshop) {
      setError("Para eliminar una maquina primero hay que enviarla al taller.");
      return;
    }
    if (hasReadings) {
      setError("No se puede eliminar una maquina que tenga recaudaciones.");
      return;
    }
    if (!confirmAction(`Confirmar eliminacion definitiva de la maquina ${existing.name}.`)) return;
    patchData((current) => {
      const machines = current.machines.filter((machine) => machine.id !== existing.id);
      const history = machineHistoryEvent(existing, existing.localId, "QUITADA", "Baja definitiva desde taller", user.id);
      return audit(
        { ...current, machines, machineLocalHistory: [history, ...current.machineLocalHistory] },
        "Eliminar maquina",
        "Maquina",
        existing.id,
        existing,
        "",
        "Autorizado",
      );
    });
    setMessage("Maquina eliminada.");
    onClose();
  };

  return (
    <Modal title={isNew ? "Agregar maquina" : `Editar maquina ${existing.visibleId}`} onClose={onClose} wide>
      <p className="helper">Antes de aplicar una accion se pide reconfirmacion.</p>
      <form className="form-grid" onSubmit={save}>
        <label>
          ID
          <input value={draft.visibleId} inputMode="numeric" maxLength={4} onChange={(event) => setDraft((current) => ({ ...current, visibleId: sanitizeNumberId(event.target.value) }))} />
        </label>
        <label>
          Maquina
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Local
          <select value={draft.localId} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, localId: event.target.value }))}>
            <option value={WORKSHOP_LOCAL_ID}>{WORKSHOP_LABEL}</option>
            {data.locals.map((local) => (
              <option key={local.id} value={local.id}>
                {localOptionName(local)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as MachineStatus }))}>
            <option value="ACTIVA">Activa</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="INACTIVA">Inactiva</option>
            {draft.localId === WORKSHOP_LOCAL_ID && <option value="DESUSO">Desuso</option>}
          </select>
        </label>
        <label>
          Ubicacion
          <input value={draft.location} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} />
        </label>
        <label>
          IN actual
          <input value={draft.lastIn} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, lastIn: formatCounterInput(event.target.value) }))} inputMode="numeric" />
        </label>
        <label>
          OUT actual
          <input value={draft.lastOut} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, lastOut: formatCounterInput(event.target.value) }))} inputMode="numeric" />
        </label>
        <label>
          Observacion
          <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        {!isNew && (
          <section className="embedded-panel span-2">
            <h3>Historial de maquina</h3>
            <div className="table-wrap compact-table">
              <table className="data-table compact-data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Local</th>
                    <th>Movimiento</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {machineHistory.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDateTime(event.createdAt)}</td>
                      <td>{localName(data, event.localId)}</td>
                      <td>{event.action}</td>
                      <td>{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {blockingBalance && (
          <p className="notice span-2">
            Hay una caja abierta del {blockingBalance.operatingDate}. Para resetear contadores de esta maquina primero hay que cerrar esa caja.
          </p>
        )}
        {error && <p className="validation error span-2">{error}</p>}
        <div className="form-actions span-2">
          <div className="button-row end">
            {!isNew && (
              <>
                <button className="button muted" type="button" disabled={Boolean(blockingBalance)} onClick={resetCounters}>
                  Reset
                </button>
                {!isInWorkshop && (
                  <button className="button muted" type="button" onClick={sendToWorkshop}>
                    Enviar al taller
                  </button>
                )}
                {isInWorkshop && (
                  <button className="button danger" type="button" disabled={hasReadings} onClick={remove}>
                    Eliminar maquina
                  </button>
                )}
              </>
            )}
            <button className="button success" type="submit">
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AdminLocals({
  data,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const [localEditorId, setLocalEditorId] = useState<string | null | undefined>(undefined);
  const [machinesLocalId, setMachinesLocalId] = useState<string | null>(null);
  const [machineEditor, setMachineEditor] = useState<MachineModalState | null>(null);
  const [machinePickerLocalId, setMachinePickerLocalId] = useState<string | null>(null);
  const [historyLocalId, setHistoryLocalId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const machinesLocal = machinesLocalId ? data.locals.find((local) => local.id === machinesLocalId) : undefined;
  const historyLocal = historyLocalId ? data.locals.find((local) => local.id === historyLocalId) : undefined;
  const pickerLocal = machinePickerLocalId ? data.locals.find((local) => local.id === machinePickerLocalId) : undefined;
  const workshopCount = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID).length;
  const [visibleColumns, setVisibleColumns] = useState<LocalColumnKey[]>(() =>
    readColumnPreference(LOCAL_COLUMNS_STORAGE_KEY, localColumns, fixedLocalColumns),
  );
  const [sort, setSort] = useState<SortState<LocalColumnKey>>({ key: "id", direction: "asc" });
  useEffect(() => {
    localStorage.setItem(LOCAL_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const toggleColumn = (key: LocalColumnKey) => {
    setVisibleColumns((current) => {
      if (fixedLocalColumns.includes(key)) return current;
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  };
  const machinesCountFor = (localId: string) => data.machines.filter((machine) => machine.localId === localId).length;
  const balancesCountFor = (localId: string) => data.balances.filter((balance) => balance.localId === localId).length;
  const localSortValue = (local: Local, key: LocalColumnKey): string | number => {
    if (key === "id") return Number(local.id) || local.id;
    if (key === "machines") return machinesCountFor(local.id);
    if (key === "images") return local.images.length;
    if (key === "balances") return balancesCountFor(local.id);
    if (key === "google") return mapsHref(local);
    if (key === "actions") return "";
    return local[key] ?? "";
  };
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLocals = normalizedQuery
    ? data.locals.filter((local) =>
        [local.id, local.name, local.tenantName, local.phone, local.email, local.address, local.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : data.locals;
  const sortedLocals = [...filteredLocals].sort((a, b) => {
    const result = compareValues(localSortValue(a, sort.key), localSortValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const visibleLocalColumns = localColumns.filter((column) => visibleColumns.includes(column.key));

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">La tabla es la vista principal. El estado cambia el color de la fila.</p>
        </div>
        <div className="admin-header-actions">
          <span>{workshopCount} en taller</span>
          <span>{data.locals.length} locales</span>
          <button className="button success compact" onClick={() => setLocalEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar local, locatario, telefono..." />
        <ColumnChooser label="Columnas" columns={localColumns} visible={visibleColumns} fixed={fixedLocalColumns} onToggle={toggleColumn} />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {visibleLocalColumns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                      {column.label}
                      {sortIndicator(sort, column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedLocals.map((local) => {
              const machinesCount = machinesCountFor(local.id);
              const balancesCount = balancesCountFor(local.id);
              return (
                <tr key={local.id} className={localStatusClass(local.status)}>
                  {visibleColumns.includes("id") && <td>{local.id}</td>}
                  {visibleColumns.includes("name") && (
                    <td>
                      <button className="link-button" onClick={() => setHistoryLocalId(local.id)}>
                        {local.name}
                      </button>
                    </td>
                  )}
                  {visibleColumns.includes("tenantName") && <td>{local.tenantName || "-"}</td>}
                  {visibleColumns.includes("phone") && <td>{local.phone || "-"}</td>}
                  {visibleColumns.includes("email") && <td>{local.email || "-"}</td>}
                  {visibleColumns.includes("address") && <td>{local.address}</td>}
                  {visibleColumns.includes("google") && (
                    <td>
                      <a className="link-button" href={mapsHref(local)} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    </td>
                  )}
                  {visibleColumns.includes("status") && <td>{local.status}</td>}
                  {visibleColumns.includes("machines") && (
                    <td>
                      <button className="link-button count-button" onClick={() => setMachinesLocalId(local.id)}>
                        {machinesCount}
                      </button>
                    </td>
                  )}
                  {visibleColumns.includes("images") && <td>{local.images.length}</td>}
                  {visibleColumns.includes("balances") && <td>{balancesCount}</td>}
                  {visibleColumns.includes("actions") && (
                    <td>
                      <div className="table-actions">
                        <button className="button primary compact" onClick={() => setLocalEditorId(local.id)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {localEditorId !== undefined && (
        <AdminLocalEditor
          data={data}
          user={user}
          localId={localEditorId}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setLocalEditorId(undefined)}
          onAddMachine={(localId) => setMachinePickerLocalId(localId)}
        />
      )}
      {machinesLocal && (
        <LocalMachinesModal
          data={data}
          user={user}
          local={machinesLocal}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setMachinesLocalId(null)}
          onAddMachine={() => setMachinePickerLocalId(machinesLocal.id)}
          onEditMachine={(machineId) => setMachineEditor({ machineId })}
        />
      )}
      {historyLocal && <LocalHistoryModal data={data} local={historyLocal} onClose={() => setHistoryLocalId(null)} />}
      {pickerLocal && (
        <WorkshopMachinePicker
          data={data}
          user={user}
          local={pickerLocal}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setMachinePickerLocalId(null)}
        />
      )}
      {machineEditor && (
        <AdminMachineEditor
          data={data}
          user={user}
          machineId={machineEditor.machineId}
          initialLocalId={machineEditor.localId}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setMachineEditor(null)}
        />
      )}
    </section>
  );
}

function LocalMachinesModal({
  data,
  user,
  local,
  patchData,
  audit,
  setMessage,
  onClose,
  onAddMachine,
  onEditMachine,
}: {
  data: AppData;
  user: User;
  local: Local;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
  onAddMachine: () => void;
  onEditMachine: (machineId: string) => void;
}) {
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const machines = data.machines.filter((machine) => machine.localId === local.id);
  const historyMachine = historyMachineId ? data.machines.find((machine) => machine.id === historyMachineId) : undefined;
  const history = data.machineLocalHistory
    .filter((event) => event.localId === local.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const normalizedQuery = historyQuery.trim().toLowerCase();
  const visibleHistory = normalizedQuery
    ? history.filter((event) =>
        [formatDateTime(event.createdAt), event.machineVisibleId, event.machineName, event.action, event.detail]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : history;
  const sendToWorkshop = (machine: Machine) => {
    if (!confirmAction(`Confirmar envio de ${machine.name} al Taller.`)) return;
    patchData((current) => {
      const previous = current.machines.find((item) => item.id === machine.id);
      const nextMachine = { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
      const machinesNext = current.machines.map((item) => (item.id === machine.id ? nextMachine : item));
      const historyNext = [
        machineHistoryEvent(machine, local.id, "MOVIDA", `Enviada a ${WORKSHOP_LABEL}`, user.id),
        machineHistoryEvent(nextMachine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde ${local.name}`, user.id),
      ];
      return audit(
        { ...current, machines: machinesNext, machineLocalHistory: [...historyNext, ...current.machineLocalHistory] },
        "Enviar maquina al taller",
        "Maquina",
        machine.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Maquina enviada al taller.");
  };

  return (
    <Modal title={`Maquinas de ${local.name}`} onClose={onClose} wide>
      <div className="modal-toolbar">
        <span>Local ID {local.id}</span>
        <button className="button success compact" onClick={onAddMachine}>
          Agregar maquina
        </button>
      </div>
      <div className="table-wrap compact-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Maquina</th>
              <th>Estado</th>
              <th>Ubicacion</th>
              <th>IN actual</th>
              <th>OUT actual</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => (
              <tr key={machine.id} className={machineStatusClass(machine.status)}>
                <td>{machine.visibleId}</td>
                <td>
                  <button className="link-button" onClick={() => setHistoryMachineId(machine.id)}>
                    {machine.name}
                  </button>
                </td>
                <td>{machine.status}</td>
                <td>{machine.location}</td>
                <td>{counter(machine.lastIn)}</td>
                <td>{counter(machine.lastOut)}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => onEditMachine(machine.id)}>
                      Editar
                    </button>
                    <button className="button muted compact" onClick={() => sendToWorkshop(machine)}>
                      Enviar al taller
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!machines.length && (
              <tr>
                <td colSpan={7}>No hay maquinas asociadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3 className="modal-section-title">Historial de maquinas</h3>
      <input
        className="search-input"
        value={historyQuery}
        onChange={(event) => setHistoryQuery(event.target.value)}
        placeholder="Buscar por fecha, maquina, movimiento o detalle"
      />
      <div className="table-wrap compact-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>ID</th>
              <th>Maquina</th>
              <th>Movimiento</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {visibleHistory.map((event) => (
              <tr key={event.id}>
                <td>{formatDateTime(event.createdAt)}</td>
                <td>{event.machineVisibleId}</td>
                <td>{event.machineName}</td>
                <td>{event.action}</td>
                <td>{event.detail}</td>
              </tr>
            ))}
            {!visibleHistory.length && (
              <tr>
                <td colSpan={5}>Sin resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {historyMachine && <MachineHistoryModal data={data} machine={historyMachine} onClose={() => setHistoryMachineId(null)} />}
    </Modal>
  );
}

function WorkshopMachinePicker({
  data,
  user,
  local,
  patchData,
  audit,
  setMessage,
  onClose,
}: {
  data: AppData;
  user: User;
  local: Local;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID && machine.status !== "DESUSO");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleMachines = normalizedQuery
    ? workshopMachines.filter((machine) => [machine.visibleId, machine.name, machine.status, machine.notes].join(" ").toLowerCase().includes(normalizedQuery))
    : workshopMachines;

  const assign = () => {
    if (!selectedIds.length) {
      setError("Seleccione al menos una maquina del taller.");
      return;
    }
    if (!confirmAction(`Confirmar asignacion de ${selectedIds.length} maquina(s) a ${local.name}.`)) return;

    patchData((current) => {
      const selectedMachines = current.machines.filter((machine) => selectedIds.includes(machine.id));
      const machines = current.machines.map((machine) =>
        selectedIds.includes(machine.id) ? { ...machine, localId: local.id, location: local.name } : machine,
      );
      const history = selectedMachines.flatMap((machine) => [
        machineHistoryEvent(machine, local.id, "MOVIDA", `Asignada desde ${WORKSHOP_LABEL}`, user.id),
        machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Movida al local ${local.name}`, user.id),
      ]);
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Asignar maquinas a local",
        "Local",
        local.id,
        "",
        { localId: local.id, machineIds: selectedIds },
        "Autorizado",
      );
    });
    setMessage(`${selectedIds.length} maquina(s) asignada(s) a ${local.name}.`);
    onClose();
  };

  return (
    <Modal title={`Asignar maquinas a ${local.name}`} onClose={onClose} wide>
      <div className="modal-toolbar">
        <span>{workshopMachines.length} disponibles en Taller</span>
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar maquina" />
      </div>
      <div className="table-wrap compact-table">
        <table className="data-table compact-data-table">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Maquina</th>
              <th>Estado</th>
              <th>IN</th>
              <th>OUT</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {visibleMachines.map((machine) => (
              <tr key={machine.id} className={machineStatusClass(machine.status)}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(machine.id)}
                    onChange={(event) =>
                      setSelectedIds((current) => (event.target.checked ? [...current, machine.id] : current.filter((id) => id !== machine.id)))
                    }
                  />
                </td>
                <td>{machine.visibleId}</td>
                <td>{machine.name}</td>
                <td>{machine.status}</td>
                <td>{counter(machine.lastIn)}</td>
                <td>{counter(machine.lastOut)}</td>
                <td>{machine.notes || "-"}</td>
              </tr>
            ))}
            {!visibleMachines.length && (
              <tr>
                <td colSpan={7}>No hay maquinas disponibles.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <p className="validation error">{error}</p>}
      <div className="button-row end">
        <button className="button success" type="button" onClick={assign}>
          Asignar seleccionadas
        </button>
      </div>
    </Modal>
  );
}

function MachineHistoryModal({ data, machine, onClose }: { data: AppData; machine: Machine; onClose: () => void }) {
  const [tab, setTab] = useState<MachineHistoryTab>("resumen");
  const history = data.machineLocalHistory
    .filter((event) => event.machineId === machine.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const readings = data.readings
    .filter((reading) => reading.machineId === machine.id)
    .map((reading) => ({
      reading,
      balance: data.balances.find((balance) => balance.id === reading.balanceId),
    }))
    .filter((item) => item.balance)
    .sort((a, b) => String(b.balance?.operatingDate).localeCompare(String(a.balance?.operatingDate)));
  const machineAudits = data.audit
    .filter((event) => event.entity === "Maquina" && event.entityId === machine.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const loadedReadings = readings.filter(({ reading }) => reading.status === "CARGADA");
  const totalResult = loadedReadings.reduce((total, { reading }) => total + reading.result, 0);
  const lastReading = readings[0];

  return (
    <Modal title={`Historial de maquina ${machine.visibleId}`} onClose={onClose} wide>
      <div className="tabs">
        <button className={tab === "resumen" ? "tab active" : "tab"} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={tab === "locales" ? "tab active" : "tab"} onClick={() => setTab("locales")}>
          Locales
        </button>
        <button className={tab === "contadores" ? "tab active" : "tab"} onClick={() => setTab("contadores")}>
          Contadores
        </button>
        <button className={tab === "auditoria" ? "tab active" : "tab"} onClick={() => setTab("auditoria")}>
          Auditoria
        </button>
      </div>
      {tab === "resumen" && (
        <section className="history-panel">
          <div className="detail-grid">
            <div>
              <strong>ID</strong>
              <span>{machine.visibleId}</span>
            </div>
            <div>
              <strong>Maquina</strong>
              <span>{machine.name}</span>
            </div>
            <div>
              <strong>Local actual</strong>
              <span>{localName(data, machine.localId)}</span>
            </div>
            <div>
              <strong>Estado</strong>
              <span>{machine.status}</span>
            </div>
            <div>
              <strong>IN actual</strong>
              <span>{counter(machine.lastIn)}</span>
            </div>
            <div>
              <strong>OUT actual</strong>
              <span>{counter(machine.lastOut)}</span>
            </div>
            <div>
              <strong>Total recaudado</strong>
              <span>{money(totalResult)}</span>
            </div>
            <div>
              <strong>Ultima lectura</strong>
              <span>{lastReading?.balance?.operatingDate ?? "-"}</span>
            </div>
          </div>
          <InfoCard
            tone={machine.localId === WORKSHOP_LOCAL_ID ? "orange" : "blue"}
            title={machine.localId === WORKSHOP_LOCAL_ID ? "Ubicada en taller" : "Asignada a local"}
            lines={[`Ubicacion: ${machine.location || "-"}`, `Observacion: ${machine.notes || "-"}`]}
          />
        </section>
      )}
      {tab === "locales" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Local</th>
                <th>Movimiento</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {history.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{localName(data, event.localId)}</td>
                  <td>{event.action}</td>
                  <td>{event.detail}</td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan={4}>Sin historial de locales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "contadores" && (
        <section className="history-panel">
          <InfoCard tone="green" title="Total por contadores" lines={[money(totalResult), `${loadedReadings.length} lectura(s) cargadas`]} />
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>IN ant.</th>
                  <th>IN act.</th>
                  <th>OUT ant.</th>
                  <th>OUT act.</th>
                  <th>Resultado</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {readings.map(({ reading, balance }) => (
                  <tr key={reading.id}>
                    <td>{balance?.operatingDate}</td>
                    <td>{reading.status}</td>
                    <td>{counter(reading.inPrevious)}</td>
                    <td>{counter(reading.inActual)}</td>
                    <td>{counter(reading.outPrevious)}</td>
                    <td>{counter(reading.outActual)}</td>
                    <td>{money(reading.result)}</td>
                    <td>{reading.observation || "-"}</td>
                  </tr>
                ))}
                {!readings.length && (
                  <tr>
                    <td colSpan={8}>Sin lecturas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "auditoria" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Accion</th>
                <th>Usuario</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {machineAudits.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{event.action}</td>
                  <td>{auditUserName(data, event)}</td>
                  <td>{event.reason || "-"}</td>
                </tr>
              ))}
              {!machineAudits.length && (
                <tr>
                  <td colSpan={4}>Sin auditoria de esta maquina.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function LocalHistoryModal({ data, local, onClose }: { data: AppData; local: Local; onClose: () => void }) {
  const [tab, setTab] = useState<LocalHistoryTab>("resumen");
  const localAudits = data.audit.filter((event) => event.entity === "Local" && event.entityId === local.id);
  const statusAudits = localAudits
    .map((event) => ({
      event,
      previous: parseAuditValue(event.previousValue),
      next: parseAuditValue(event.newValue),
    }))
    .filter((item) => item.previous.status !== item.next.status && item.next.status);
  const balances = data.balances
    .filter((balance) => balance.localId === local.id)
    .slice()
    .sort((a, b) => a.operatingDate.localeCompare(b.operatingDate));
  const localMachines = data.machines.filter((machine) => machine.localId === local.id);
  const activeMachines = localMachines.filter((machine) => machine.status === "ACTIVA").length;
  const maintenanceMachines = localMachines.filter((machine) => machine.status === "MANTENIMIENTO").length;
  const inactiveMachines = localMachines.filter((machine) => machine.status === "INACTIVA").length;
  let accumulated = 0;
  const revenueRows = balances.map((balance) => {
    const totals = totalsForBalance(data, balance.id);
    accumulated += totals.resultMachines;
    return { balance, totals, accumulated };
  });
  const totalRevenue = revenueRows.reduce((total, row) => total + row.totals.resultMachines, 0);
  const totalExpenses = revenueRows.reduce((total, row) => total + row.totals.totalExpenses, 0);
  const totalTransfers = revenueRows.reduce((total, row) => total + row.totals.totalTransfers, 0);
  const totalDifferences = balances.reduce((total, balance) => total + (balance.cashDifference ?? 0), 0);

  return (
    <Modal title={`Historial de ${local.name}`} onClose={onClose} wide>
      <div className="tabs">
        <button className={tab === "resumen" ? "tab active" : "tab"} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={tab === "datos" ? "tab active" : "tab"} onClick={() => setTab("datos")}>
          Datos
        </button>
        <button className={tab === "maquinas" ? "tab active" : "tab"} onClick={() => setTab("maquinas")}>
          Maquinas
        </button>
        <button className={tab === "estados" ? "tab active" : "tab"} onClick={() => setTab("estados")}>
          Estados
        </button>
        <button className={tab === "recaudaciones" ? "tab active" : "tab"} onClick={() => setTab("recaudaciones")}>
          Recaudaciones
        </button>
        <button className={tab === "auditoria" ? "tab active" : "tab"} onClick={() => setTab("auditoria")}>
          Auditoria
        </button>
      </div>
      {tab === "resumen" && (
        <section className="history-panel">
          <div className="card-grid three history-cards">
            <InfoCard tone="blue" title="Maquinas" lines={[`${localMachines.length} asociadas`, `${activeMachines} activas`, `${maintenanceMachines} mantenimiento`]} />
            <InfoCard tone="green" title="Recaudaciones" lines={[money(totalRevenue), `${balances.length} caja(s)`, `Gastos: ${money(totalExpenses)}`]} />
            <InfoCard tone="orange" title="Control" lines={[`Transferencias: ${money(totalTransfers)}`, `Diferencias: ${money(totalDifferences)}`, `${localAudits.length} evento(s)`]} />
          </div>
          <div className="detail-grid">
            <div>
              <strong>ID</strong>
              <span>{local.id}</span>
            </div>
            <div>
              <strong>Local</strong>
              <span>{local.name}</span>
            </div>
            <div>
              <strong>Estado</strong>
              <span>{local.status}</span>
            </div>
            <div>
              <strong>Inactivas</strong>
              <span>{inactiveMachines}</span>
            </div>
            <div>
              <strong>Locatario</strong>
              <span>{local.tenantName || "-"}</span>
            </div>
            <div>
              <strong>Contacto</strong>
              <span>{[local.phone, local.email].filter(Boolean).join(" / ") || "-"}</span>
            </div>
          </div>
        </section>
      )}
      {tab === "datos" && (
        <section className="history-panel">
          <div className="detail-grid">
            <div>
              <strong>ID</strong>
              <span>{local.id}</span>
            </div>
            <div>
              <strong>Locatario</strong>
              <span>{local.tenantName || "-"}</span>
            </div>
            <div>
              <strong>Telefono</strong>
              <span>{local.phone || "-"}</span>
            </div>
            <div>
              <strong>Email</strong>
              <span>{local.email || "-"}</span>
            </div>
            <div>
              <strong>Direccion</strong>
              <span>{local.address}</span>
            </div>
            <div>
              <strong>Google</strong>
              <a href={mapsHref(local)} target="_blank" rel="noreferrer">
                Abrir ubicacion
              </a>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <strong>Maquinas actuales</strong>
              <span>{localMachines.length}</span>
            </div>
            <div>
              <strong>Cajas registradas</strong>
              <span>{balances.length}</span>
            </div>
            <div>
              <strong>Total recaudado</strong>
              <span>{money(totalRevenue)}</span>
            </div>
            <div>
              <strong>Imagenes</strong>
              <span>{local.images.length}</span>
            </div>
          </div>
          <div className="image-strip">
            {local.images.map((image) => (
              <figure key={image.id}>
                <img src={image.dataUrl} alt={image.name} />
                <figcaption>{image.name}</figcaption>
              </figure>
            ))}
            {!local.images.length && <p className="helper">Sin imagenes cargadas.</p>}
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Accion</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {localAudits.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.createdAt)}</td>
                    <td>{event.action}</td>
                    <td>{event.reason || "-"}</td>
                  </tr>
                ))}
                {!localAudits.length && (
                  <tr>
                    <td colSpan={3}>Sin movimientos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "maquinas" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Maquina</th>
                <th>Estado</th>
                <th>Ubicacion</th>
                <th>IN actual</th>
                <th>OUT actual</th>
                <th>Recaudaciones</th>
              </tr>
            </thead>
            <tbody>
              {localMachines.map((machine) => {
                const machineReadings = data.readings.filter((reading) => reading.machineId === machine.id && reading.status === "CARGADA");
                const machineRevenue = machineReadings.reduce((total, reading) => total + reading.result, 0);
                return (
                  <tr key={machine.id} className={machineStatusClass(machine.status)}>
                    <td>{machine.visibleId}</td>
                    <td>{machine.name}</td>
                    <td>{machine.status}</td>
                    <td>{machine.location}</td>
                    <td>{counter(machine.lastIn)}</td>
                    <td>{counter(machine.lastOut)}</td>
                    <td>{money(machineRevenue)}</td>
                  </tr>
                );
              })}
              {!localMachines.length && (
                <tr>
                  <td colSpan={7}>Sin maquinas asociadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "estados" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Anterior</th>
                <th>Nuevo</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {statusAudits.map(({ event, previous, next }) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{String(previous.status ?? "-")}</td>
                  <td>{String(next.status ?? "-")}</td>
                  <td>{event.action}</td>
                </tr>
              ))}
              {!statusAudits.length && (
                <tr>
                  <td colSpan={4}>Sin cambios de estado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "recaudaciones" && (
        <section className="history-panel">
          <InfoCard tone="green" title="Total recaudado" lines={[money(totalRevenue), `${revenueRows.length} caja(s) registradas`]} />
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Recaudacion</th>
                  <th>Gastos</th>
                  <th>Transferencias</th>
                  <th>Diferencia</th>
                  <th>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {revenueRows.map(({ balance, totals, accumulated: rowAccumulated }) => (
                  <tr key={balance.id}>
                    <td>{balance.operatingDate}</td>
                    <td>{balance.status}</td>
                    <td>{money(totals.resultMachines)}</td>
                    <td>{money(totals.totalExpenses)}</td>
                    <td>{money(totals.totalTransfers)}</td>
                    <td>{money(balance.cashDifference)}</td>
                    <td>{money(rowAccumulated)}</td>
                  </tr>
                ))}
                {!revenueRows.length && (
                  <tr>
                    <td colSpan={7}>Sin recaudaciones registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "auditoria" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Motivo</th>
                <th>Nuevo valor</th>
              </tr>
            </thead>
            <tbody>
              {localAudits.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{auditUserName(data, event)}</td>
                  <td>{event.action}</td>
                  <td>{event.reason || "-"}</td>
                  <td>{event.newValue.slice(0, 120)}</td>
                </tr>
              ))}
              {!localAudits.length && (
                <tr>
                  <td colSpan={5}>Sin auditoria del local.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function AdminLocalEditor({
  data,
  user,
  localId,
  patchData,
  audit,
  setMessage,
  onClose,
  onAddMachine,
}: {
  data: AppData;
  user: User;
  localId: string | null;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
  onAddMachine: (localId: string) => void;
}) {
  const existing = localId ? data.locals.find((local) => local.id === localId) : undefined;
  const [draft, setDraft] = useState({
    id: existing?.id ?? nextShortId(data.locals.map((local) => local.id)),
    name: existing?.name ?? "",
    tenantName: existing?.tenantName ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    address: existing?.address ?? "",
    googleMapsUrl: existing?.googleMapsUrl ?? "",
    images: existing?.images ?? [],
    status: existing?.status ?? "ACTIVO",
  });
  const [selectedWorkshopMachineIds, setSelectedWorkshopMachineIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const isNew = !existing;
  const balancesCount = existing ? data.balances.filter((balance) => balance.localId === existing.id).length : 0;
  const protectedLocal = Boolean(existing && (existing.id === POSEIDON_LOCAL_ID || balancesCount > 0));
  const localMachines = existing ? data.machines.filter((machine) => machine.localId === existing.id) : [];
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID && machine.status !== "DESUSO");

  const updateImageFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      const images = await readLocalImages(files);
      setDraft((current) => ({ ...current, images: [...current.images, ...images] }));
      event.target.value = "";
    } catch {
      setError("No se pudieron cargar las imagenes.");
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const localNumericId = shortNumberId(draft.id);
    if (!localNumericId || !draft.name.trim()) {
      setError("ID numerico corto y nombre son obligatorios.");
      return;
    }
    const duplicate = data.locals.some((local) => local.id !== existing?.id && local.id === localNumericId);
    if (duplicate) {
      setError("Ya existe un local con ese ID.");
      return;
    }
    const closesLocal = existing?.status !== "CERRADO" && draft.status === "CERRADO";
    const machinesToWorkshop = existing ? data.machines.filter((machine) => machine.localId === existing.id) : [];
    const confirmMessage = closesLocal
      ? `El local ${draft.name.trim()} se marcara como CERRADO y ${machinesToWorkshop.length} maquina(s) pasaran automaticamente al Taller. Confirmar accion.`
      : isNew
        ? "Confirmar creacion de este local."
        : "Confirmar cambios de este local.";
    if (!confirmAction(confirmMessage)) return;

    const next: Local = {
      id: existing?.id ?? localNumericId,
      name: draft.name.trim(),
      tenantName: draft.tenantName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim() || "Sin direccion",
      googleMapsUrl: draft.googleMapsUrl.trim(),
      images: draft.images,
      status: draft.status as Local["status"],
    };

    patchData((current) => {
      if (isNew) {
        const selectedMachines = current.machines.filter((machine) => selectedWorkshopMachineIds.includes(machine.id));
        const machines = current.machines.map((machine) =>
          selectedWorkshopMachineIds.includes(machine.id) ? { ...machine, localId: next.id, location: next.name } : machine,
        );
        const history = selectedMachines.flatMap((machine) => [
          machineHistoryEvent(machine, next.id, "MOVIDA", `Asignada desde ${WORKSHOP_LABEL}`, user.id),
          machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Movida al local ${next.name}`, user.id),
        ]);
        return audit(
          {
            ...current,
            currentAccounts: ensureLocalCurrentAccounts({ ...current, locals: [...current.locals, next] }, next.id),
            locals: [...current.locals, next],
            machines,
            machineLocalHistory: [...history, ...current.machineLocalHistory],
          },
          "Crear local",
          "Local",
          next.id,
          "",
          { local: next, machines: selectedMachines.map((machine) => machine.id) },
          "Autorizado",
        );
      }
      const closingMachines = closesLocal ? current.machines.filter((machine) => machine.localId === next.id) : [];
      const machines = closesLocal
        ? current.machines.map((machine) => (machine.localId === next.id ? { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL } : machine))
        : current.machines;
      const history = closingMachines.flatMap((machine) => [
        machineHistoryEvent(machine, next.id, "MOVIDA", `Enviada a ${WORKSHOP_LABEL} por cierre de local`, user.id),
        machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida por cierre de ${next.name}`, user.id),
      ]);
      const locals = current.locals.map((local) => (local.id === next.id ? next : local));
      const currentAccounts = ensureLocalCurrentAccounts({ ...current, locals }, next.id).map((account) => {
        if (account.id === localCashAccountId(next.id)) return createLocalCashCurrentAccount(next, account);
        if (account.id === localBankAccountId(next.id)) return createLocalBankCurrentAccount(next, account);
        return account;
      });
      return audit(
        { ...current, currentAccounts, locals, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        closesLocal ? "Cerrar local" : "Modificar local",
        "Local",
        next.id,
        existing,
        { local: next, machinesMovedToWorkshop: closingMachines.map((machine) => machine.id) },
        "Autorizado",
      );
    });
    setMessage(closesLocal ? "Local cerrado y maquinas enviadas al taller." : isNew ? "Local creado." : "Local modificado.");
    onClose();
  };

  const remove = () => {
    if (!existing || protectedLocal || !confirmAction(`Confirmar baja del local ${existing.name}. Las maquinas volveran al Taller.`)) return;

    patchData((current) => {
      const removedMachines = current.machines.filter((machine) => machine.localId === existing.id);
      const locals = current.locals.filter((local) => local.id !== existing.id);
      const machines = current.machines.map((machine) =>
        machine.localId === existing.id ? { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL } : machine,
      );
      const history = removedMachines.flatMap((machine) => [
        machineHistoryEvent(machine, existing.id, "MOVIDA", `Devuelta a ${WORKSHOP_LABEL} por baja de local`, user.id),
        machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde local ${existing.name}`, user.id),
      ]);
      return audit(
        { ...current, locals, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Quitar local",
        "Local",
        existing.id,
        existing,
        "",
        "Autorizado",
      );
    });
    setMessage("Local quitado.");
    onClose();
  };

  const sendMachineToWorkshop = (machine: Machine) => {
    if (!existing || !confirmAction(`Confirmar envio de ${machine.name} al Taller.`)) return;
    patchData((current) => {
      const previous = current.machines.find((item) => item.id === machine.id);
      const nextMachine = { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
      const machines = current.machines.map((item) => (item.id === machine.id ? nextMachine : item));
      const history = [
        machineHistoryEvent(machine, existing.id, "MOVIDA", `Enviada a ${WORKSHOP_LABEL} desde edicion de local`, user.id),
        machineHistoryEvent(nextMachine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde local ${existing.name}`, user.id),
      ];
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Enviar maquina al taller",
        "Maquina",
        machine.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Maquina enviada al taller.");
  };

  return (
    <Modal title={isNew ? "Agregar local" : `Editar local ${existing.name}`} onClose={onClose} wide>
      <p className="helper">Antes de aplicar una accion se pide reconfirmacion.</p>
      <form className="form-grid" onSubmit={save}>
        <label>
          ID
          <input value={draft.id} disabled={!isNew} inputMode="numeric" maxLength={4} onChange={(event) => setDraft((current) => ({ ...current, id: sanitizeNumberId(event.target.value) }))} />
        </label>
        <label>
          Local
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Locatario
          <input value={draft.tenantName} onChange={(event) => setDraft((current) => ({ ...current, tenantName: event.target.value }))} />
        </label>
        <label>
          Telefono
          <input value={draft.phone} inputMode="numeric" onChange={(event) => setDraft((current) => ({ ...current, phone: sanitizeDigits(event.target.value) }))} />
        </label>
        <label>
          Email
          <input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <label>
          Direccion
          <input value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} />
        </label>
        <label>
          Ubicacion Google
          <input value={draft.googleMapsUrl} onChange={(event) => setDraft((current) => ({ ...current, googleMapsUrl: event.target.value }))} placeholder="Link de Google Maps" />
        </label>
        <label>
          Estado
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Local["status"] }))}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </label>
        <section className="embedded-panel span-2">
          <div className="admin-header">
            <div>
              <h3>Imagenes del local</h3>
              <p className="helper">En prueba se guarda el nombre del archivo; el archivo real no se persiste en localStorage.</p>
            </div>
            <label className="file-button">
              Subir imagenes
              <input type="file" accept="image/*" multiple onChange={updateImageFiles} />
            </label>
          </div>
          <div className="image-strip">
            {draft.images.map((image) => (
              <figure key={image.id}>
                {image.dataUrl ? <img src={image.dataUrl} alt={image.name} /> : <div className="image-placeholder">Archivo</div>}
                <figcaption>{image.name}</figcaption>
                <button className="link-button" type="button" onClick={() => setDraft((current) => ({ ...current, images: current.images.filter((item) => item.id !== image.id) }))}>
                  Quitar
                </button>
              </figure>
            ))}
            {!draft.images.length && <p className="helper">Sin imagenes cargadas.</p>}
          </div>
        </section>
        <section className="embedded-panel span-2">
          <div className="admin-header">
            <div>
              <h3>Maquinas del local</h3>
              <p className="helper">{isNew ? "Selecciona maquinas disponibles en Taller." : "Podes sumar maquinas del Taller sin salir de esta ventana."}</p>
            </div>
            {isNew ? (
              <span>{workshopMachines.length} disponibles</span>
            ) : (
              <button className="button primary compact" type="button" onClick={() => onAddMachine(existing.id)}>
                Agregar maquina
              </button>
            )}
          </div>
          {isNew ? (
            <div className="table-wrap compact-table">
              <table className="data-table compact-data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>ID</th>
                    <th>Maquina</th>
                    <th>Estado</th>
                    <th>IN</th>
                    <th>OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {workshopMachines.map((machine) => (
                    <tr key={machine.id} className={machineStatusClass(machine.status)}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedWorkshopMachineIds.includes(machine.id)}
                          onChange={(event) =>
                            setSelectedWorkshopMachineIds((current) =>
                              event.target.checked ? [...current, machine.id] : current.filter((id) => id !== machine.id),
                            )
                          }
                        />
                      </td>
                      <td>{machine.visibleId}</td>
                      <td>{machine.name}</td>
                      <td>{machine.status}</td>
                      <td>{counter(machine.lastIn)}</td>
                      <td>{counter(machine.lastOut)}</td>
                    </tr>
                  ))}
                  {!workshopMachines.length && (
                    <tr>
                      <td colSpan={6}>No hay maquinas disponibles en Taller.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mini-list">
              {localMachines.map((machine) => (
                <div key={machine.id}>
                  <span>
                    {machine.visibleId} - {machine.name}
                  </span>
                  <em>{machine.status}</em>
                  <em>{machine.location}</em>
                  <button className="button muted compact" type="button" onClick={() => sendMachineToWorkshop(machine)}>
                    Enviar al taller
                  </button>
                </div>
              ))}
              {!localMachines.length && <p className="helper">No hay maquinas asociadas.</p>}
            </div>
          )}
        </section>
        {error && <p className="validation error span-2">{error}</p>}
        <div className="form-actions span-2">
          <div className="button-row end">
            {!isNew && (
              <button className="button danger" type="button" disabled={protectedLocal} onClick={remove}>
                Quitar local
              </button>
            )}
            <button className="button success" type="submit">
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AdminTable({
  title,
  rows,
  form,
  fields,
  selectRole,
}: {
  title: string;
  data: AppData;
  rows: string[][];
  form: (event: FormEvent<HTMLFormElement>) => void;
  fields: string[];
  selectRole?: boolean;
}) {
  return (
    <div className="admin-layout">
      <section className="form-card">
        <h2>Crear {title.toLowerCase()}</h2>
        <form className="form-stack" onSubmit={form}>
          {fields.map((field) => (
            <label key={field}>
              {field}
              <input name={field} required={field !== "password"} />
            </label>
          ))}
          {selectRole && (
            <label>
              role
              <select name="role">
                <option value="CAJERO">Cajero</option>
                <option value="ENCARGADO">Encargado</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </label>
          )}
          <button className="button success" type="submit">
            Guardar
          </button>
        </form>
      </section>
      <section className="table-wrap grow">
        <table className="data-table">
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Differences({
  data,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  type DifferenceDraft = { status: DifferenceStatus | ""; note: string };
  const [drafts, setDrafts] = useState<Record<string, DifferenceDraft>>({});
  const [error, setError] = useState("");
  const canManage = user.role === "ADMINISTRADOR" || user.role === "ENCARGADO";
  const visibleLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const balances = data.balances
    .filter((balance) => balance.status === "CERRADO" && balanceHasDifference(data, balance) && (!visibleLocalIds || visibleLocalIds.has(balance.localId)))
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)));
  const pending = balances.filter(differenceIsPending).length;
  const managed = balances.length - pending;
  const totalCashDifference = balances.reduce((total, balance) => total + cashDifferenceForBalance(data, balance), 0);
  const totalBankDifference = balances.reduce((total, balance) => total + bankDifferenceForBalance(balance), 0);
  const updateDraft = (id: string, patch: Partial<DifferenceDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        status: current[id]?.status ?? "",
        note: current[id]?.note ?? "",
        ...patch,
      },
    }));
    setError("");
  };
  const update = (id: string) => {
    if (!canManage) {
      setError("Solo administrador o encargado pueden gestionar diferencias.");
      return;
    }
    const draft = drafts[id] ?? { status: "", note: "" };
    const status = draft.status;
    const reviewNote = draft.note.trim();
    if (!status) {
      setError("Selecciona una accion de gestion para la diferencia.");
      return;
    }
    if (!reviewNote) {
      setError("La observacion del encargado/admin es obligatoria.");
      return;
    }
    const reviewedAt = nowIso();
    patchData((current) => {
      const previous = current.balances.find((balance) => balance.id === id);
      if (!previous) return current;
      const next = {
        ...previous,
        differenceStatus: status,
        differenceReviewedBy: user.id,
        differenceReviewedAt: reviewedAt,
        differenceReviewNote: reviewNote,
      };
      const balancesNext = current.balances.map((balance) => (balance.id === id ? next : balance));
      return audit(
        { ...current, balances: balancesNext },
        "Gestionar diferencia de caja",
        "DiferenciaCaja",
        id,
        previous,
        { status, reviewNote, reviewedBy: user.name, reviewedAt },
        reviewNote,
      );
    });
    setDrafts((current) => ({ ...current, [id]: { status: "", note: "" } }));
    setMessage("Diferencia gestionada y auditada.");
    setError("");
  };
  const rowClass = (balance: Balance) => {
    const status = balance.differenceStatus ?? "PENDIENTE";
    if (status === "PENDIENTE") return "status-error";
    if (status === "REVISADA") return "status-maintenance";
    return "status-active";
  };

  return (
    <section className="admin-focus differences-page detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Las diferencias no modifican el resultado economico. Se revisan y quedan auditadas por encargado o administrador.</p>
        </div>
      </div>
      <div className="card-grid three">
        <InfoCard tone={pending > 0 ? "red" : "green"} title="Pendientes" lines={[`${pending} diferencia(s)`, "Requieren gestion"]} />
        <InfoCard tone={managed > 0 ? "blue" : "orange"} title="Gestionadas" lines={[`${managed} recaudacion(es)`, "Con revision auditada"]} />
        <InfoCard
          tone="orange"
          title="Impacto contable"
          lines={["No mueve saldos automaticamente", "No cambia el resultado economico", "Cualquier ajuste va aparte"]}
        />
      </div>
      <div className="card-grid three difference-totals-grid">
        <InfoCard tone={totalCashDifference === 0 ? "green" : "red"} title="Diferencia efectivo" lines={[money(totalCashDifference), "Suma de controles fisicos"]} />
        <InfoCard tone={totalBankDifference === 0 ? "green" : "red"} title="Diferencia banco" lines={[money(totalBankDifference), "Suma de banco/transferencias"]} />
        <InfoCard tone="blue" title="Alcance" lines={[user.role === "ADMINISTRADOR" ? "Todos los locales" : "Locales asignados", "Solo cajas cerradas con diferencia"]} />
      </div>
      {error ? <p className="validation error">{error}</p> : null}
      <div className="table-wrap">
        <table className="data-table difference-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Local</th>
              <th>Efectivo</th>
              <th>Banco</th>
              <th>Estado</th>
              <th>Impacto en recaudacion</th>
              <th>Obs. cierre</th>
              <th>Ultima gestion</th>
              <th>Gestion obligatoria</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => {
              const draft = drafts[balance.id] ?? { status: "", note: "" };
              const cashDifference = cashDifferenceForBalance(data, balance);
              const bankDifference = bankDifferenceForBalance(balance);
              const totals = totalsForBalance(data, balance.id);
              const declaredBank = balance.declaredBank ?? balance.nextBankBase ?? 0;
              const expectedBank = declaredBank - bankDifference;
              return (
              <tr key={balance.id} className={rowClass(balance)}>
                <td>{balanceVisibleId(data, balance)}</td>
                <td>{balance.operatingDate}</td>
                <td>{localName(data, balance.localId)}</td>
                <td className="difference-money-cell">
                  <strong className={cashDifference === 0 ? "money-positive" : "money-negative"}>{money(cashDifference)}</strong>
                  <span>Esp. {money(totals.expectedCash)} / Dec. {money(balance.declaredCash)}</span>
                </td>
                <td className="difference-money-cell">
                  <strong className={bankDifference === 0 ? "money-positive" : "money-negative"}>{money(bankDifference)}</strong>
                  <span>Esp. {money(expectedBank)} / Dec. {money(declaredBank)}</span>
                </td>
                <td>{balance.differenceStatus ?? "PENDIENTE"}</td>
                <td className="long-cell">{differenceActionImpact(balance.differenceStatus ?? "PENDIENTE")}</td>
                <td className="long-cell">{balance.differenceNote || "-"}</td>
                <td className="long-cell">
                  {balance.differenceReviewNote ? (
                    <>
                      <strong>{userDisplayName(data, balance.differenceReviewedBy)}</strong>
                      <span>{balance.differenceReviewedAt ? ` - ${formatDateTime(balance.differenceReviewedAt)}` : ""}</span>
                      <p>{balance.differenceReviewNote}</p>
                    </>
                  ) : (
                    "Sin gestion"
                  )}
                </td>
                <td>
                  <div className="difference-review-form">
                    <select value={draft.status} onChange={(event) => updateDraft(balance.id, { status: event.target.value as DifferenceStatus | "" })} disabled={!canManage}>
                      <option value="">Elegir accion</option>
                      <option value="REVISADA">Revisada</option>
                      <option value="RESUELTA">Resuelta</option>
                      <option value="AJUSTADA">Ajustada</option>
                      <option value="ANULADA">Anulada</option>
                    </select>
                    <p className="difference-impact-note">{differenceActionImpact(draft.status)}</p>
                    <textarea
                      value={draft.note}
                      onChange={(event) => updateDraft(balance.id, { note: event.target.value })}
                      placeholder="Observacion obligatoria"
                      disabled={!canManage}
                    />
                    <button className="button primary compact" type="button" onClick={() => update(balance.id)} disabled={!canManage}>
                      Guardar revision
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {!balances.length && (
              <tr>
                <td colSpan={10}>No hay diferencias de caja para gestionar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Audit({ data }: { data: AppData }) {
  type AuditSortKey = "createdAt" | "user" | "action" | "entity";
  const [sort, setSort] = useState<SortState<AuditSortKey>>({ key: "createdAt", direction: "desc" });
  const userLogs: AuditEvent[] = data.users.map((user) => ({
    id: `user-log-${user.id}`,
    userId: user.id,
    userName: user.name,
    actualRole: user.role,
    actorRole: user.role,
    action: "Usuario registrado",
    entity: "Usuario",
    entityId: user.id,
    previousValue: "",
    newValue: JSON.stringify({ username: user.username, role: user.role, status: user.status }),
    reason: "Log de usuario",
    createdAt: data.audit.find((event) => event.entity === "Usuario" && event.entityId === user.id)?.createdAt ?? nowIso(),
  }));
  const rows = [...data.audit, ...userLogs];
  const auditValue = (event: AuditEvent, key: AuditSortKey): string | number => {
    if (key === "createdAt") return new Date(event.createdAt).getTime();
    if (key === "user") return auditUserName(data, event);
    if (key === "action") return event.action;
    return event.entity;
  };
  const sortedRows = [...rows].sort((a, b) => {
    const result = compareValues(auditValue(a, sort.key), auditValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });

  return (
    <>
      <h2>Bitacora de auditoria</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {(["createdAt", "user", "action", "entity"] as AuditSortKey[]).map((key) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key))}>
                    {key === "createdAt" ? "Fecha/hora" : key === "user" ? "Usuario" : key === "action" ? "Accion" : "Entidad"}
                    {sortIndicator(sort, key)}
                  </button>
                </th>
              ))}
              <th>Funcion</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((event) => (
              <tr key={event.id}>
                <td>{formatDateTime(event.createdAt)}</td>
                <td>{auditUserName(data, event)}</td>
                <td>{event.action}</td>
                <td>{event.entity}</td>
                <td>{event.actorRole ? roleLabels[event.actorRole] : "-"}</td>
                <td>{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Periodic({
  data,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const rangeForType = (type: PeriodicClosureType) => {
    const base = new Date();
    if (type === "MENSUAL") {
      return {
        start: formatInputDate(new Date(base.getFullYear(), base.getMonth(), 1)),
        end: formatInputDate(endOfMonth(base)),
      };
    }
    if (type === "QUINCENAL") {
      const firstHalf = base.getDate() <= 15;
      return {
        start: formatInputDate(new Date(base.getFullYear(), base.getMonth(), firstHalf ? 1 : 16)),
        end: formatInputDate(firstHalf ? new Date(base.getFullYear(), base.getMonth(), 15) : endOfMonth(base)),
      };
    }
    if (type === "SEMANAL") {
      const weekDay = base.getDay() || 7;
      const monday = addDays(base, 1 - weekDay);
      return { start: formatInputDate(monday), end: formatInputDate(addDays(monday, 6)) };
    }
    return { start: today(), end: today() };
  };
  const [closureType, setClosureType] = useState<PeriodicClosureType>("MENSUAL");
  const initialRange = rangeForType("MENSUAL");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const allowedLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const balanceDate = (balance: Balance) => balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
  const closedBalances = data.balances
    .filter((balance) => balance.status === "CERRADO" && (!allowedLocalIds || allowedLocalIds.has(balance.localId)))
    .filter((balance) => {
      const date = balanceDate(balance);
      return date >= startDate && date <= endDate;
    })
    .sort((a, b) => balanceDate(a).localeCompare(balanceDate(b)) || balanceVisibleId(data, a).localeCompare(balanceVisibleId(data, b)));
  const summarizeBalances = (sourceData: AppData, balances: Balance[]) =>
    balances.reduce(
      (acc, balance) => {
        const totals = totalsForBalance(sourceData, balance.id);
        const gifts = totals.giftCash + totals.giftCredit;
        return {
          resultMachines: acc.resultMachines + totals.resultMachines,
          totalExpenses: acc.totalExpenses + totals.totalExpenses,
          totalSalaries: acc.totalSalaries + totals.totalSalaries,
          totalGifts: acc.totalGifts + gifts,
          totalOutflows: acc.totalOutflows + totals.totalExpenses + totals.totalSalaries + gifts,
          commercialResult: acc.commercialResult + totals.commercialResult,
          totalTransfers: acc.totalTransfers + totals.totalTransfers,
          totalWithdrawals: acc.totalWithdrawals + totals.totalWithdrawals,
          totalContributions: acc.totalContributions + totals.totalCapitalContributions,
          cashDifference: acc.cashDifference + cashDifferenceForBalance(sourceData, balance),
          bankDifference: acc.bankDifference + bankDifferenceForBalance(balance),
          pendingDifferences: acc.pendingDifferences + (balanceHasDifference(sourceData, balance) && differenceIsPending(balance) ? 1 : 0),
        };
      },
      {
        resultMachines: 0,
        totalExpenses: 0,
        totalSalaries: 0,
        totalGifts: 0,
        totalOutflows: 0,
        commercialResult: 0,
        totalTransfers: 0,
        totalWithdrawals: 0,
        totalContributions: 0,
        cashDifference: 0,
        bankDifference: 0,
        pendingDifferences: 0,
      },
    );
  const totals = summarizeBalances(data, closedBalances);
  const savedClosures = data.periodicClosures
    .filter((closure) => !allowedLocalIds || allowedLocalIds.has(closure.localId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const changeClosureType = (type: PeriodicClosureType) => {
    setClosureType(type);
    if (type !== "PERSONALIZADO") {
      const range = rangeForType(type);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };
  const nextPeriodicVisibleId = (current: AppData) => {
    const max = current.periodicClosures
      .map((closure) => {
        const match = String(closure.visibleId ?? "").match(/PER-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0);
    return `PER-${max + 1}`;
  };
  const saveClosure = () => {
    if (startDate > endDate) {
      setError("La fecha inicial no puede ser mayor a la fecha final.");
      return;
    }
    if (!closedBalances.length) {
      setError("No hay cajas cerradas dentro del periodo seleccionado.");
      return;
    }
    patchData((current) => {
      const currentBalances = current.balances
        .filter((balance) => balance.status === "CERRADO" && (!allowedLocalIds || allowedLocalIds.has(balance.localId)))
        .filter((balance) => {
          const date = balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
          return date >= startDate && date <= endDate;
        });
      const currentTotals = summarizeBalances(current, currentBalances);
      const localId = user.localIds[0] ?? POSEIDON_LOCAL_ID;
      const closure: PeriodicClosure = {
        id: uid("periodic"),
        visibleId: nextPeriodicVisibleId(current),
        localId,
        type: closureType,
        startDate,
        endDate,
        balanceIds: currentBalances.map((balance) => balance.id),
        ...currentTotals,
        status: "GENERADO",
        note: note.trim(),
        createdBy: user.id,
        createdAt: nowIso(),
      };
      return audit(
        { ...current, periodicClosures: [closure, ...current.periodicClosures] },
        "Generar cierre periodico",
        "CierrePeriodico",
        closure.id,
        "",
        closure,
        closure.note,
      );
    });
    setMessage("Cierre periodico generado y auditado.");
    setNote("");
    setError("");
  };
  const annulClosure = (closure: PeriodicClosure) => {
    if (!confirmAction(`Anular cierre periodico ${closure.visibleId}?`)) return;
    patchData((current) => {
      const previous = current.periodicClosures.find((item) => item.id === closure.id);
      const periodicClosures = current.periodicClosures.map((item) =>
        item.id === closure.id ? { ...item, status: "ANULADO" as PeriodicClosureStatus } : item,
      );
      const next = periodicClosures.find((item) => item.id === closure.id);
      return audit({ ...current, periodicClosures }, "Anular cierre periodico", "CierrePeriodico", closure.id, previous, next, "Anulacion de control");
    });
    setMessage("Cierre periodico anulado.");
  };

  return (
    <section className="admin-focus periodic-page detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Consolidado semanal, quincenal, mensual o por fechas. Guarda una foto auditada del periodo seleccionado.</p>
        </div>
        <div className="admin-header-actions">
          <span>{closedBalances.length} caja(s) incluidas</span>
          <button className="button success compact" type="button" onClick={saveClosure}>
            Guardar cierre
          </button>
        </div>
      </div>
      {error && <p className="validation error">{error}</p>}
      <div className="periodic-controls">
        <label>
          Tipo de cierre
          <select value={closureType} onChange={(event) => changeClosureType(event.target.value as PeriodicClosureType)}>
            <option value="SEMANAL">Semanal</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
            <option value="PERSONALIZADO">Entre fechas</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <label className="periodic-note">
          Observacion
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional para auditoria" />
        </label>
      </div>
      <div className="card-grid three periodic-kpis">
        <InfoCard tone={totals.commercialResult >= 0 ? "green" : "red"} title="Resultado economico" lines={[money(totals.commercialResult), "Maquinas - gastos - salarios - regalos"]} />
        <InfoCard tone="blue" title="Resultado maquinas" lines={[money(totals.resultMachines), `${closedBalances.length} recaudacion(es)`]} />
        <InfoCard tone="red" title="Salida total" lines={[money(totals.totalOutflows), `Gastos ${money(totals.totalExpenses)} / Salarios ${money(totals.totalSalaries)} / Regalos ${money(totals.totalGifts)}`]} />
        <InfoCard tone="blue" title="Transferencias" lines={[money(totals.totalTransfers), "Movimientos bancarios"]} />
        <InfoCard tone="orange" title="Retiros / aportes" lines={[`Retiros ${money(totals.totalWithdrawals)}`, `Aportes ${money(totals.totalContributions)}`]} />
        <InfoCard
          tone={totals.pendingDifferences > 0 || totals.cashDifference !== 0 || totals.bankDifference !== 0 ? "red" : "green"}
          title="Diferencias"
          lines={[`Efectivo ${money(totals.cashDifference)}`, `Banco ${money(totals.bankDifference)}`, `${totals.pendingDifferences} pendiente(s)`]}
        />
      </div>
      <div className="periodic-layout">
        <section className="periodic-panel">
          <div className="section-toolbar">
            <div>
              <h3>Cajas incluidas</h3>
              <p>Solo cajas cerradas dentro del rango seleccionado.</p>
            </div>
          </div>
          <div className="table-wrap grow">
            <table className="data-table admin-data-table periodic-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Local</th>
                  <th>Resultado maquinas</th>
                  <th>Gastos</th>
                  <th>Salarios</th>
                  <th>Regalos</th>
                  <th>Resultado final</th>
                  <th>Dif. efectivo</th>
                  <th>Dif. banco</th>
                  <th>Estado dif.</th>
                </tr>
              </thead>
              <tbody>
                {closedBalances.map((balance) => {
                  const balanceTotals = totalsForBalance(data, balance.id);
                  const gifts = balanceTotals.giftCash + balanceTotals.giftCredit;
                  const hasDifference = balanceHasDifference(data, balance);
                  return (
                    <tr key={balance.id} className={hasDifference && differenceIsPending(balance) ? "status-error" : undefined}>
                      <td>{balanceVisibleId(data, balance)}</td>
                      <td>{balanceDate(balance)}</td>
                      <td>{localName(data, balance.localId)}</td>
                      <td>{money(balanceTotals.resultMachines)}</td>
                      <td>{money(balanceTotals.totalExpenses)}</td>
                      <td>{money(balanceTotals.totalSalaries)}</td>
                      <td>{money(gifts)}</td>
                      <td className={balanceTotals.commercialResult >= 0 ? "money-positive" : "money-negative"}>{money(balanceTotals.commercialResult)}</td>
                      <td>{money(cashDifferenceForBalance(data, balance))}</td>
                      <td>{money(bankDifferenceForBalance(balance))}</td>
                      <td>{hasDifference ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIF."}</td>
                    </tr>
                  );
                })}
                {!closedBalances.length && (
                  <tr>
                    <td colSpan={11}>No hay cajas cerradas en el periodo seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="periodic-panel">
          <div className="section-toolbar">
            <div>
              <h3>Cierres guardados</h3>
              <p>Fotos auditadas de periodos ya generados.</p>
            </div>
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Periodo</th>
                  <th>Resultado</th>
                  <th>Diferencias</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {savedClosures.map((closure) => (
                  <tr key={closure.id} className={closure.status === "ANULADO" ? "status-inactive" : undefined}>
                    <td>{closure.visibleId}</td>
                    <td>{closure.type}</td>
                    <td>
                      {closure.startDate} a {closure.endDate}
                    </td>
                    <td className={closure.commercialResult >= 0 ? "money-positive" : "money-negative"}>{money(closure.commercialResult)}</td>
                    <td>{money(closure.cashDifference + closure.bankDifference)}</td>
                    <td>{closure.status}</td>
                    <td>
                      {closure.status === "GENERADO" ? (
                        <button className="button muted compact" type="button" onClick={() => annulClosure(closure)}>
                          Anular
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {!savedClosures.length && (
                  <tr>
                    <td colSpan={7}>No hay cierres periodicos guardados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function EmptyState({ title, text, action, actionLabel = "Abrir caja" }: { title: string; text: string; action?: () => void; actionLabel?: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="button primary" onClick={action}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}

export default App;


