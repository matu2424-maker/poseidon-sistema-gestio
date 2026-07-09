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
import {
  accountKindLabel,
  accountTotals,
  createLocalBankCurrentAccount,
  createLocalCashCurrentAccount,
  createStaffCurrentAccount,
  createTransferCurrentAccount,
  ensureLocalCurrentAccounts,
  localAccountBalances,
  localAccountIdForMedium,
  localBankAccountId,
  localCashAccountId,
  staffAccountId,
  TRANSFER_ACCOUNT_ID,
} from "./lib/currentAccounts";
import {
  accountTotalsFromMovements,
  capitalAccountMovement,
  differenceAccountMovement,
  localExpenseAccountMovement,
  localGiftAccountMovement,
  localSalaryAccountMovement,
  localTransferAccountMovement,
  machineResultAccountMovement,
  salaryAccountMovement,
  syncDifferenceAccountMovements,
  syncMachineResultAccountMovement,
  transferAccountMovement,
  upsertAccountMovement,
} from "./lib/accountMovements";
import { appendAuditEvent } from "./lib/audit";
import { calcReading, totalsForBalance } from "./lib/cashTotals";
import {
  clientDocumentKey,
  clientDocumentLabel,
  clientDocumentSearchText,
  hasClientDocumentDuplicate,
  normalizeClientDocument,
  normalizeClientDocumentType,
  sanitizeDigits,
} from "./lib/clients";
import { formatDateTime, formatTime, monthRange, nowIso, today } from "./lib/dates";
import { balanceHasDifference, bankDifferenceForBalance, cashDifferenceForBalance, differenceActionImpact, differenceIsPending, pendingDifferenceCount } from "./lib/differences";
import { downloadFile, exportCsv } from "./lib/export";
import { fileMetaLabel, normalizeStoredFileMeta, readUploadFile } from "./lib/files";
import { nextShortId, shortNumberId, uid } from "./lib/ids";
import { machineHistoryEvent } from "./lib/machineHistory";
import {
  clearZeroMoneyInput,
  counter,
  formatCounterInput,
  formatMoneyInput,
  handleMoneyBlur,
  handleMoneyFocus,
  handleMoneyInput,
  money,
  moneyInputValue,
  normalizeMoneyInput,
  parseCounter,
  parseMoneyInput,
} from "./lib/money";
import { salaryHistoryEvent, staffFullName } from "./lib/people";
import {
  cashierSalaryConceptOptions,
  isSalaryPaymentConcept,
  isValidSalaryPeriod,
  movementConceptLabel,
  normalizeSalaryConcept,
  salaryBaseForPeriod,
  salaryConceptBreakdown,
  salaryConceptLabel,
  salaryConceptOptions,
  salaryPeriodEndDate,
  salarySettlementAmount,
  salarySettlementDisplayAmount,
  salarySettlementTotalDelta,
  shiftSalaryPeriod,
  suggestedSalaryPeriodModeFromDate,
  suggestedWorkedPeriodFromOperatingDate,
  validateSalarySettlementLimit,
} from "./lib/salaryRules";
import {
  isOperationalResetMarked,
  markOperationalReset,
  readColumnPreference,
  readStoredAppData,
  writeColumnPreference,
  writeStoredAppData,
} from "./lib/storage";
import { compareValues, nextSort, sortIndicator, type SortState } from "./lib/sorting";
import { ClosedBalanceSummary } from "./features/cashier/ClosedBalanceSummary";
import { CloseCash } from "./features/cashier/CloseCash";
import { Counters } from "./features/cashier/Counters";
import { OpenCash } from "./features/cashier/OpenCash";
import { CapitalMovements, CashierClients, CashierSalaryPayments, Expenses, Gifts, Transfers } from "./features/cashier/Movements";
import { Differences } from "./features/manager/Differences";
import { ManagerExpenses } from "./features/manager/Expenses";
import { AdminSalarySettlements } from "./features/salaries/SalarySettlements";
import { AdminClients, ClientEditor } from "./features/admin/Clients";
import { AdminStaff, AdminTrash } from "./features/admin/Staff";
import { AdminExpenseCategories, AdminUsers } from "./features/admin/Settings";
import { ColumnChooser, FormButtons, InfoCard, Modal, type TableColumn } from "./components/ui";

const LEGACY_POSEIDON_LOCAL_ID = "local-poseidon";
const POSEIDON_LOCAL_ID = "1";
const WORKSHOP_LOCAL_ID = "taller";
const WORKSHOP_LABEL = "Taller";
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

const asNumber = (value: FormDataEntryValue | null) => Number(value || 0);
const sanitizeNumberId = (value: string) => value.replace(/\D/g, "").slice(0, 4);
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
const capitalize = (value: string) => (value ? `${value.charAt(0).toLocaleUpperCase("es-UY")}${value.slice(1)}` : value);
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
const confirmAction = (message: string) => window.confirm(message);

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
    ...balances.flatMap((balance) =>
      [
        differenceAccountMovement(balance, "EFECTIVO", balance.cashDifference ?? 0, balance.closedBy ?? balance.openedBy),
        differenceAccountMovement(balance, "BANCO", balance.bankDifference ?? 0, balance.closedBy ?? balance.openedBy),
      ].filter((movement): movement is AccountMovement => Boolean(movement)),
    ),
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
    const storedData = readStoredAppData();
    const data = storedData ? normalizeData(storedData) : createSeedData();
    if (window.location.search.includes("resetSaldos=1")) {
      const cleaned = normalizeData(clearOperationalData(data));
      writeStoredAppData(cleaned);
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
    const balancePeriod = item.balanceId ? source.balances.find((balance) => balance.id === item.balanceId)?.operatingDate?.slice(0, 7) : undefined;
    return {
      ...item,
      period: isValidSalaryPeriod(item.period ?? "") ? item.period : balancePeriod ?? today().slice(0, 7),
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
    totalBaseCovered: Number(closure.totalBaseCovered ?? Number(closure.totalSalaryPaid ?? 0) + Number(closure.totalAdvances ?? 0) + Number(closure.totalDeductions ?? 0)),
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
    const movementUserId = balance.closedBy ?? balance.openedBy ?? "system";
    const cashDifferenceMovement = differenceAccountMovement(balance, "EFECTIVO", Number(balance.cashDifference ?? 0), movementUserId);
    const bankDifferenceMovement = differenceAccountMovement(balance, "BANCO", Number(balance.bankDifference ?? 0), movementUserId);
    [cashDifferenceMovement, bankDifferenceMovement].forEach((differenceMovement) => {
      if (differenceMovement && accountIds.has(differenceMovement.accountId)) {
        movementById.set(differenceMovement.id, differenceMovement);
      }
    });
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

function App() {
  const [data, setData] = useState<AppData>(() => readData());
  const [screen, setScreen] = useState<Screen>("welcome");
  const [user, setUser] = useState<User | null>(null);
  const [actingRole, setActingRole] = useState<Role | null>(null);
  const [message, setMessage] = useState("");
  const [operationalResetApplied, setOperationalResetApplied] = useState(
    () => isOperationalResetMarked(),
  );

  useEffect(() => {
    if (operationalResetApplied) return;
    setData((current) => {
      const cleaned = normalizeData(clearOperationalData(current));
      writeStoredAppData(cleaned);
      markOperationalReset();
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
    const saveResult = writeStoredAppData(data);
    if (saveResult === "compacted") {
      setMessage("Guardado local compactado: se quitaron archivos pesados del almacenamiento del navegador.");
    }
    if (saveResult === "failed") {
      setMessage("No se pudo guardar localmente. El dato puede ser demasiado grande.");
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
  ): AppData => appendAuditEvent(current, { user, actorRole: effectiveRole }, action, entity, entityId, previousValue, newValue, reason);

  const resetDemo = () => {
    const fresh = createSeedData();
    setData(fresh);
    writeStoredAppData(fresh);
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

type MachineModalState = {
  machineId: string | null;
  localId?: string;
};

type LocalHistoryTab = "resumen" | "datos" | "maquinas" | "estados" | "recaudaciones" | "auditoria";
type MachineHistoryTab = "resumen" | "locales" | "contadores" | "auditoria";
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

const LOCAL_COLUMNS_STORAGE_KEY = "poseidon-locales-columnas-v2";
const MACHINE_COLUMNS_STORAGE_KEY = "poseidon-maquinas-columnas-v2";
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
const fixedLocalColumns: LocalColumnKey[] = ["id", "name", "status", "machines", "balances", "actions"];
const fixedMachineColumns: MachineColumnKey[] = ["visibleId", "name", "local", "status", "lastIn", "lastOut", "actions"];
const fixedBalanceColumns: BalanceColumnKey[] = ["operatingDate", "status", "initialFund", "declaredCash", "cashDifference", "actions"];

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
    writeColumnPreference(MACHINE_COLUMNS_STORAGE_KEY, visibleColumns);
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
    writeColumnPreference(LOCAL_COLUMNS_STORAGE_KEY, visibleColumns);
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





