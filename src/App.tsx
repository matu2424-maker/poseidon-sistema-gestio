import { ChangeEvent, FocusEvent, FormEvent, ReactNode, useEffect, useState } from "react";

type Role = "CAJERO" | "ENCARGADO" | "ADMINISTRADOR";
type BalanceStatus = "EN_PROCESO" | "CERRADO" | "AJUSTADO" | "ANULADO";
type MachineStatus = "ACTIVA" | "INACTIVA" | "MANTENIMIENTO" | "DESUSO";
type ReadingStatus = "PENDIENTE" | "CARGADA" | "SIN_LECTURA" | "FUERA_DE_SERVICIO";
type MovementStatus = "ACTIVO" | "ANULADO";
type DifferenceStatus = "PENDIENTE" | "REVISADA" | "RESUELTA" | "AJUSTADA" | "ANULADA";
type StaffStatus = "ACTIVO" | "BAJA" | "PAPELERA";
type ClientStatus = "ACTIVO" | "INACTIVO" | "PAPELERA";
type SalaryType = "MENSUAL" | "JORNAL" | "HORA";
type SalarySettlementStatus = "BORRADOR" | "CONFIRMADA" | "ANULADA";
type SalaryConcept = "SUELDO" | "ADELANTO" | "EXTRA" | "AGUINALDO" | "SALARIO_VACACIONAL";
type WeekDay = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";
type CurrentAccountKind = "PERSONAL" | "TRANSFERENCIAS" | "LOCAL_EFECTIVO" | "LOCAL_BANCO";
type CurrentAccountStatus = "ACTIVA" | "INACTIVA";
type AccountMovementSource = "SUELDO" | "TRANSFERENCIA" | "GASTO" | "REGALO" | "RETIRO" | "APORTE" | "RESULTADO_MAQUINAS" | "AJUSTE";
type AccountMovementDirection = "ENTRADA" | "SALIDA";
type CapitalMovementType = "RETIRO" | "APORTE";
type CapitalMovementMedium = "EFECTIVO" | "TRANSFERENCIA";
type CapitalMovementPerson = "RICARDO" | "MATHIAS";
type CapitalMovementTiming = "APERTURA" | "OPERATIVO" | "CIERRE";
type Screen =
  | "welcome"
  | "login"
  | "panel"
  | "open-cash"
  | "counters"
  | "expenses"
  | "transfers"
  | "gifts"
  | "salary-payments"
  | "capital-movements"
  | "cashier-clients"
  | "close-cash"
  | "reports"
  | "admin-users"
  | "admin-staff"
  | "admin-salary-settlements"
  | "admin-clients"
  | "admin-current-accounts"
  | "admin-trash"
  | "admin-expense-categories"
  | "admin-machines"
  | "workshop"
  | "admin-machine-edit"
  | "admin-locals"
  | "admin-local-edit"
  | "differences"
  | "audit"
  | "periodic";

type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  status: "ACTIVO" | "INACTIVO";
  localIds: string[];
};

type Local = {
  id: string;
  name: string;
  tenantName: string;
  phone: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  images: LocalImage[];
  status: "ACTIVO" | "INACTIVO" | "CERRADO";
};

type StaffSchedule = {
  day: WeekDay;
  start: string;
  end: string;
  rest: boolean;
};

type StaffMember = {
  id: string;
  visibleId: string;
  firstName: string;
  lastName: string;
  documentId: string;
  address: string;
  phone: string;
  email: string;
  birthDate: string;
  hireDate: string;
  position: string;
  localId: string;
  salaryType: SalaryType;
  nominalSalary: number;
  salaryAdvanceBalance: number;
  vacationDays: number;
  usedVacationDays: number;
  estimatedAguinaldo: number;
  estimatedVacationSalary: number;
  emergencyContact: string;
  bankAccount: string;
  schedule: StaffSchedule[];
  notes: string;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
  terminatedAt?: string;
  deletedAt?: string;
};

type SalarySettlement = {
  id: string;
  period: string;
  balanceId?: string;
  staffId: string;
  staffName: string;
  localId: string;
  baseSalary: number;
  advances: number;
  extraAmount: number;
  extraConcept: string;
  aguinaldo: number;
  vacationSalary: number;
  otherDeductions: number;
  totalToPay: number;
  concept: SalaryConcept;
  notes: string;
  status: SalarySettlementStatus;
  createdAt: string;
  updatedAt: string;
};

type Client = {
  id: string;
  visibleId: string;
  name: string;
  documentId: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  localId: string;
  category: "GENERAL" | "FRECUENTE" | "VIP";
  notes: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

type CurrentAccount = {
  id: string;
  kind: CurrentAccountKind;
  entityId?: string;
  name: string;
  status: CurrentAccountStatus;
  createdAt: string;
  updatedAt: string;
};

type AccountMovement = {
  id: string;
  accountId: string;
  balanceId?: string;
  sourceType: AccountMovementSource;
  sourceId: string;
  direction: AccountMovementDirection;
  concept: string;
  amount: number;
  detail: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type CapitalMovement = {
  id: string;
  balanceId: string;
  localId: string;
  type: CapitalMovementType;
  medium: CapitalMovementMedium;
  timing: CapitalMovementTiming;
  person: CapitalMovementPerson;
  amount: number;
  note: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type LocalImage = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
};

type Machine = {
  id: string;
  visibleId: string;
  name: string;
  localId: string;
  location: string;
  lastIn: number;
  lastOut: number;
  status: MachineStatus;
  notes: string;
};

type Balance = {
  id: string;
  visibleId?: string;
  localId: string;
  operatingDate: string;
  status: BalanceStatus;
  initialFund: number;
  initialBankFund?: number;
  initialNote: string;
  openedBy: string;
  openedAt: string;
  closedBy?: string;
  closedAt?: string;
  declaredCash?: number;
  nextBase?: number;
  nextBankBase?: number;
  withdrawal?: number;
  finalWithdrawalCash?: number;
  finalWithdrawalBank?: number;
  cashDifference?: number;
  differenceNote?: string;
  differenceStatus?: DifferenceStatus;
};

type Reading = {
  id: string;
  balanceId: string;
  machineId: string;
  inPrevious: number;
  inActual: number | null;
  outPrevious: number;
  outActual: number | null;
  result: number;
  status: ReadingStatus;
  observation: string;
  updatedBy: string;
  updatedAt: string;
};

type Expense = {
  id: string;
  balanceId: string;
  category: string;
  subcategory: string;
  amount: number;
  description: string;
  receipt: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptDataUrl?: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type ExpenseCategory = {
  id: string;
  name: string;
  subcategories: string[];
  status: "ACTIVA" | "INACTIVA";
};

type Transfer = {
  id: string;
  balanceId: string;
  clientId?: string;
  receipt: string;
  name: string;
  amount: number;
  account: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type Gift = {
  id: string;
  balanceId: string;
  clientId?: string;
  clientIds?: string[];
  type: "EFECTIVO" | "CREDITO" | "MIXTO";
  cashAmount: number;
  creditAmount: number;
  reference: string;
  description: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

type AuditEvent = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  reason: string;
  createdAt: string;
};

type MachineLocalHistory = {
  id: string;
  machineId: string;
  machineVisibleId: string;
  machineName: string;
  localId: string;
  action: "AGREGADA" | "MODIFICADA" | "MOVIDA" | "QUITADA" | "CONTADORES" | "RESET";
  detail: string;
  createdAt: string;
  userId: string;
};

type AppData = {
  users: User[];
  staff: StaffMember[];
  salarySettlements: SalarySettlement[];
  clients: Client[];
  currentAccounts: CurrentAccount[];
  accountMovements: AccountMovement[];
  capitalMovements: CapitalMovement[];
  locals: Local[];
  machines: Machine[];
  balances: Balance[];
  readings: Reading[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  transfers: Transfer[];
  gifts: Gift[];
  audit: AuditEvent[];
  machineLocalHistory: MachineLocalHistory[];
};

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
const auditUserName = (data: AppData, event: AuditEvent) => event.userName || data.users.find((user) => user.id === event.userId)?.name || "Sistema";
const localOptionName = (local: Local) => `${local.id} - ${local.name}`;
const staffAccountId = (staffId: string) => `account-staff-${staffId}`;
const localCashAccountId = (localId: string) => `account-local-${localId}-efectivo`;
const localBankAccountId = (localId: string) => `account-local-${localId}-banco`;
const localAccountIdForMedium = (localId: string, medium: CapitalMovementMedium) =>
  medium === "EFECTIVO" ? localCashAccountId(localId) : localBankAccountId(localId);
const salarySettlementAmount = (settlement: SalarySettlement) => {
  const totalCash = Number(settlement.totalToPay ?? 0) + Number(settlement.advances ?? 0);
  if (totalCash !== 0) return totalCash;
  return (
    Number(settlement.baseSalary ?? 0) +
    Number(settlement.extraAmount ?? 0) +
    Number(settlement.aguinaldo ?? 0) +
    Number(settlement.vacationSalary ?? 0)
  );
};
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

function salaryAccountMovement(settlement: SalarySettlement, userId: string): AccountMovement {
  return {
    id: `account-movement-salary-${settlement.id}`,
    accountId: staffAccountId(settlement.staffId),
    balanceId: settlement.balanceId,
    sourceType: "SUELDO",
    sourceId: settlement.id,
    direction: "SALIDA",
    concept: settlement.concept,
    amount: salarySettlementAmount(settlement),
    detail: settlement.staffName,
    status: settlement.status === "CONFIRMADA" ? "ACTIVO" : "ANULADO",
    userId,
    createdAt: settlement.createdAt,
  };
}

function localSalaryAccountMovement(settlement: SalarySettlement, userId: string): AccountMovement {
  return {
    id: `account-movement-local-salary-${settlement.id}`,
    accountId: localCashAccountId(settlement.localId),
    balanceId: settlement.balanceId,
    sourceType: "SUELDO",
    sourceId: settlement.id,
    direction: "SALIDA",
    concept: settlement.concept,
    amount: salarySettlementAmount(settlement),
    detail: settlement.staffName,
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
  return sort.direction === "asc" ? " ↑" : " ↓";
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

function readUploadFile(file: File): { name: string; type: string; size: number } {
  return { name: file.name, type: file.type, size: file.size };
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
      documentId: "",
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
      documentId: "",
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
    localId: WORKSHOP_LOCAL_ID,
    location: WORKSHOP_LABEL,
    lastIn: 0,
    lastOut: 0,
    status: index === 2 ? "MANTENIMIENTO" : "ACTIVA",
    notes: "",
  }));

  const staff = createDemoStaff(local.id);
  const clients = createDemoClients(local.id);

  return {
    users: createDemoUsers(local.id),
    staff,
    salarySettlements: [],
    clients,
    currentAccounts: [
      createLocalCashCurrentAccount(local),
      createLocalBankCurrentAccount(local),
      createTransferCurrentAccount(),
      ...staff.map((staffMember) => createStaffCurrentAccount(staffMember)),
    ],
    accountMovements: [],
    capitalMovements: [],
    locals: [local],
    machines,
    balances: [],
    readings: [],
    expenseCategories: defaultExpenseCategories,
    expenses: [],
    transfers: [],
    gifts: [],
    audit: [],
    machineLocalHistory: machines.map((machine) =>
      machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "AGREGADA", "Carga inicial en taller", "system"),
    ),
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
    clients: Array.isArray(data.clients) ? data.clients : seed.clients,
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
  const clients = source.clients.map((item, index) => ({
    ...item,
    visibleId: shortNumberId(item.visibleId) || String(index + 1),
    name: item.name ?? "",
    documentId: item.documentId ?? "",
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
  }));
  const salarySettlements = source.salarySettlements.map((item) => ({
    ...item,
    period: item.period ?? today().slice(0, 7),
    balanceId: item.balanceId,
    staffName: item.staffName ?? staffFullName(staff.find((staffItem) => staffItem.id === item.staffId) ?? { firstName: "", lastName: "" }),
    localId: mapLocalId(item.localId ?? POSEIDON_LOCAL_ID),
    baseSalary: Number(item.baseSalary ?? 0),
    advances: Number(item.advances ?? 0),
    extraAmount: Number(item.extraAmount ?? 0),
    extraConcept: item.extraConcept ?? "",
    aguinaldo: Number(item.aguinaldo ?? 0),
    vacationSalary: Number(item.vacationSalary ?? 0),
    otherDeductions: Number(item.otherDeductions ?? 0),
    totalToPay: Number(item.totalToPay ?? 0),
    concept: item.concept ?? "SUELDO",
    notes: item.notes ?? "",
    status: item.status ?? "BORRADOR",
    createdAt: item.createdAt ?? nowIso(),
    updatedAt: item.updatedAt ?? nowIso(),
  }));
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
    nextBankBase: balance.nextBankBase === undefined ? undefined : Number(balance.nextBankBase),
    finalWithdrawalCash: Number(balance.finalWithdrawalCash ?? 0),
    finalWithdrawalBank: Number(balance.finalWithdrawalBank ?? 0),
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
    movementById.set(`account-movement-salary-${settlement.id}`, salaryAccountMovement(settlement, "system"));
    if (accountIds.has(localCashAccountId(settlement.localId))) {
      movementById.set(`account-movement-local-salary-${settlement.id}`, localSalaryAccountMovement(settlement, "system"));
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
  }));
  const machineLocalHistory = source.machineLocalHistory.length
    ? source.machineLocalHistory.map((event) => ({ ...event, localId: mapLocalId(event.localId) }))
    : machines.map((machine) => machineHistoryEvent(machine, machine.localId, "AGREGADA", "Carga inicial migrada", "system"));
  return {
    ...source,
    users,
    staff,
    salarySettlements,
    clients,
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
        ["Total IN", String(totals.totalIn)],
        ["Total OUT", String(totals.totalOut)],
        ["Resultado maquinas", String(totals.resultMachines)],
        ["Gastos", String(totals.totalExpenses)],
        ["Sueldos", String(totals.totalSalaries)],
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
        ["Banco proxima caja", String(balance.nextBankBase ?? 0)],
        ["Retiro final efectivo", String(balance.finalWithdrawalCash ?? 0)],
        ["Retiro final banco", String(balance.finalWithdrawalBank ?? 0)],
        ["Diferencia", String(balance.cashDifference ?? totals.difference)],
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

  const patchData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
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

  const login = (username: string, password: string) => {
    const normalized = username.trim().toLowerCase();
    const aliases: Record<string, string> = {
      cajero: "cajero1",
      administrador: "admin",
    };
    const resolved = aliases[normalized] ?? normalized;
    const nextUser = data.users.find(
      (item) => item.username.toLowerCase() === resolved && item.password === password && item.status === "ACTIVO",
    );

    if (!nextUser) {
      setMessage("Usuario, contrasena o estado invalido.");
      return;
    }

    setUser(nextUser);
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
    return <Login onBack={() => setScreen("welcome")} onLogin={login} message={message} />;
  }

  if (user.role === "CAJERO") {
    const cashierScreen = !openBalance ? "open-cash" : screen;
    return (
      <CashierWorkspace
        data={data}
        user={user}
        local={activeLocal}
        openBalance={openBalance}
        screen={cashierScreen}
        setScreen={setScreen}
        message={message}
        onLogout={() => {
          setUser(null);
          setScreen("login");
        }}
      >
        {cashierScreen === "open-cash" && (
          <OpenCash
            data={data}
            user={user}
            local={activeLocal}
            openBalance={openBalance}
            setScreen={setScreen}
            save={openCash}
          />
        )}
        {cashierScreen === "counters" && openBalance && (
          <Counters
            data={data}
            user={user}
            balance={openBalance}
            onBack={() => setScreen("panel")}
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
          <Expenses data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => setScreen("panel")} />
        )}
        {cashierScreen === "transfers" && openBalance && (
          <Transfers data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => setScreen("panel")} />
        )}
        {cashierScreen === "gifts" && openBalance && (
          <Gifts data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => setScreen("panel")} />
        )}
        {cashierScreen === "salary-payments" && openBalance && (
          <CashierSalaryPayments data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => setScreen("panel")} />
        )}
        {cashierScreen === "capital-movements" && openBalance && (
          <CapitalMovements data={data} balance={openBalance} user={user} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => setScreen("panel")} />
        )}
        {cashierScreen === "cashier-clients" && openBalance && (
          <CashierClients data={data} patchData={patchData} audit={audit} setMessage={setMessage} onBack={() => setScreen("panel")} />
        )}
        {cashierScreen === "close-cash" && openBalance && (
          <CloseCash
            data={data}
            balance={openBalance}
            user={user}
            patchData={patchData}
            audit={audit}
            setMessage={setMessage}
            setScreen={setScreen}
          />
        )}
      </CashierWorkspace>
    );
  }

  return (
    <Shell
      user={user}
      local={activeLocal}
      screen={screen}
      setScreen={setScreen}
      onLogout={() => {
        setUser(null);
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
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          setScreen={setScreen}
        />
      )}
      {screen === "reports" && <Reports data={data} user={user} />}
      {screen === "admin-users" && <AdminUsers data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-staff" && <AdminStaff data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-salary-settlements" && <AdminSalarySettlements data={data} patchData={patchData} audit={audit} />}
      {screen === "admin-current-accounts" && <AdminCurrentAccounts data={data} />}
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
      {screen === "differences" && <Differences data={data} patchData={patchData} audit={audit} />}
      {screen === "audit" && <Audit data={data} />}
      {screen === "periodic" && <Periodic data={data} />}
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

function Login({ onBack, onLogin, message }: { onBack: () => void; onLogin: (username: string, password: string) => void; message: string }) {
  const [username, setUsername] = useState("cajero1");
  const [password, setPassword] = useState("cajero123");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(username, password);
  };

  return (
    <main className="login-screen">
      <header className="login-top">POSEIDON</header>
      <section className="login-card">
        <h1>Ingreso al sistema</h1>
        <form onSubmit={submit} className="form-stack">
          <label>
            Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Contrasena
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          <div className="button-row">
            <button className="button primary" type="submit">
              Iniciar sesion
            </button>
            <button className="button muted" type="button" onClick={onBack}>
              Volver
            </button>
          </div>
        </form>
        <p className={message ? "validation error" : "validation"}>
          {message || "Usuarios: cajero1, cajero2, encargado, admin."}
        </p>
      </section>
    </main>
  );
}

function Shell({
  user,
  local,
  screen,
  setScreen,
  onLogout,
  children,
}: {
  user: User;
  local: Local;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const items = menuForRole(user.role);

  return (
    <div className="app-shell">
      <aside className="side">
        <div className="side-brand">
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <nav>
          {items.map((item) => {
            const active =
              screen === item.screen ||
              (screen === "admin-local-edit" && item.screen === "admin-locals") ||
              (screen === "admin-machine-edit" && item.screen === "admin-machines");
            return (
              <button key={item.screen} className={active ? "side-link active" : "side-link"} onClick={() => setScreen(item.screen)}>
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="side-link logout" onClick={onLogout}>
          Salir
        </button>
      </aside>
      <section className="main">
        <header className="top">
          <h1>{titleForScreen(screen, user.role)}</h1>
          <div>
            <span>Local: {local.name}</span>
            <span>Usuario: {user.name}</span>
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
  const inlineScreens: Screen[] = ["open-cash", "counters", "expenses", "transfers", "gifts", "salary-payments", "capital-movements", "cashier-clients"];
  const showWindow = openBalance && windowScreens.includes(screen);
  const showInline = openBalance && inlineScreens.includes(screen);

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
      </header>
      <main className="cashier-content">
        {message && <div className="notice cashier-notice">{message}</div>}
        <section className="cashier-panel">
          <div className="cashier-heading">
            <div>
              <h1>Panel del cajero</h1>
              <p>
                {openBalance
                  ? `Fecha: ${openBalance.operatingDate} · ID de recaudacion: ${balanceVisibleId(data, openBalance)}`
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
                  {completedReadings}/{cashierMachines} recaudadas · {pendingReadings} pendientes
                </small>
              </button>
              <div className="cashier-metric passive neutral">
                <span>Salida total</span>
                <strong>{money(totalOutflows)}</strong>
                <small>Gastos + sueldos + regalos</small>
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
                <span>Sueldos</span>
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
          {!openBalance ? (
            <section className="cashier-required">{children}</section>
          ) : showInline ? (
            <section className="cashier-inline-view">{children}</section>
          ) : (
            <div className="cashier-secondary-actions">
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                Clientes
              </button>
              <button className="button muted compact" type="button" onClick={() => setScreen("open-cash")}>
                Resumen cajas
              </button>
              <button className="button soft-blue compact" type="button" onClick={() => setScreen("close-cash")}>
                Cerrar caja
              </button>
            </div>
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

function menuForRole(role: Role): { label: string; screen: Screen }[] {
  if (role === "ADMINISTRADOR") {
    return [
      { label: "Panel general", screen: "panel" },
      { label: "Taller", screen: "workshop" },
      { label: "Locales", screen: "admin-locals" },
      { label: "Maquinas", screen: "admin-machines" },
      { label: "Usuarios", screen: "admin-users" },
      { label: "Personal", screen: "admin-staff" },
      { label: "Liquidacion sueldos", screen: "admin-salary-settlements" },
      { label: "Cuentas corrientes", screen: "admin-current-accounts" },
      { label: "Clientes", screen: "admin-clients" },
      { label: "Categorias gastos", screen: "admin-expense-categories" },
      { label: "Papelera", screen: "admin-trash" },
      { label: "Caja diaria", screen: "open-cash" },
      { label: "Retiros / aportes", screen: "capital-movements" },
      { label: "Diferencias", screen: "differences" },
      { label: "Reportes", screen: "reports" },
      { label: "Auditoria", screen: "audit" },
      { label: "Cierre periodico", screen: "periodic" },
    ];
  }

  return [
    { label: "Caja", screen: "panel" },
    { label: "Abrir caja", screen: "open-cash" },
    { label: "Contadores", screen: "counters" },
    { label: "Gastos", screen: "expenses" },
    { label: "Transferencias", screen: "transfers" },
    { label: "Regalos", screen: "gifts" },
    { label: "Retiros / aportes", screen: "capital-movements" },
    { label: "Cerrar caja", screen: "close-cash" },
    ...(role === "ENCARGADO"
      ? [
          { label: "Diferencias", screen: "differences" as Screen },
          { label: "Reportes", screen: "reports" as Screen },
          { label: "Auditoria", screen: "audit" as Screen },
        ]
      : []),
  ];
}

function titleForScreen(screen: Screen, role: Role) {
  const titles: Record<Screen, string> = {
    welcome: "Poseidon",
    login: "Ingreso al sistema",
    panel: role === "ADMINISTRADOR" ? "Reportes y administracion" : "Panel del cajero",
    "open-cash": "Abrir nueva caja",
    counters: "Cargar contadores",
    expenses: "Cargar gastos",
    transfers: "Cargar transferencias",
    gifts: "Cargar regalos",
    "salary-payments": "Pago de sueldos",
    "capital-movements": "Retiros y aportes",
    "cashier-clients": "Clientes",
    "close-cash": "Cerrar caja diaria",
    reports: "Reportes y administracion",
    "admin-users": "Usuarios",
    "admin-staff": "Personal",
    "admin-salary-settlements": "Liquidacion de sueldos",
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
  modeStatus,
  setScreen,
  resetDemo,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  modeStatus: string;
  setScreen: (screen: Screen) => void;
  resetDemo: () => void;
}) {
  const activeBalance = openBalance ?? data.balances.find((balance) => balance.status === "CERRADO");
  const totals = activeBalance ? totalsForBalance(data, activeBalance.id) : null;

  if (user.role === "ADMINISTRADOR") {
    return (
      <>
        <h2>Reportes iniciales</h2>
        <div className="card-grid three">
          <InfoCard tone="blue" title="Cierre diario" lines={["Exportacion Excel", "Caja, maquinas y movimientos"]} />
          <InfoCard tone="green" title="Maquinas" lines={["Resultado por maquina", "Historial de lecturas"]} />
          <InfoCard tone="red" title="Diferencias" lines={["Pendientes / revisadas", "Observaciones obligatorias"]} />
        </div>
        <h2>Panel administrativo</h2>
        <div className="card-grid three">
          <ActionCard title="Usuarios" text="Cajero, encargado, admin" onClick={() => setScreen("admin-users")} />
          <ActionCard title="Personal" text="Sueldos, horarios y bajas" onClick={() => setScreen("admin-staff")} />
          <ActionCard title="Liquidacion sueldos" text="Base, adelantos, extras y total" onClick={() => setScreen("admin-salary-settlements")} />
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
            `Modo: ${modeStatus}`,
          ]}
        />
      </div>
      <div className="card-grid three action-area">
        <ActionCard title="Abrir nueva caja" text="Crear caja diaria" onClick={() => setScreen("open-cash")} />
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
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  setScreen: (screen: Screen) => void;
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
  const firstOpening = !data.balances.some((balance) => balance.localId === local.id);
  const recentClosedBalances = data.balances
    .filter((balance) => balance.localId === local.id && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)))
    .slice(0, 2);
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
    <aside className={openBalance ? "recent-cashes-panel recent-cashes-wide" : "recent-cashes-panel"}>
      <div>
        <h3>Ultimas cajas cerradas</h3>
        <p>Solo lectura. Selecciona una caja para ver el resumen en pantalla.</p>
      </div>
      <div className="recent-cash-list">
        {recentClosedBalances.map((balance) => {
          const totals = totalsForBalance(data, balance.id);
          const recalculatedDifference = (balance.declaredCash ?? 0) - totals.expectedCash;
          return (
            <button
              key={balance.id}
              className={balance.id === selectedBalance?.id ? "recent-cash-card active" : "recent-cash-card"}
              type="button"
              onClick={() => setSelectedBalanceId(balance.id)}
            >
              <span>
                {balanceVisibleId(data, balance)} - {balance.operatingDate}
              </span>
              <strong>{money(totals.expectedCash)}</strong>
              <small>
                Abre {formatTime(balance.openedAt)} - Cierra {formatTime(balance.closedAt)}
              </small>
              <small>Diferencia {money(recalculatedDifference)}</small>
            </button>
          );
        })}
        {!recentClosedBalances.length && <div className="empty-recent-cash">Todavia no hay cajas cerradas para mostrar.</div>}
      </div>
    </aside>
  );

  return (
    <section className="admin-focus open-cash-page">
      <div className="admin-header">
        <div>
          <h2>{openBalance ? "Resumen de cajas" : "Caja diaria"}</h2>
          <p className="helper">{openBalance ? "Revision rapida de ultimas cajas cerradas del local activo." : "Apertura de caja y revision rapida de los ultimos cierres del local activo."}</p>
        </div>
        <div className="admin-header-actions">
          <span>Local: {local.name}</span>
          {openBalance && (
            <button className="button muted compact" type="button" onClick={() => setScreen("panel")}>
              Volver al panel
            </button>
          )}
        </div>
      </div>

      {openBalance ? (
        <>
          {selectedBalance ? <ClosedBalanceSummary data={data} balance={selectedBalance} /> : <EmptyState title="Sin cajas cerradas" text="Todavia no hay cajas cerradas para mostrar." />}
          {recentCashesPanel}
        </>
      ) : (
        <>
          <div className="open-cash-layout">
            <section className="form-card compact-open-cash open-cash-card">
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
          </div>
          {selectedBalance && <ClosedBalanceSummary data={data} balance={selectedBalance} />}
        </>
      )}
    </section>
  );
}

function ClosedBalanceSummary({ data, balance }: { data: AppData; balance: Balance }) {
  const totals = totalsForBalance(data, balance.id);
  const recalculatedDifference = (balance.declaredCash ?? 0) - totals.expectedCash;
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const expenses = data.expenses.filter((expense) => expense.balanceId === balance.id && expense.status === "ACTIVO");
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balance.id && transfer.status === "ACTIVO");
  const gifts = data.gifts.filter((gift) => gift.balanceId === balance.id && gift.status === "ACTIVO");
  const capitalMovements = data.capitalMovements.filter((movement) => movement.balanceId === balance.id && movement.status === "ACTIVO");
  const operatingCapitalMovements = capitalMovements.filter((movement) => movement.timing !== "APERTURA");
  const loadedReadings = readings.filter((reading) => reading.status === "CARGADA").length;
  const userName = (userId: string | undefined) => (userId ? data.users.find((item) => item.id === userId)?.name ?? userId : "-");
  const movementRows = [
    ...(totals.openingCapitalCash || totals.openingCapitalBank ? [["Aporte inicial", "-", money(totals.openingCapitalCash + totals.openingCapitalBank)]] : []),
    ["Gastos", String(expenses.length), money(totals.totalExpenses)],
    ["Sueldos", "-", money(totals.totalSalaries)],
    ["Transferencias", String(transfers.length), money(totals.totalTransfers)],
    ["Regalos", String(gifts.length), money(totals.giftCash)],
    ["Retiros", String(operatingCapitalMovements.filter((movement) => movement.type === "RETIRO").length), money(totals.totalWithdrawals)],
    ["Aportes", String(operatingCapitalMovements.filter((movement) => movement.type === "APORTE").length), money(totals.totalCapitalContributions)],
  ];

  return (
    <section className="closed-summary-panel">
      <div className="section-toolbar close-cash-toolbar">
        <div>
          <h2>Resumen de caja cerrada</h2>
          <p>
            {balanceVisibleId(data, balance)} - {balance.operatingDate} - apertura {formatTime(balance.openedAt)} - cierre {formatTime(balance.closedAt)} - cerrada por {userName(balance.closedBy)}
          </p>
        </div>
        <span className="close-status-pill">
          {loadedReadings}/{readings.length} maquinas recaudadas
        </span>
      </div>

      <div className="close-kpi-grid">
        <article className="close-kpi blue">
          <span>Maquinas</span>
          <strong>{money(totals.resultMachines)}</strong>
          <p>Entrada {money(totals.totalIn)}</p>
          <p>Salida {money(totals.totalOut)}</p>
        </article>
        <article className="close-kpi green">
          <span>Efectivo esperado</span>
          <strong>{money(totals.expectedCash)}</strong>
          <p>Declarado {money(balance.declaredCash)}</p>
          <p>Diferencia {money(recalculatedDifference)}</p>
        </article>
        <article className="close-kpi orange">
          <span>Salidas</span>
          <strong>{money(totals.totalExpenses + totals.totalSalaries + totals.giftCash + totals.withdrawalsCash)}</strong>
          <p>Gastos {money(totals.totalExpenses)}</p>
          <p>Sueldos {money(totals.totalSalaries)}</p>
          <p>Regalos {money(totals.giftCash)}</p>
          <p>Retiros efectivo {money(totals.withdrawalsCash)}</p>
        </article>
        <article className="close-kpi slate">
          <span>Capital</span>
          <strong>{money(totals.totalCapitalContributions - totals.totalWithdrawals)}</strong>
          <p>Efectivo proximo {money(balance.nextBase)}</p>
          <p>Banco proximo {money(balance.nextBankBase)}</p>
          <p>Aportes {money(totals.totalCapitalContributions)}</p>
          <p>Retiros banco {money(totals.withdrawalsBank)}</p>
        </article>
      </div>

      <div className="closed-summary-grid">
        <div className="closed-summary-card">
          <h3>Movimientos</h3>
          <table className="mini-summary-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {movementRows.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="closed-summary-card">
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
          cells: [clientName(props.data, item.clientId) || "-", item.name, item.receipt, item.account, money(item.amount), item.status],
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
                      {client.name}
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
  const selectedClientNames = selectedClientIds.map((id) => clientName(props.data, id)).filter(Boolean).join(", ");

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
            (item.clientIds ?? (item.clientId ? [item.clientId] : [])).map((id) => clientName(props.data, id)).filter(Boolean).join(", ") || "-",
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
              <select form="gift-create-form" name="reference" defaultValue="" required>
                <option value="" disabled>
                  Referencia
                </option>
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
    ? clients.filter((client) => [client.visibleId, client.name, client.phone, client.email, client.category].join(" ").toLowerCase().includes(normalizedQuery))
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
                <td>{client.category}</td>
                <td>{client.phone || "-"}</td>
              </tr>
            ))}
            {!filteredClients.length && (
              <tr>
                <td colSpan={5}>No hay clientes para mostrar.</td>
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
    const concept = String(form.get("concept") ?? "SUELDO") as SalaryConcept;
    const amount = parseMoneyInput(form.get("amount"));
    if (!amount) {
      setMessage("Ingresa un monto.");
      return;
    }
    const baseSalary = concept === "SUELDO" ? amount : 0;
    const advances = concept === "ADELANTO" ? amount : 0;
    const extraAmount = concept === "EXTRA" ? amount : 0;
    const aguinaldo = concept === "AGUINALDO" ? amount : 0;
    const vacationSalary = concept === "SALARIO_VACACIONAL" ? amount : 0;
    const totalToPay = concept === "ADELANTO" ? 0 : baseSalary + extraAmount + aguinaldo + vacationSalary;
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
      extraConcept: concept === "EXTRA" ? "Extra cargado desde caja" : "",
      aguinaldo,
      vacationSalary,
      otherDeductions: 0,
      totalToPay,
      concept,
      notes: `Cargado desde panel cajero por ${user.name}`,
      status: "CONFIRMADA",
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
        "Cargar pago sueldo cajero",
        "LiquidacionSueldo",
        settlement.id,
        "",
        settlement,
      );
    });
    setMessage("Pago de sueldo registrado.");
    event.currentTarget.reset();
  };
  const deleteSalaryPayment = (id: string) => {
    if (balance.status !== "EN_PROCESO") {
      setMessage("Solo se pueden eliminar sueldos antes de cerrar la caja.");
      return;
    }
    if (!confirmAction("Eliminar este pago de sueldo de la caja abierta?")) return;
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
        "Eliminar pago sueldo antes de cierre",
        "LiquidacionSueldo",
        id,
        previous,
        "",
        "Caja abierta",
      );
    });
    setMessage("Pago de sueldo eliminado.");
  };

  return (
    <CashierMovementPanel title="Pago de sueldos" detail="Carga rapida al personal." totalLabel="pagos de la caja" total={items.length} onBack={onBack}>
      {!activeStaff.length && <p className="notice">No hay personal activo cargado.</p>}
      <MovementTable
        columns={["Personal", "Concepto", "Monto", "Estado", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.staffName, item.concept, money(salarySettlementAmount(item)), item.status],
          status: item.status === "ANULADA" ? "ANULADO" : "ACTIVO",
        }))}
        actionLabel="Eliminar"
        onAnnul={deleteSalaryPayment}
        createRow={
          <tr className="create-row">
            <td>
              <select form="salary-payment-create-form" name="staffId" required>
                {activeStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staffFullName(staff)}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select form="salary-payment-create-form" name="concept">
                <option value="SUELDO">Sueldo</option>
                <option value="ADELANTO">Adelanto</option>
                <option value="EXTRA">Extra</option>
                <option value="AGUINALDO">Aguinaldo</option>
                <option value="SALARIO_VACACIONAL">Salario vacacional</option>
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
    const movement: CapitalMovement = {
      id: uid("capital"),
      balanceId: balance.id,
      localId: balance.localId,
      type: String(form.get("type") ?? "RETIRO") as CapitalMovementType,
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
        columns={["Tipo", "Momento", "Medio", "Persona", "Monto", "Fecha", "Nota", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.type, item.timing, item.medium === "EFECTIVO" ? "Efectivo" : "Transferencia", item.person, money(item.amount), formatDateTime(item.createdAt), item.note || "-"],
          status: item.status,
        }))}
        onAnnul={annulMovement}
        createRow={
          <tr className="create-row">
            <td>
              <select form="capital-create-form" name="type" defaultValue="RETIRO">
                <option value="RETIRO">Retiro</option>
                <option value="APORTE">Aporte</option>
              </select>
            </td>
            <td>Operativo</td>
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
    ? clients.filter((client) => [client.visibleId, client.name, client.phone, client.email, client.category, client.status].join(" ").toLowerCase().includes(normalizedQuery))
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
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, telefono, categoria..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table movement-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
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
                <td colSpan={7}>No hay clientes para mostrar.</td>
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
  patchData,
  audit,
  setMessage,
  setScreen,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  const totals = totalsForBalance(data, balance.id);
  const [declaredCashDraft, setDeclaredCashDraft] = useState("0");
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
  const finalWithdrawalCashPreview = parseMoneyInput(finalWithdrawalCashDraft);
  const finalWithdrawalBankPreview = parseMoneyInput(finalWithdrawalBankDraft);
  const cashWithdrawalPersonDisabled = finalWithdrawalCashPreview <= 0;
  const bankWithdrawalPersonDisabled = finalWithdrawalBankPreview <= 0;
  const hasDeclaredCash = declaredCashDraft.trim() !== "";
  const expectedCashAfterFinalWithdrawal = totals.expectedCash - finalWithdrawalCashPreview;
  const nextBankPreview = localBalances.bank - finalWithdrawalBankPreview;
  const differencePreview = declaredCashPreview - expectedCashAfterFinalWithdrawal;
  const differenceClass = !hasDeclaredCash ? "neutral" : differencePreview === 0 ? "positive" : "negative";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCloseError("");
    if (pendingInvalid.length > 0) {
      setCloseError("No se puede cerrar: hay maquinas activas pendientes sin observacion.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const declaredCash = parseMoneyInput(form.get("declaredCash"));
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
    const nextBankBase = localBalances.bank - finalWithdrawalBank;
    const withdrawal = finalWithdrawalCash;
    const difference = declaredCash - (totals.expectedCash - finalWithdrawalCash);
    const differenceNote = String(form.get("differenceNote") ?? "").trim();
    if (difference !== 0 && !differenceNote.trim()) {
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
              closedAt: nowIso(),
              declaredCash,
              nextBase,
              nextBankBase,
              withdrawal,
              finalWithdrawalCash,
              finalWithdrawalBank,
              cashDifference: difference,
              differenceNote,
              differenceStatus: difference === 0 ? "RESUELTA" : ("PENDIENTE" as DifferenceStatus),
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
    setScreen("panel");
  };

  return (
    <section className="close-cash-page">
      <div className="section-toolbar close-cash-toolbar">
        <div>
          <h2>Control de cierre</h2>
          <p>Control final de caja, maquinas, movimientos, sueldos y salidas del dia.</p>
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
              <dt>Sueldos</dt>
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
              <dt>Resultado final</dt>
              <dd>{money(finalEconomicResult)}</dd>
            </div>
            <div className="total">
              <dt>Efectivo esperado</dt>
              <dd>{money(totals.expectedCash)}</dd>
            </div>
            <div className="total">
              <dt>Dinero en banco</dt>
              <dd>{money(localBalances.bank)}</dd>
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
              Efectivo proxima caja
              <input value={hasDeclaredCash ? money(declaredCashPreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Banco proxima caja
              <input value={money(nextBankPreview)} disabled readOnly />
            </label>
            <label>
              Efectivo esperado final
              <input value={money(expectedCashAfterFinalWithdrawal)} disabled readOnly />
            </label>
            <label>
              Diferencia
              <input className={`close-difference-input ${differenceClass}`} value={hasDeclaredCash ? money(differencePreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label className="span-2">
              Observacion por diferencia
              <textarea name="differenceNote" placeholder={differencePreview !== 0 ? "Obligatoria si hay diferencia" : "Opcional"} />
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
            <button type="button" className="button secondary" onClick={() => setScreen("panel")}>
              Volver al panel
            </button>
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
  const diffs = closedBalances.filter((balance) => (balance.cashDifference ?? 0) !== 0);

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
                ["Fecha", "Diferencia", "Estado", "Observacion"],
                ...diffs.map((balance) => [balance.operatingDate, String(balance.cashDifference ?? 0), balance.differenceStatus ?? "", balance.differenceNote ?? ""]),
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
              <th>Diferencia</th>
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
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<SortState<"period" | "staff" | "concept" | "baseSalary" | "advances" | "extraAmount" | "totalToPay" | "status">>({
    key: "period",
    direction: "desc",
  });
  const normalizedQuery = query.trim().toLowerCase();
  const periodRows = data.salarySettlements.filter((settlement) => settlement.period === period);
  const filtered = normalizedQuery
    ? data.salarySettlements.filter((settlement) =>
        [settlement.period, settlement.staffName, settlement.concept, settlement.extraConcept, settlement.status, localName(data, settlement.localId)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : periodRows;
  const settlementValue = (settlement: SalarySettlement, key: typeof sort.key): string | number => {
    if (key === "staff") return settlement.staffName;
    if (key === "baseSalary" || key === "advances" || key === "extraAmount" || key === "totalToPay") return settlement[key];
    return settlement[key];
  };
  const rows = [...filtered].sort((a, b) => {
    const result = compareValues(settlementValue(a, sort.key), settlementValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const payableRows = periodRows.filter((settlement) => settlement.status !== "ANULADA");
  const periodTotal = payableRows.reduce((total, settlement) => total + settlement.totalToPay, 0);
  const periodAdvances = payableRows.reduce((total, settlement) => total + settlement.advances, 0);
  const periodExtras = payableRows.reduce((total, settlement) => total + settlement.extraAmount, 0);
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");

  const changeStatus = (settlement: SalarySettlement, status: SalarySettlementStatus) => {
    if (status === "ANULADA" && !confirmAction(`Anular liquidacion de ${settlement.staffName}?`)) return;
    patchData((current) => {
      const previous = current.salarySettlements.find((item) => item.id === settlement.id);
      const salarySettlements = current.salarySettlements.map((item) => (item.id === settlement.id ? { ...item, status, updatedAt: nowIso() } : item));
      const next = salarySettlements.find((item) => item.id === settlement.id);
      const staffMember = current.staff.find((item) => item.id === settlement.staffId);
      const currentAccounts = staffMember && !current.currentAccounts.some((account) => account.id === staffAccountId(staffMember.id))
        ? [createStaffCurrentAccount(staffMember), ...current.currentAccounts]
        : current.currentAccounts;
      const withLocalAccounts = ensureLocalCurrentAccounts({ ...current, currentAccounts }, settlement.localId);
      const accountMovements = next
        ? upsertAccountMovement(upsertAccountMovement(current.accountMovements, salaryAccountMovement(next, "system")), localSalaryAccountMovement(next, "system"))
        : current.accountMovements;
      return audit({ ...current, currentAccounts: withLocalAccounts, accountMovements, salarySettlements }, "Cambiar estado liquidacion sueldo", "LiquidacionSueldo", settlement.id, previous, next);
    });
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <h2>Liquidacion de sueldos</h2>
          <p className="helper">Registro mensual para saber cuanto pagar, a quien y por que concepto.</p>
        </div>
        <div className="admin-header-actions">
          <span>{payableRows.length} liquidaciones del mes</span>
          <button className="button success compact" disabled={!activeStaff.length} onClick={() => setEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="card-grid three cashier-status-grid">
        <InfoCard tone="green" title="Total a pagar" lines={[money(periodTotal), `${period} - sin anuladas`]} />
        <InfoCard tone="blue" title="Adelantos" lines={[money(periodAdvances), "Descontados del total"]} />
        <InfoCard tone="orange" title="Extras" lines={[money(periodExtras), "Pagos adicionales"]} />
      </div>
      <div className="toolbar-row">
        <label className="compact-filter">
          Mes
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
        </label>
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empleado, concepto, estado..." />
      </div>
      {!activeStaff.length && <p className="notice">Primero agrega personal activo para poder liquidar sueldos.</p>}
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {[
                ["period", "Mes"],
                ["staff", "Personal"],
                ["concept", "Concepto"],
                ["baseSalary", "Sueldo base"],
                ["advances", "Adelantado"],
                ["extraAmount", "Extra"],
                ["totalToPay", "Total a pagar"],
                ["status", "Estado"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                    {label}
                    {sortIndicator(sort, key as typeof sort.key)}
                  </button>
                </th>
              ))}
              <th>Detalle</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((settlement) => (
              <tr key={settlement.id} className={settlement.status === "ANULADA" ? "status-inactive" : settlement.status === "CONFIRMADA" ? "status-active" : ""}>
                <td>{settlement.period}</td>
                <td>{settlement.staffName}</td>
                <td>{settlement.concept}</td>
                <td>{money(settlement.baseSalary)}</td>
                <td>{money(settlement.advances)}</td>
                <td>{money(settlement.extraAmount)}</td>
                <td>{money(settlement.totalToPay)}</td>
                <td>{settlement.status}</td>
                <td>{settlement.extraConcept || settlement.notes || "-"}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => setEditorId(settlement.id)}>
                      Editar
                    </button>
                    {settlement.status !== "CONFIRMADA" && settlement.status !== "ANULADA" && (
                      <button className="button success compact" onClick={() => changeStatus(settlement, "CONFIRMADA")}>
                        Confirmar
                      </button>
                    )}
                    {settlement.status !== "ANULADA" && (
                      <button className="button muted compact" onClick={() => changeStatus(settlement, "ANULADA")}>
                        Anular
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10}>No hay liquidaciones para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <SalarySettlementEditor data={data} settlementId={editorId} defaultPeriod={period} onClose={() => setEditorId(undefined)} patchData={patchData} audit={audit} />
      )}
    </section>
  );
}

function AdminCurrentAccounts({ data }: { data: AppData }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const accounts = [...data.currentAccounts]
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
  const selectedTotals = selectedAccount ? accountTotals(data, selectedAccount.id) : { income: 0, outcome: 0, balance: 0, count: 0 };
  const localAccounts = data.currentAccounts.filter((account) => account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO");
  const totalIncome = localAccounts.reduce((total, account) => total + accountTotals(data, account.id).income, 0);
  const totalOutcome = localAccounts.reduce((total, account) => total + accountTotals(data, account.id).outcome, 0);
  const movements = selectedAccount
    ? data.accountMovements
        .filter((movement) => movement.accountId === selectedAccount.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <h2>Cuentas corrientes</h2>
          <p className="helper">Libro interno de empleados, transferencias y cuentas por local en efectivo/banco.</p>
        </div>
        <div className="admin-header-actions">
          <span>{data.currentAccounts.length} cuentas</span>
        </div>
      </div>

      <div className="card-grid three cashier-status-grid">
        <InfoCard tone="green" title="Entradas locales" lines={[money(totalIncome), "Efectivo y banco"]} />
        <InfoCard tone="red" title="Salidas locales" lines={[money(totalOutcome), "Efectivo y banco"]} />
        <InfoCard tone="blue" title="Saldo local" lines={[money(totalIncome - totalOutcome), "Entradas - salidas"]} />
      </div>

      <div className="accounts-layout">
        <aside className="accounts-list-panel">
          <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cuenta..." />
          <div className="account-selector-list">
            {accounts.map((account) => {
              const totals = accountTotals(data, account.id);
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
                      <th>Concepto</th>
                      <th>Detalle</th>
                      <th>Direccion</th>
                      <th>Monto</th>
                      <th>Usuario</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className={movement.status === "ANULADO" ? "status-inactive" : undefined}>
                        <td>{formatDateTime(movement.createdAt)}</td>
                        <td>{movement.sourceType}</td>
                        <td>{movement.concept}</td>
                        <td>{movement.detail || "-"}</td>
                        <td>{movement.direction}</td>
                        <td>{money(movement.amount)}</td>
                        <td>{data.users.find((item) => item.id === movement.userId)?.name ?? movement.userId}</td>
                        <td>{movement.status}</td>
                      </tr>
                    ))}
                    {!movements.length && (
                      <tr>
                        <td colSpan={8}>No hay movimientos para esta cuenta.</td>
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
    </section>
  );
}

function SalarySettlementEditor({
  data,
  settlementId,
  defaultPeriod,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  settlementId: string | null;
  defaultPeriod: string;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = settlementId ? data.salarySettlements.find((settlement) => settlement.id === settlementId) : undefined;
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const [staffId, setStaffId] = useState(existing?.staffId ?? activeStaff[0]?.id ?? "");
  const selectedStaff = data.staff.find((staff) => staff.id === staffId);
  const defaultBase = existing?.baseSalary ?? selectedStaff?.nominalSalary ?? 0;
  const isNew = !existing;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const staff = data.staff.find((item) => item.id === String(form.get("staffId")));
    if (!staff) return;
    const baseSalary = parseMoneyInput(form.get("baseSalary"));
    const advances = parseMoneyInput(form.get("advances"));
    const extraAmount = parseMoneyInput(form.get("extraAmount"));
    const aguinaldo = parseMoneyInput(form.get("aguinaldo"));
    const vacationSalary = parseMoneyInput(form.get("vacationSalary"));
    const otherDeductions = parseMoneyInput(form.get("otherDeductions"));
    const totalToPay = baseSalary - advances + extraAmount + aguinaldo + vacationSalary - otherDeductions;
    const next: SalarySettlement = {
      id: existing?.id ?? uid("salary-settlement"),
      period: String(form.get("period") || defaultPeriod),
      staffId: staff.id,
      staffName: staffFullName(staff),
      localId: staff.localId,
      baseSalary,
      advances,
      extraAmount,
      extraConcept: String(form.get("extraConcept") ?? ""),
      aguinaldo,
      vacationSalary,
      otherDeductions,
      totalToPay,
      concept: String(form.get("concept") ?? "SUELDO") as SalaryConcept,
      notes: String(form.get("notes") ?? ""),
      status: String(form.get("status") ?? "BORRADOR") as SalarySettlementStatus,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    patchData((current) => {
      const previous = current.salarySettlements.find((settlement) => settlement.id === next.id);
      const salarySettlements = isNew
        ? [next, ...current.salarySettlements]
        : current.salarySettlements.map((settlement) => (settlement.id === next.id ? next : settlement));
      const staffUpdated = current.staff.map((staffItem) =>
        staffItem.id === next.staffId ? { ...staffItem, salaryAdvanceBalance: next.advances, updatedAt: nowIso() } : staffItem,
      );
      const currentAccounts = current.currentAccounts.some((account) => account.id === staffAccountId(staff.id))
        ? current.currentAccounts
        : [createStaffCurrentAccount(staff), ...current.currentAccounts];
      const withLocalAccounts = ensureLocalCurrentAccounts({ ...current, currentAccounts }, next.localId);
      const accountMovements = upsertAccountMovement(
        upsertAccountMovement(current.accountMovements, salaryAccountMovement(next, "system")),
        localSalaryAccountMovement(next, "system"),
      );
      return audit(
        { ...current, currentAccounts: withLocalAccounts, accountMovements, salarySettlements, staff: staffUpdated },
        isNew ? "Crear liquidacion sueldo" : "Editar liquidacion sueldo",
        "LiquidacionSueldo",
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
        <label>
          Mes
          <input name="period" type="month" defaultValue={existing?.period ?? defaultPeriod} required />
        </label>
        <label>
          Personal
          <select name="staffId" value={staffId} onChange={(event) => setStaffId(event.target.value)} required>
            {activeStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.visibleId} - {staffFullName(staff)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Concepto principal
          <select name="concept" defaultValue={existing?.concept ?? "SUELDO"}>
            <option value="SUELDO">Sueldo</option>
            <option value="ADELANTO">Adelanto</option>
            <option value="EXTRA">Extra</option>
            <option value="AGUINALDO">Aguinaldo</option>
            <option value="SALARIO_VACACIONAL">Salario vacacional</option>
          </select>
        </label>
        <label>
          Estado
          <select name="status" defaultValue={existing?.status ?? "BORRADOR"}>
            <option value="BORRADOR">Borrador</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </label>
        <label>
          Sueldo base
          <input name="baseSalary" inputMode="numeric" defaultValue={isNew ? "0" : moneyInputValue(defaultBase)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
        </label>
        <label>
          Adelantado
          <input name="advances" inputMode="numeric" defaultValue={isNew ? "0" : moneyInputValue(existing?.advances)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Extra
          <input name="extraAmount" inputMode="numeric" defaultValue={moneyInputValue(existing?.extraAmount)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Concepto extra
          <input name="extraConcept" defaultValue={existing?.extraConcept} placeholder="Ej: horas extra, premio, ajuste" />
        </label>
        <label>
          Aguinaldo
          <input name="aguinaldo" inputMode="numeric" defaultValue={moneyInputValue(existing?.aguinaldo)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Salario vacacional
          <input name="vacationSalary" inputMode="numeric" defaultValue={moneyInputValue(existing?.vacationSalary)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Otros descuentos
          <input name="otherDeductions" inputMode="numeric" defaultValue={moneyInputValue(existing?.otherDeductions)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Total
          <input value="Se calcula al guardar" disabled />
        </label>
        <label className="span-2">
          Notas
          <textarea name="notes" rows={3} defaultValue={existing?.notes} placeholder="Detalle del pago, observaciones o motivo." />
        </label>
        <InfoCard
          tone="blue"
          title="Formula"
          lines={["Sueldo base - adelantos + extra + aguinaldo + salario vacacional - descuentos", "Queda registrado con auditoria."]}
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
  patchData,
  audit,
}: {
  data: AppData;
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
          <h2>Personal</h2>
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
  staffId,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  staffId: string | null;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = staffId ? data.staff.find((staff) => staff.id === staffId) : undefined;
  const isNew = !existing;
  const [schedule, setSchedule] = useState<StaffSchedule[]>(existing?.schedule ?? defaultSchedule);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nominalSalary = parseMoneyInput(form.get("nominalSalary"));
    const vacationDays = asNumber(form.get("vacationDays")) || 20;
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    if (!firstName || !lastName || !nominalSalary) return;
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
      position: String(form.get("position") ?? ""),
      localId: String(form.get("localId") ?? POSEIDON_LOCAL_ID),
      salaryType: String(form.get("salaryType") ?? "MENSUAL") as SalaryType,
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
      status: String(form.get("status") ?? "ACTIVO") as StaffStatus,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      terminatedAt: existing?.terminatedAt,
      deletedAt: existing?.deletedAt,
    };
    patchData((current) => {
      const previous = current.staff.find((staff) => staff.id === next.id);
      const staff = isNew ? [next, ...current.staff] : current.staff.map((item) => (item.id === next.id ? next : item));
      return audit({ ...current, staff }, isNew ? "Crear personal" : "Editar personal", "Personal", next.id, previous ?? "", next);
    });
    onClose();
  };
  const updateSchedule = (day: WeekDay, patch: Partial<StaffSchedule>) => {
    setSchedule((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  };

  return (
    <Modal title={isNew ? "Agregar personal" : `Editar ${staffFullName(existing)}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Nombre
          <input name="firstName" defaultValue={existing?.firstName} required />
        </label>
        <label>
          Apellido
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
          Cargo
          <input name="position" defaultValue={existing?.position} required />
        </label>
        <label>
          Local
          <select name="localId" defaultValue={existing?.localId ?? POSEIDON_LOCAL_ID}>
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
          Estado
          <select name="status" defaultValue={existing?.status ?? "ACTIVO"}>
            <option value="ACTIVO">Activo</option>
            <option value="BAJA">Baja</option>
            <option value="PAPELERA">Papelera</option>
          </select>
        </label>
        <label>
          Tipo salario
          <select name="salaryType" defaultValue={existing?.salaryType ?? "MENSUAL"}>
            <option value="MENSUAL">Mensual</option>
            <option value="JORNAL">Jornal</option>
            <option value="HORA">Hora</option>
          </select>
        </label>
        <label>
          Salario nominal
          <input name="nominalSalary" inputMode="numeric" defaultValue={moneyInputValue(existing?.nominalSalary)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
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
              <p className="helper">Base operativa. Los calculos legales finales se agregan en el modulo de sueldos.</p>
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
  const [sort, setSort] = useState<SortState<"visibleId" | "name" | "category" | "local" | "status">>({ key: "visibleId", direction: "asc" });
  const activeClients = data.clients.filter((client) => client.status !== "PAPELERA");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? activeClients.filter((client) =>
        [client.visibleId, client.name, client.documentId, client.phone, client.email, client.category, localName(data, client.localId), client.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : activeClients;
  const clientValue = (client: Client, key: typeof sort.key): string | number => {
    if (key === "visibleId") return Number(client.visibleId);
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
          <h2>Clientes</h2>
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
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, telefono, categoria..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {[
                ["visibleId", "ID"],
                ["name", "Cliente"],
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client) => (
              <tr key={client.id} className={clientStatusClass(client.status)}>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{client.category}</td>
                <td>{localName(data, client.localId)}</td>
                <td>{client.status}</td>
                <td>{client.phone || "-"}</td>
                <td>{client.email || "-"}</td>
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
                <td colSpan={8}>No hay clientes para mostrar.</td>
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
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const next: Client = {
      id: existing?.id ?? uid("client"),
      visibleId: existing?.visibleId ?? nextShortId(data.clients.map((client) => client.visibleId)),
      name,
      documentId: sanitizeDigits(String(form.get("documentId") ?? ""), 12),
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
                  <td colSpan={5}>No hay clientes en papelera.</td>
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
          <h2>Usuarios</h2>
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
          <h2>Categorias de gastos</h2>
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
          <h2>{onlyWorkshop ? "Taller" : "Maquinas"}</h2>
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
          <h2>Locales</h2>
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
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const balances = data.balances.filter((balance) => (balance.cashDifference ?? 0) !== 0);
  const update = (id: string, status: DifferenceStatus) => {
    patchData((current) => {
      const previous = current.balances.find((balance) => balance.id === id);
      const balancesNext = current.balances.map((balance) => (balance.id === id ? { ...balance, differenceStatus: status } : balance));
      return audit({ ...current, balances: balancesNext }, "Cambiar estado diferencia", "DiferenciaCaja", id, previous, { status });
    });
  };

  return (
    <>
      <h2>Diferencias de caja</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Observacion</th>
              <th>Gestion</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.id}>
                <td>{balance.operatingDate}</td>
                <td>{money(balance.cashDifference)}</td>
                <td>{balance.differenceStatus}</td>
                <td>{balance.differenceNote}</td>
                <td>
                  <select value={balance.differenceStatus} onChange={(event) => update(balance.id, event.target.value as DifferenceStatus)}>
                    <option>PENDIENTE</option>
                    <option>REVISADA</option>
                    <option>RESUELTA</option>
                    <option>AJUSTADA</option>
                    <option>ANULADA</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Audit({ data }: { data: AppData }) {
  type AuditSortKey = "createdAt" | "user" | "action" | "entity";
  const [sort, setSort] = useState<SortState<AuditSortKey>>({ key: "createdAt", direction: "desc" });
  const userLogs: AuditEvent[] = data.users.map((user) => ({
    id: `user-log-${user.id}`,
    userId: user.id,
    userName: user.name,
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
                <td>{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Periodic({ data }: { data: AppData }) {
  const closed = data.balances.filter((balance) => balance.status === "CERRADO");
  const total = closed.reduce(
    (acc, balance) => {
      const totals = totalsForBalance(data, balance.id);
      return {
        result: acc.result + totals.commercialResult,
        differences: acc.differences + (balance.cashDifference ?? 0),
        withdrawals: acc.withdrawals + (balance.withdrawal ?? 0),
      };
    },
    { result: 0, differences: 0, withdrawals: 0 },
  );

  return (
    <>
      <h2>Consolidado inicial</h2>
      <div className="card-grid three">
        <InfoCard tone="green" title="Resultado neto" lines={[money(total.result), `${closed.length} cierres cerrados`]} />
        <InfoCard tone="blue" title="Retiros" lines={[money(total.withdrawals), "Suma de retiros declarados"]} />
        <InfoCard tone="orange" title="Diferencias" lines={[money(total.differences), "Pendientes y resueltas"]} />
      </div>
    </>
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
