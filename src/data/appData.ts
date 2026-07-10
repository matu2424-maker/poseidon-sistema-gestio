import type {
  AccountMovement,
  AppData,
  AuditEvent,
  Balance,
  CapitalMovement,
  Client,
  CurrentAccount,
  Expense,
  ExpenseCategory,
  Gift,
  Local,
  Machine,
  Reading,
  SalarySettlement,
  StaffMember,
  StaffSchedule,
  Transfer,
  User,
  WeekDay,
} from "../types";
import {
  createLocalBankCurrentAccount,
  createLocalCashCurrentAccount,
  createStaffCurrentAccount,
  createTransferCurrentAccount,
  localAccountIdForMedium,
  localBankAccountId,
  localCashAccountId,
  staffAccountId,
  TRANSFER_ACCOUNT_ID,
} from "../lib/currentAccounts";
import {
  capitalAccountMovement,
  differenceAccountMovement,
  localExpenseAccountMovement,
  localGiftAccountMovement,
  localSalaryAccountMovement,
  localTransferAccountMovement,
  machineResultAccountMovement,
  salaryAccountMovement,
  transferAccountMovement,
} from "../lib/accountMovements";
import { normalizeClientDocument, normalizeClientDocumentType } from "../lib/clients";
import { nowIso, today } from "../lib/dates";
import { localCode, localName } from "../lib/display";
import { normalizeStoredFileMeta } from "../lib/files";
import { nextShortId, shortNumberId } from "../lib/ids";
import { machineHistoryEvent } from "../lib/machineHistory";
import { salaryHistoryEvent, staffFullName } from "../lib/people";
import {
  isSalaryPaymentConcept,
  isValidSalaryPeriod,
  normalizeSalaryConcept,
  salaryBaseForPeriod,
  salarySettlementAmount,
  salarySettlementTotalDelta,
} from "../lib/salaryRules";

export const LEGACY_POSEIDON_LOCAL_ID = "local-poseidon";
export const POSEIDON_LOCAL_ID = "1";
export const WORKSHOP_LOCAL_ID = "taller";
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

export function nextBalanceVisibleId(data: AppData, localId: string) {
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
export function clearOperationalData(data: AppData): AppData {
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

export function createSeedData(): AppData {
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


export function normalizeData(data: AppData): AppData {
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

