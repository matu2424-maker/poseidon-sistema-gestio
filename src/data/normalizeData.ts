import type { AccountMovement, AppData, CurrentAccount } from "../types";
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
import { nowIso, today } from "../lib/dates";
import { localCode } from "../lib/display";
import { normalizeDifferenceStatus } from "../lib/differences";
import { normalizeStoredFileMeta } from "../lib/files";
import { nextShortId, shortNumberId } from "../lib/ids";
import { machineHistoryEvent } from "../lib/machineHistory";
import { salaryHistoryEvent, staffFullName } from "../lib/people";
import { isSalaryPaymentConcept, isValidSalaryPeriod, normalizeSalaryConcept } from "../lib/salaryRules";
import { LEGACY_POSEIDON_LOCAL_ID, POSEIDON_LOCAL_ID, WORKSHOP_LOCAL_ID } from "./appDataIds";

export function normalizeDataFromSeed(data: AppData, seed: AppData): AppData {
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
    const preferred =
      local.id === LEGACY_POSEIDON_LOCAL_ID || (index === 0 && local.name === "Poseidon")
        ? POSEIDON_LOCAL_ID
        : shortNumberId(local.id);
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
    localId === WORKSHOP_LOCAL_ID
      ? WORKSHOP_LOCAL_ID
      : localIdMap.get(localId) ?? (localId === LEGACY_POSEIDON_LOCAL_ID ? POSEIDON_LOCAL_ID : localId);
  const usedMachineIds = new Set<string>();
  const machines = source.machines.map((machine) => {
    let visibleId = shortNumberId(machine.visibleId) || nextShortId([...usedMachineIds]);
    while (usedMachineIds.has(visibleId)) visibleId = nextShortId([...usedMachineIds]);
    usedMachineIds.add(visibleId);
    return {
      ...machine,
      visibleId,
      localId: mapLocalId(machine.localId),
      status:
        mapLocalId(machine.localId) === WORKSHOP_LOCAL_ID && machine.status === "INACTIVA" ? "DESUSO" : machine.status,
    };
  });

  const machineIds = new Set(machines.map((machine) => machine.id));
  const demoUsers = seed.users;
  const existingUserIds = new Set(source.users.map((item) => item.id));
  const users = [...demoUsers.filter((item) => !existingUserIds.has(item.id)), ...source.users].map((item) => ({
    ...item,
    localIds: item.localIds.map(mapLocalId),
  }));
  const fallbackSchedule = seed.staff[0]?.schedule ?? [];
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
    estimatedVacationSalary: Number(
      item.estimatedVacationSalary ?? Math.round((Number(item.nominalSalary ?? 0) / 30) * Number(item.vacationDays ?? 20)),
    ),
    emergencyContact: item.emergencyContact ?? "",
    bankAccount: item.bankAccount ?? "",
    schedule: Array.isArray(item.schedule) && item.schedule.length ? item.schedule : fallbackSchedule,
    notes: item.notes ?? "",
    status: item.status ?? "ACTIVO",
    createdAt: item.createdAt ?? nowIso(),
    updatedAt: item.updatedAt ?? nowIso(),
  }));
  const salaryHistories = source.salaryHistories.length
    ? source.salaryHistories.map((history) => ({
        ...history,
        staffName:
          history.staffName ??
          staffFullName(staff.find((staffItem) => staffItem.id === history.staffId) ?? { firstName: "", lastName: "" }),
        localId: mapLocalId(
          history.localId ?? staff.find((staffItem) => staffItem.id === history.staffId)?.localId ?? POSEIDON_LOCAL_ID,
        ),
        previousSalaryType: history.previousSalaryType ?? "MENSUAL",
        newSalaryType: history.newSalaryType ?? "MENSUAL",
        previousNominalSalary: Number(history.previousNominalSalary ?? 0),
        newNominalSalary: Number(history.newNominalSalary ?? 0),
        effectiveDate: history.effectiveDate ?? history.createdAt?.slice(0, 10) ?? today(),
        reason: history.reason ?? "",
        userId: history.userId ?? "system",
        userName:
          history.userName ??
          users.find((user) => user.id === history.userId)?.name ??
          (history.userId === "system" ? "Sistema" : history.userId ?? "Sistema"),
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
  const userNameById = (userId: string | undefined) =>
    users.find((user) => user.id === userId)?.name ?? (userId === "system" ? "Sistema" : userId ?? "Sistema");
  const salarySettlements = source.salarySettlements.map((item) => {
    const createdBy = item.createdBy ?? item.approvedBy ?? "system";
    const approvedBy = item.status === "CONFIRMADA" ? item.approvedBy ?? createdBy : item.approvedBy;
    const annulledBy =
      item.status === "ANULADA" ? item.annulledBy ?? item.approvedBy ?? item.createdBy ?? "system" : item.annulledBy;
    const balancePeriod = item.balanceId
      ? source.balances.find((balance) => balance.id === item.balanceId)?.operatingDate?.slice(0, 7)
      : undefined;
    return {
      ...item,
      period: isValidSalaryPeriod(item.period ?? "") ? item.period : balancePeriod ?? today().slice(0, 7),
      balanceId: item.balanceId,
      staffName:
        item.staffName ??
        staffFullName(staff.find((staffItem) => staffItem.id === item.staffId) ?? { firstName: "", lastName: "" }),
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
      while (used.has(visibleId)) visibleId = `${localCode(local.name)}-${used.size + 1}`;
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
    differenceStatus: normalizeDifferenceStatus(balance),
    differenceReviewedBy: balance.differenceReviewedBy,
    differenceReviewedAt: balance.differenceReviewedAt,
    differenceReviewNote: balance.differenceReviewNote ?? "",
  }));
  const balanceLocalId = (balanceId: string) =>
    balances.find((balance) => balance.id === balanceId)?.localId ?? POSEIDON_LOCAL_ID;
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
    totalBaseCovered: Number(
      closure.totalBaseCovered ??
        Number(closure.totalSalaryPaid ?? 0) + Number(closure.totalAdvances ?? 0) + Number(closure.totalDeductions ?? 0),
    ),
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
    accountById.set(
      localCashAccountId(local.id),
      createLocalCashCurrentAccount(local, accountById.get(localCashAccountId(local.id))),
    );
    accountById.set(
      localBankAccountId(local.id),
      createLocalBankCurrentAccount(local, accountById.get(localBankAccountId(local.id))),
    );
  });
  staff.forEach((staffMember) => {
    accountById.set(
      staffAccountId(staffMember.id),
      createStaffCurrentAccount(staffMember, accountById.get(staffAccountId(staffMember.id))),
    );
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
      reversalOf: movement.reversalOf,
    });
  });
  const addDerivedMovement = (movement: AccountMovement | null) => {
    if (!movement || !accountIds.has(movement.accountId) || movementById.has(movement.id)) return;
    movementById.set(movement.id, movement);
  };
  salarySettlements.forEach((settlement) => {
    if (!accountIds.has(staffAccountId(settlement.staffId))) return;
    const movementUserId = settlement.approvedBy ?? settlement.createdBy ?? "system";
    addDerivedMovement(salaryAccountMovement(settlement, movementUserId));
    if (accountIds.has(localCashAccountId(settlement.localId))) {
      addDerivedMovement(localSalaryAccountMovement(settlement, movementUserId));
    }
  });
  expenses.forEach((expense) => {
    const localId = balanceLocalId(expense.balanceId);
    if (accountIds.has(localCashAccountId(localId))) addDerivedMovement(localExpenseAccountMovement(expense, localId));
  });
  transfers.forEach((transfer) => {
    addDerivedMovement(transferAccountMovement(transfer));
    const localId = balanceLocalId(transfer.balanceId);
    if (accountIds.has(localBankAccountId(localId))) addDerivedMovement(localTransferAccountMovement(transfer, localId));
  });
  gifts.forEach((gift) => {
    const localId = balanceLocalId(gift.balanceId);
    if (accountIds.has(localCashAccountId(localId))) addDerivedMovement(localGiftAccountMovement(gift, localId));
  });
  capitalMovements.forEach((movement) => {
    const accountId = localAccountIdForMedium(movement.localId, movement.medium);
    if (accountIds.has(accountId)) addDerivedMovement(capitalAccountMovement(movement));
  });
  balances.forEach((balance) => {
    const result = source.readings
      .filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA")
      .reduce((total, reading) => total + Number(reading.result ?? 0), 0);
    addDerivedMovement(machineResultAccountMovement(balance, result, balance.closedBy ?? balance.openedBy ?? "system"));
    const movementUserId = balance.closedBy ?? balance.openedBy ?? "system";
    [
      differenceAccountMovement(balance, "EFECTIVO", Number(balance.cashDifference ?? 0), movementUserId),
      differenceAccountMovement(balance, "BANCO", Number(balance.bankDifference ?? 0), movementUserId),
    ].forEach(addDerivedMovement);
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
