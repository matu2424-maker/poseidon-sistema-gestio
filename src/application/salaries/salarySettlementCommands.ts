import type { AppData, SalaryConcept, SalarySettlement } from "../../types";
import {
  localSalaryAccountMovement,
  reverseSourceAccountMovements,
  salaryAccountMovement,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { createStaffCurrentAccount, ensureLocalCurrentAccounts, staffAccountId } from "../../lib/currentAccounts";
import {
  activeLocalCashSourceOutflow,
  balanceCashReconciliationError,
  historicalCashMutationError,
  localCashOutflowError,
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
  correctionClosureId?: string;
};

export function saveSalarySettlementCommand(
  data: AppData,
  input: SaveSalarySettlementInput,
  context: CommandContext,
): CommandResult<SalarySettlement> {
  const staff = data.staff.find((item) => item.id === input.staffId && item.status === "ACTIVO");
  if (!staff) return commandError("Selecciona una persona activa.");
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

  const breakdown = salaryConceptBreakdown(concept, input.amount);
  const nextCashAmount = concept === "DESCUENTO" ? 0 : input.amount;
  const previousCashAmount = existing?.localId === staff.localId
    ? activeLocalCashSourceOutflow(data, staff.localId, existing.id)
    : 0;
  const netCashOutflow = Math.max(0, nextCashAmount - previousCashAmount);
  const targetBalanceId = input.balanceId ?? existing?.balanceId;
  const openBalance = data.balances.find((item) => item.localId === staff.localId && item.status === "EN_PROCESO");
  if (existing && previousCashAmount > 0) {
    const sourceMutationError = historicalCashMutationError(data, staff.localId, existing.balanceId);
    if (sourceMutationError) return commandError(sourceMutationError);
  }
  if (nextCashAmount > 0) {
    const targetMutationError = historicalCashMutationError(data, staff.localId, targetBalanceId);
    if (targetMutationError) return commandError(targetMutationError);
  }
  if (openBalance) {
    const reconciliationError = balanceCashReconciliationError(data, openBalance.id);
    if (reconciliationError) return commandError(reconciliationError);
  }
  const cashError = localCashOutflowError(data, staff.localId, netCashOutflow);
  if (cashError) return commandError(cashError);

  const timestamp = context.now();
  const correction = Boolean(existing);
  const next: SalarySettlement = {
    id: correction ? context.id("salary-settlement-correction") : context.id("salary-settlement"),
    period: input.period,
    balanceId: input.balanceId ?? existing?.balanceId,
    staffId: staff.id,
    staffName: staffFullName(staff),
    localId: staff.localId,
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
  const currentAccounts = data.currentAccounts.some((account) => account.id === staffAccountId(staff.id))
    ? data.currentAccounts
    : [createStaffCurrentAccount(staff), ...data.currentAccounts];
  const withLocalAccounts = ensureLocalCurrentAccounts({ ...data, currentAccounts }, next.localId);
  const baseMovements = existing
    ? reverseSourceAccountMovements(data.accountMovements, ["SUELDO"], existing.id, context.user.id, "Correccion de liquidacion", timestamp)
    : data.accountMovements;
  const accountMovements = upsertAccountMovement(
    upsertAccountMovement(baseMovements, salaryAccountMovement(next, context.user.id)),
    localSalaryAccountMovement(next, context.user.id),
  );
  const mutatedData = {
    ...data,
    currentAccounts: withLocalAccounts,
    accountMovements,
    salarySettlements,
    staff: staffUpdated,
  };
  if (openBalance) {
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
  if (previous.status === "ANULADA") return commandError("La liquidacion ya esta anulada.");
  const periodError = salaryPeriodMutationError(data, previous.period, options.correctionClosureId);
  if (periodError) return commandError(periodError);
  if (options.requireOpenBalance) {
    const balance = data.balances.find((item) => item.id === previous.balanceId);
    if (!balance || balance.status !== "EN_PROCESO") return commandError("Solo se pueden eliminar salarios antes de cerrar la caja.");
  }
  const previousCashOutflow = activeLocalCashSourceOutflow(data, previous.localId, previous.id);
  if (previousCashOutflow > 0) {
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
