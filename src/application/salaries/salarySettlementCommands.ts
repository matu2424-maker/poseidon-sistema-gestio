import type { AppData, SalaryConcept, SalarySettlement } from "../../types";
import {
  localSalaryAccountMovement,
  reverseSourceAccountMovements,
  salaryAccountMovement,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import {
  createStaffCurrentAccount,
  ensureFinancialCurrentAccounts,
  isMoneyAccount,
  localCashAccountId,
  PRINCIPAL_CASH_ACCOUNT_ID,
  staffAccountId,
} from "../../lib/currentAccounts";
import {
  activeAccountSourceOutflow,
  accountOutflowError,
  balanceCashReconciliationError,
  historicalCashMutationError,
} from "../../lib/cashAvailability";
import { staffFullName } from "../../lib/people";
import {
  cashierSalaryConceptOptions,
  isValidSalaryPeriod,
  normalizeSalaryConcept,
  salaryConceptBreakdown,
  validateSalarySettlementLimit,
} from "../../lib/salaryRules";
import { salaryPeriodMutationError } from "../../lib/salaryClosures";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

export type SaveSalarySettlementInput = {
  settlementId?: string;
  staffId: string;
  period: string;
  concept: SalaryConcept;
  amount: number;
  notes: string;
  origin: "CAJA" | "LIQUIDACION";
  balanceId?: string;
  paymentAccountId?: string;
  correctionClosureId?: string;
};

export function saveSalarySettlementCommand(
  data: AppData,
  input: SaveSalarySettlementInput,
  context: CommandContext,
): CommandResult<SalarySettlement> {
  const staff = data.staff.find((item) => item.id === input.staffId && item.status === "ACTIVO");
  if (!staff) return commandError("Selecciona una persona activa.");
  const actorMatchesUser =
    context.actorRole === context.user.role ||
    (context.actorRole === "CAJERO" && ["ENCARGADO", "ADMINISTRADOR"].includes(context.user.role)) ||
    (context.actorRole === "ENCARGADO" && context.user.role === "ADMINISTRADOR");
  if (!actorMatchesUser) return commandError("La funcion activa no corresponde al usuario autenticado.");
  if (context.user.status !== "ACTIVO") return commandError("El usuario no esta activo.");
  if (input.origin === "CAJA" && context.actorRole !== "CAJERO") {
    return commandError("Los pagos de Caja se registran desde la funcion Cajero.");
  }
  if (input.origin === "LIQUIDACION" && !["ENCARGADO", "ADMINISTRADOR"].includes(context.actorRole)) {
    return commandError("La funcion activa no permite liquidar salarios desde Principal.");
  }
  if (input.origin === "LIQUIDACION" && input.balanceId) {
    return commandError("Las liquidaciones desde Principal no se asocian a una caja operativa.");
  }
  if (context.user.role !== "ADMINISTRADOR" && !context.user.localIds.includes(staff.localId)) {
    return commandError("El usuario no esta asignado al local del empleado.");
  }
  const concept = normalizeSalaryConcept(input.concept);
  if (!isValidSalaryPeriod(input.period)) return commandError("Selecciona un periodo trabajado valido.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) return commandError("Ingresa un monto valido mayor a cero.");
  if (input.origin === "CAJA") {
    if (!cashierSalaryConceptOptions.includes(concept)) return commandError("Desde caja solo se permite Salario o Adelanto.");
    const balance = data.balances.find((item) => item.id === input.balanceId);
    if (!balance || balance.status !== "EN_PROCESO") return commandError("La caja ya no esta abierta.");
  }
  const existing = input.settlementId ? data.salarySettlements.find((item) => item.id === input.settlementId) : undefined;
  if (input.settlementId && !existing) return commandError("No se encontro la liquidacion a corregir.");
  if (existing?.status === "ANULADA") return commandError("Una liquidacion anulada no se edita; crea una nueva liquidacion.");
  const targetPeriodError = salaryPeriodMutationError(data, input.period, input.correctionClosureId);
  if (targetPeriodError) return commandError(targetPeriodError);
  if (existing && existing.period !== input.period) {
    const sourcePeriodError = salaryPeriodMutationError(data, existing.period, input.correctionClosureId);
    if (sourcePeriodError) return commandError(sourcePeriodError);
  }
  const validationError = validateSalarySettlementLimit(data, staff, input.period, concept, input.amount, existing?.id);
  if (validationError) return commandError(validationError);

  const preparedData: AppData = {
    ...data,
    currentAccounts: ensureFinancialCurrentAccounts(data, staff.localId),
  };
  const breakdown = salaryConceptBreakdown(concept, input.amount);
  const nextCashAmount = concept === "DESCUENTO" ? 0 : input.amount;
  const targetPaymentAccountId =
    input.origin === "CAJA"
      ? localCashAccountId(staff.localId)
      : input.paymentAccountId ?? existing?.paymentAccountId ?? PRINCIPAL_CASH_ACCOUNT_ID;
  const targetPaymentAccount = preparedData.currentAccounts.find((account) => account.id === targetPaymentAccountId);
  if (nextCashAmount > 0 && !isMoneyAccount(targetPaymentAccount)) {
    return commandError("Selecciona una cuenta de pago valida.");
  }
  if (
    input.origin === "LIQUIDACION" &&
    nextCashAmount > 0 &&
    !["PRINCIPAL_EFECTIVO", "PRINCIPAL_BANCO"].includes(targetPaymentAccount?.kind ?? "")
  ) {
    return commandError("Las liquidaciones del encargado o administrador se pagan desde una cuenta Principal.");
  }
  const previousPaymentAccountId = existing?.paymentAccountId ?? localCashAccountId(existing?.localId ?? staff.localId);
  const previousCashAmount = existing
    ? activeAccountSourceOutflow(preparedData, previousPaymentAccountId, existing.id)
    : 0;
  const netCashOutflow =
    targetPaymentAccountId === previousPaymentAccountId
      ? Math.max(0, nextCashAmount - previousCashAmount)
      : nextCashAmount;
  const targetBalanceId = input.origin === "CAJA" ? input.balanceId ?? existing?.balanceId : undefined;
  const openBalance = data.balances.find((item) => item.localId === staff.localId && item.status === "EN_PROCESO");
  const previousUsesLocalCash = previousPaymentAccountId === localCashAccountId(staff.localId);
  const targetUsesLocalCash = targetPaymentAccountId === localCashAccountId(staff.localId);
  if (existing && previousCashAmount > 0 && previousUsesLocalCash) {
    const sourceMutationError = historicalCashMutationError(preparedData, staff.localId, existing.balanceId);
    if (sourceMutationError) return commandError(sourceMutationError);
  }
  if (nextCashAmount > 0 && targetUsesLocalCash) {
    const targetMutationError = historicalCashMutationError(preparedData, staff.localId, targetBalanceId);
    if (targetMutationError) return commandError(targetMutationError);
  }
  if (openBalance && (previousUsesLocalCash || targetUsesLocalCash)) {
    const reconciliationError = balanceCashReconciliationError(preparedData, openBalance.id);
    if (reconciliationError) return commandError(reconciliationError);
  }
  const cashError = nextCashAmount > 0 ? accountOutflowError(preparedData, targetPaymentAccountId, netCashOutflow) : "";
  if (cashError) return commandError(cashError);

  const timestamp = context.now();
  const correction = Boolean(existing);
  const next: SalarySettlement = {
    id: correction ? context.id("salary-settlement-correction") : context.id("salary-settlement"),
    period: input.period,
    balanceId: targetBalanceId,
    staffId: staff.id,
    staffName: staffFullName(staff),
    localId: staff.localId,
    paymentAccountId: targetPaymentAccountId,
    currency: "UYU",
    ...breakdown,
    concept,
    notes: input.notes,
    status: "CONFIRMADA",
    origin: input.origin ?? existing?.origin ?? "LIQUIDACION",
    createdBy: context.user.id,
    createdByName: context.user.name,
    approvedBy: context.user.id,
    approvedByName: context.user.name,
    approvedAt: timestamp,
    correctionClosureId: input.correctionClosureId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const annulledExisting = existing
    ? {
        ...existing,
        status: "ANULADA" as const,
        annulledBy: context.user.id,
        annulledByName: context.user.name,
        annulledAt: timestamp,
        annulledInCorrectionClosureId: input.correctionClosureId,
        updatedAt: timestamp,
      }
    : undefined;
  const salarySettlements = existing
    ? [next, ...data.salarySettlements.map((item) => (item.id === existing.id ? annulledExisting! : item))]
    : [next, ...data.salarySettlements];
  const activeAdvanceBalance = salarySettlements
    .filter((item) => item.staffId === staff.id && item.status !== "ANULADA" && normalizeSalaryConcept(item.concept) === "ADELANTO")
    .reduce((total, item) => total + Number(item.advances ?? 0), 0);
  const staffUpdated = data.staff.map((item) =>
    item.id === staff.id ? { ...item, salaryAdvanceBalance: activeAdvanceBalance, updatedAt: timestamp } : item,
  );
  const currentAccounts = preparedData.currentAccounts.some((account) => account.id === staffAccountId(staff.id))
    ? preparedData.currentAccounts
    : [createStaffCurrentAccount(staff), ...preparedData.currentAccounts];
  const withFinancialAccounts = ensureFinancialCurrentAccounts({ ...preparedData, currentAccounts }, next.localId);
  const baseMovements = existing
    ? reverseSourceAccountMovements(data.accountMovements, ["SUELDO"], existing.id, context.user.id, "Correccion de liquidacion", timestamp)
    : data.accountMovements;
  const accountMovements = upsertAccountMovement(
    upsertAccountMovement(baseMovements, salaryAccountMovement(next, context.user.id)),
    localSalaryAccountMovement(next, context.user.id),
  );
  const mutatedData = {
    ...data,
    currentAccounts: withFinancialAccounts,
    accountMovements,
    salarySettlements,
    staff: staffUpdated,
  };
  if (openBalance && (previousUsesLocalCash || targetUsesLocalCash)) {
    const postconditionError = balanceCashReconciliationError(mutatedData, openBalance.id);
    if (postconditionError) return commandError(postconditionError);
  }
  const nextData = auditCommand(
    mutatedData,
    context,
    existing ? "Corregir liquidacion salario" : input.origin === "CAJA" ? "Cargar pago salario cajero" : "Crear liquidacion salario",
    "LiquidacionSalario",
    next.id,
    existing ?? "",
    next,
    existing ? `Reemplaza liquidacion ${existing.id}` : "",
  );
  return commandSuccess(nextData, next);
}

export function annulSalarySettlementCommand(
  data: AppData,
  settlementId: string,
  context: CommandContext,
  options: { requireOpenBalance?: boolean; reason?: string; correctionClosureId?: string } = {},
): CommandResult<SalarySettlement> {
  const previous = data.salarySettlements.find((item) => item.id === settlementId);
  if (!previous) return commandError("No se encontro la liquidacion.");
  const actorMatchesUser =
    context.actorRole === context.user.role ||
    (context.actorRole === "CAJERO" && ["ENCARGADO", "ADMINISTRADOR"].includes(context.user.role)) ||
    (context.actorRole === "ENCARGADO" && context.user.role === "ADMINISTRADOR");
  if (!actorMatchesUser) return commandError("La funcion activa no corresponde al usuario autenticado.");
  if (context.user.status !== "ACTIVO") return commandError("El usuario no esta activo.");
  if (options.requireOpenBalance ? context.actorRole !== "CAJERO" : !["ENCARGADO", "ADMINISTRADOR"].includes(context.actorRole)) {
    return commandError("La funcion activa no permite anular esta liquidacion.");
  }
  if (context.user.role !== "ADMINISTRADOR" && !context.user.localIds.includes(previous.localId)) {
    return commandError("El usuario no esta asignado al local del empleado.");
  }
  if (previous.status === "ANULADA") return commandError("La liquidacion ya esta anulada.");
  const periodError = salaryPeriodMutationError(data, previous.period, options.correctionClosureId);
  if (periodError) return commandError(periodError);
  if (options.requireOpenBalance) {
    const balance = data.balances.find((item) => item.id === previous.balanceId);
    if (!balance || balance.status !== "EN_PROCESO") return commandError("Solo se pueden eliminar salarios antes de cerrar la caja.");
  }
  const previousPaymentAccountId = previous.paymentAccountId ?? localCashAccountId(previous.localId);
  const previousCashOutflow = activeAccountSourceOutflow(data, previousPaymentAccountId, previous.id);
  if (previousCashOutflow > 0 && previousPaymentAccountId === localCashAccountId(previous.localId)) {
    const historicalMutationError = historicalCashMutationError(data, previous.localId, previous.balanceId);
    if (historicalMutationError) return commandError(historicalMutationError);
  }
  const timestamp = context.now();
  const next: SalarySettlement = {
    ...previous,
    status: "ANULADA",
    annulledBy: context.user.id,
    annulledByName: context.user.name,
    annulledAt: timestamp,
    annulledInCorrectionClosureId: options.correctionClosureId,
    updatedAt: timestamp,
  };
  const salarySettlements = data.salarySettlements.map((item) => (item.id === settlementId ? next : item));
  const activeAdvanceBalance = salarySettlements
    .filter((item) => item.staffId === previous.staffId && item.status !== "ANULADA" && normalizeSalaryConcept(item.concept) === "ADELANTO")
    .reduce((total, item) => total + Number(item.advances ?? 0), 0);
  const staff = data.staff.map((item) =>
    item.id === previous.staffId ? { ...item, salaryAdvanceBalance: activeAdvanceBalance, updatedAt: timestamp } : item,
  );
  const accountMovements = reverseSourceAccountMovements(
    data.accountMovements,
    ["SUELDO"],
    settlementId,
    context.user.id,
    options.reason ?? "Anulacion de liquidacion",
    timestamp,
  );
  const nextData = auditCommand(
    { ...data, accountMovements, salarySettlements, staff },
    context,
    options.requireOpenBalance ? "Anular pago salario antes de cierre" : "Eliminar liquidacion salario",
    "LiquidacionSalario",
    settlementId,
    previous,
    next,
    options.reason ?? "Anulacion",
  );
  return commandSuccess(nextData, next);
}
