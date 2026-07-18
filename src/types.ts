export type Role = "CAJERO" | "ENCARGADO" | "ADMINISTRADOR";
export type BalanceStatus = "EN_PROCESO" | "CERRADO" | "AJUSTADO" | "ANULADO";
export type MachineStatus = "ACTIVA" | "INACTIVA" | "MANTENIMIENTO" | "DESUSO";
export type ReadingStatus = "PENDIENTE" | "CARGADA" | "SIN_LECTURA" | "FUERA_DE_SERVICIO";
export type MovementStatus = "ACTIVO" | "ANULADO";
export type DifferenceStatus = "PENDIENTE" | "VERIFICADA" | "CORREGIDA" | "ANULADA";
export type ExpenseReviewStatus = "PENDIENTE" | "REVISADO" | "OBSERVADO";
export type StaffStatus = "ACTIVO" | "BAJA" | "PAPELERA";
export type ClientStatus = "ACTIVO" | "INACTIVO" | "PAPELERA";
export type ClientDocumentType = "CEDULA" | "PASAPORTE";
export type SalaryType = "MENSUAL" | "JORNAL" | "HORA";
export type SalarySettlementStatus = "BORRADOR" | "CONFIRMADA" | "ANULADA";
export type SalaryConcept =
  | "SALARIO"
  | "SUELDO"
  | "ADELANTO"
  | "EXTRA"
  | "HORAS_EXTRAS"
  | "AJUSTE"
  | "DESCUENTO"
  | "AGUINALDO"
  | "SALARIO_VACACIONAL";
export type SalarySettlementOrigin = "CAJA" | "LIQUIDACION";
export type PeriodicClosureType = "SEMANAL" | "QUINCENAL" | "MENSUAL" | "PERSONALIZADO";
export type PeriodicClosureStatus = "GENERADO" | "ANULADO";
export type WeekDay = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";
export type Currency = "UYU";
export type FinancialMedium = "EFECTIVO" | "BANCO";
export type Partner = "RICARDO" | "MATHIAS";
export type CurrentAccountKind =
  | "PERSONAL"
  | "TRANSFERENCIAS"
  | "LOCAL_EFECTIVO"
  | "LOCAL_BANCO"
  | "PRINCIPAL_EFECTIVO"
  | "PRINCIPAL_BANCO"
  | "SOCIO";
export type CurrentAccountStatus = "ACTIVA" | "INACTIVA";
export type AccountMovementSource =
  | "SUELDO"
  | "TRANSFERENCIA"
  | "GASTO"
  | "REGALO"
  | "RETIRO"
  | "APORTE"
  | "TRASPASO_CAJA"
  | "APORTE_SOCIO"
  | "RETIRO_SOCIO"
  | "RESULTADO_MAQUINAS"
  | "DIFERENCIA_CAJA"
  | "MIGRACION"
  | "AJUSTE";
export type AccountMovementDirection = "ENTRADA" | "SALIDA";
export type CapitalMovementType = "RETIRO" | "APORTE";
export type CapitalMovementMedium = "EFECTIVO" | "TRANSFERENCIA";
export type CapitalMovementPerson = "RICARDO" | "MATHIAS";
export type CapitalMovementTiming = "APERTURA" | "OPERATIVO" | "CIERRE";
export type TreasuryTransferType = "RETIRO_CAJA" | "APORTE_CAJA";
export type TreasuryTransferTiming = "APERTURA" | "OPERATIVO" | "CIERRE";
export type PartnerMovementType = "APORTE_SOCIO" | "RETIRO_SOCIO";
export type Screen =
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
  | "cashier-summary"
  | "close-cash"
  | "reports"
  | "manager-expenses"
  | "admin-users"
  | "admin-staff"
  | "admin-salary-settlements"
  | "admin-clients"
  | "admin-current-accounts"
  | "admin-trash"
  | "admin-expense-categories"
  | "admin-local-data"
  | "admin-machines"
  | "workshop"
  | "admin-locals"
  | "differences"
  | "audit"
  | "periodic";

export type MenuItem = {
  label: string;
  screen: Screen;
};

export type MenuGroup = {
  title: string;
  items: MenuItem[];
};

export type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  status: "ACTIVO" | "INACTIVO";
  localIds: string[];
};

export type Local = {
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

export type StaffSchedule = {
  day: WeekDay;
  start: string;
  end: string;
  rest: boolean;
};

export type StaffMember = {
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

export type SalarySettlement = {
  id: string;
  period: string;
  balanceId?: string;
  staffId: string;
  staffName: string;
  localId: string;
  paymentAccountId?: string;
  currency?: Currency;
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
  origin?: SalarySettlementOrigin;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  annulledBy?: string;
  annulledByName?: string;
  annulledAt?: string;
  correctionClosureId?: string;
  annulledInCorrectionClosureId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalaryHistory = {
  id: string;
  staffId: string;
  staffName: string;
  localId: string;
  previousSalaryType: SalaryType;
  newSalaryType: SalaryType;
  previousNominalSalary: number;
  newNominalSalary: number;
  effectiveDate: string;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
};

export type SalaryClosureKind = "ORDINARIO" | "CORRECTIVO";
export type SalaryClosureStatus = "CORRECCION_ABIERTA" | "CERRADO" | "ANULADO";

export type SalaryClosureSettlementSnapshot = {
  id: string;
  concept: SalaryConcept;
  amount: number;
  notes: string;
  origin: SalarySettlementOrigin;
  createdByName: string;
  approvedByName: string;
  createdAt: string;
};

export type SalaryClosureEmployeeSnapshot = {
  staffId: string;
  staffName: string;
  position: string;
  localId: string;
  salaryType: SalaryType;
  baseSalary: number;
  salaryPaid: number;
  advances: number;
  extraAmount: number;
  bonuses: number;
  deductions: number;
  totalAmount: number;
  baseCoveredAmount: number;
  liquidatedAmount: number;
  pendingAmount: number;
  settlementIds: string[];
  settlements: SalaryClosureSettlementSnapshot[];
};

export type SalaryClosure = {
  id: string;
  visibleId: string;
  period: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
  kind: SalaryClosureKind;
  revision: number;
  parentClosureId?: string;
  snapshotVersion: number;
  employeeSnapshots: SalaryClosureEmployeeSnapshot[];
  employeeCount: number;
  settlementIds: string[];
  totalBase: number;
  totalExtras: number;
  totalBonuses: number;
  totalDeductions: number;
  totalSalaries: number;
  totalSalaryPaid: number;
  totalAdvances: number;
  totalBaseCovered: number;
  totalLiquidated: number;
  totalPending: number;
  status: SalaryClosureStatus;
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
};

export type Client = {
  id: string;
  visibleId: string;
  name: string;
  documentType: ClientDocumentType;
  documentId: string;
  photoFile?: StoredFileMeta;
  identityDocumentFile?: StoredFileMeta;
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

export type StoredFileMeta = {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

export type CurrentAccount = {
  id: string;
  kind: CurrentAccountKind;
  entityId?: string;
  name: string;
  currency: Currency;
  status: CurrentAccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccountMovement = {
  id: string;
  accountId: string;
  localId?: string;
  balanceId?: string;
  sourceType: AccountMovementSource;
  sourceId: string;
  direction: AccountMovementDirection;
  concept: string;
  amount: number;
  currency: Currency;
  detail: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
  reversalOf?: string;
  previousAdjustmentId?: string;
};

export type CapitalMovement = {
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

export type TreasuryTransfer = {
  id: string;
  balanceId?: string;
  localId: string;
  type: TreasuryTransferType;
  medium: FinancialMedium;
  timing: TreasuryTransferTiming;
  amount: number;
  currency: Currency;
  note: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

export type PartnerMovement = {
  id: string;
  balanceId?: string;
  localId: string;
  partner: Partner;
  type: PartnerMovementType;
  medium: FinancialMedium;
  amount: number;
  currency: Currency;
  note: string;
  status: MovementStatus;
  userId: string;
  createdAt: string;
};

export type LocalImage = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
};

export type Machine = {
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

export type Balance = {
  id: string;
  visibleId?: string;
  localId: string;
  operatingDate: string;
  status: BalanceStatus;
  initialFund: number;
  initialBankFund?: number;
  initialNote: string;
  openedBy: string;
  openedByRole?: Role;
  openedAt: string;
  closedBy?: string;
  closedByRole?: Role;
  closedAt?: string;
  declaredCash?: number;
  declaredBank?: number;
  nextBase?: number;
  nextBankBase?: number;
  withdrawal?: number;
  finalWithdrawalCash?: number;
  finalWithdrawalBank?: number;
  finalTransferToPrincipalCash?: number;
  finalTransferToPrincipalBank?: number;
  cashDifference?: number;
  bankDifference?: number;
  differenceNote?: string;
  differenceStatus?: DifferenceStatus;
  differenceReviewedBy?: string;
  differenceReviewedAt?: string;
  differenceReviewNote?: string;
};

export type Reading = {
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

export type Expense = {
  id: string;
  balanceId?: string;
  localId: string;
  paymentAccountId: string;
  currency: Currency;
  category: string;
  subcategory: string;
  amount: number;
  description: string;
  receipt: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptDataUrl?: string;
  status: MovementStatus;
  reviewStatus?: ExpenseReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  userId: string;
  createdAt: string;
};

export type PeriodicClosure = {
  id: string;
  visibleId: string;
  localId: string;
  type: PeriodicClosureType;
  startDate: string;
  endDate: string;
  balanceIds: string[];
  principalExpenseIds: string[];
  principalSalarySettlementIds: string[];
  treasuryTransferIds: string[];
  partnerMovementIds: string[];
  resultMachines: number;
  totalExpenses: number;
  totalSalaries: number;
  totalGifts: number;
  totalOutflows: number;
  commercialResult: number;
  totalTransfers: number;
  totalWithdrawals: number;
  totalContributions: number;
  totalCajaToPrincipal: number;
  totalPrincipalToCaja: number;
  totalPartnerContributions: number;
  totalPartnerWithdrawals: number;
  cashDifference: number;
  bankDifference: number;
  pendingDifferences: number;
  status: PeriodicClosureStatus;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  subcategories: string[];
  status: "ACTIVA" | "INACTIVA";
};

export type Transfer = {
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

export type Gift = {
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

export type AuditEvent = {
  id: string;
  userId: string;
  userName: string;
  actualRole?: Role;
  actorRole?: Role;
  action: string;
  entity: string;
  entityId: string;
  localId?: string;
  localIds?: string[];
  previousValue: string;
  newValue: string;
  reason: string;
  createdAt: string;
};

export type MachineLocalHistory = {
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

export type AppData = {
  users: User[];
  staff: StaffMember[];
  salarySettlements: SalarySettlement[];
  salaryHistories: SalaryHistory[];
  salaryClosures: SalaryClosure[];
  clients: Client[];
  periodicClosures: PeriodicClosure[];
  currentAccounts: CurrentAccount[];
  accountMovements: AccountMovement[];
  capitalMovements: CapitalMovement[];
  treasuryTransfers: TreasuryTransfer[];
  partnerMovements: PartnerMovement[];
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

