import type { AppData, SalaryClosure } from "../../types";
import { monthLabel, periodRange } from "../../lib/periods";
import {
  latestClosedSalaryClosure,
  openSalaryCorrection,
  salaryClosureEmployeeSnapshots,
  salaryClosurePeriod,
  salaryPeriodEmployeeSummaries,
  salaryPeriodTotals,
} from "../../lib/salaryClosures";
import { isValidSalaryPeriod } from "../../lib/salaryRules";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

const canManageSalaryClosures = (context: CommandContext) =>
  context.actorRole === "ENCARGADO" || context.actorRole === "ADMINISTRADOR";

const nextSalaryClosureVisibleId = (data: Pick<AppData, "salaryClosures">) => {
  const maximum = data.salaryClosures.reduce((highest, closure) => {
    const match = String(closure.visibleId ?? "").match(/LS-(\d+)$/);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0);
  return `LS-${maximum + 1}`;
};

const closureSnapshot = (data: AppData, period: string) => {
  const rows = salaryPeriodEmployeeSummaries(data, period);
  const employeeSnapshots = salaryClosureEmployeeSnapshots(rows);
  const totals = salaryPeriodTotals(rows);
  return {
    rows,
    employeeSnapshots,
    totals,
    settlementIds: employeeSnapshots.flatMap((employee) => employee.settlementIds),
  };
};

export function closeSalaryPeriodCommand(
  data: AppData,
  input: { period: string; note?: string },
  context: CommandContext,
): CommandResult<SalaryClosure> {
  if (!canManageSalaryClosures(context)) return commandError("Solo encargado o administrador pueden cerrar salarios.");
  if (!isValidSalaryPeriod(input.period)) return commandError("Selecciona un periodo salarial valido.");
  if (latestClosedSalaryClosure(data, input.period)) return commandError("Este periodo ya tiene un cierre salarial definitivo.");
  if (openSalaryCorrection(data, input.period)) return commandError("Este periodo tiene un ajuste correctivo abierto.");
  const salaryInOpenCash = data.salarySettlements.find((settlement) => {
    if (settlement.period !== input.period || settlement.status === "ANULADA" || !settlement.balanceId) return false;
    return data.balances.some((balance) => balance.id === settlement.balanceId && balance.status === "EN_PROCESO");
  });
  if (salaryInOpenCash) return commandError("Hay pagos del periodo vinculados a una caja abierta. Cierra esa caja antes del cierre salarial.");

  const snapshot = closureSnapshot(data, input.period);
  if (!snapshot.rows.length) return commandError("No hay empleados ni liquidaciones para cerrar en este periodo.");
  const timestamp = context.now();
  const range = periodRange(input.period);
  const closure: SalaryClosure = {
    id: context.id("salary-closure"),
    visibleId: nextSalaryClosureVisibleId(data),
    period: input.period,
    startDate: range.start,
    endDate: range.end,
    periodLabel: monthLabel(input.period),
    kind: "ORDINARIO",
    revision: 0,
    snapshotVersion: 1,
    employeeSnapshots: snapshot.employeeSnapshots,
    employeeCount: snapshot.employeeSnapshots.length,
    settlementIds: snapshot.settlementIds,
    ...snapshot.totals,
    status: "CERRADO",
    note: input.note?.trim() || "Cierre mensual definitivo de liquidacion de salarios",
    createdBy: context.user.id,
    createdByName: context.user.name,
    createdAt: timestamp,
    closedBy: context.user.id,
    closedByName: context.user.name,
    closedAt: timestamp,
  };
  const nextData = auditCommand(
    { ...data, salaryClosures: [closure, ...data.salaryClosures] },
    context,
    "Cerrar periodo salarial definitivo",
    "LiquidacionSalarioCierre",
    closure.id,
    "",
    closure,
    closure.note,
  );
  return commandSuccess(nextData, closure);
}

export function startSalaryCorrectionCommand(
  data: AppData,
  input: { parentClosureId: string; note: string },
  context: CommandContext,
): CommandResult<SalaryClosure> {
  if (!canManageSalaryClosures(context)) return commandError("Solo encargado o administrador pueden corregir cierres salariales.");
  const parent = data.salaryClosures.find(
    (closure) => closure.id === input.parentClosureId && closure.status === "CERRADO",
  );
  if (!parent) return commandError("No se encontro el cierre salarial a corregir.");
  const period = salaryClosurePeriod(parent);
  const latest = latestClosedSalaryClosure(data, period);
  if (latest?.id !== parent.id) return commandError(`La correccion debe partir del ultimo cierre ${latest?.visibleId ?? "vigente"}.`);
  if (openSalaryCorrection(data, period)) return commandError("Este periodo ya tiene un ajuste correctivo abierto.");
  const note = input.note.trim();
  if (!note) return commandError("El motivo del ajuste correctivo es obligatorio.");
  const nextRevision =
    data.salaryClosures
      .filter((closure) => salaryClosurePeriod(closure) === period)
      .reduce((highest, closure) => Math.max(highest, Number(closure.revision ?? 0)), 0) + 1;

  const correction: SalaryClosure = {
    ...parent,
    id: context.id("salary-closure-correction"),
    visibleId: nextSalaryClosureVisibleId(data),
    kind: "CORRECTIVO",
    revision: nextRevision,
    parentClosureId: parent.id,
    status: "CORRECCION_ABIERTA",
    note,
    createdBy: context.user.id,
    createdByName: context.user.name,
    createdAt: context.now(),
    closedBy: undefined,
    closedByName: undefined,
    closedAt: undefined,
  };
  const nextData = auditCommand(
    { ...data, salaryClosures: [correction, ...data.salaryClosures] },
    context,
    "Iniciar ajuste correctivo salarial",
    "LiquidacionSalarioCierre",
    correction.id,
    parent,
    correction,
    note,
  );
  return commandSuccess(nextData, correction);
}

export function closeSalaryCorrectionCommand(
  data: AppData,
  correctionClosureId: string,
  context: CommandContext,
): CommandResult<SalaryClosure> {
  if (!canManageSalaryClosures(context)) return commandError("Solo encargado o administrador pueden cerrar ajustes salariales.");
  const previous = data.salaryClosures.find(
    (closure) => closure.id === correctionClosureId && closure.status === "CORRECCION_ABIERTA",
  );
  if (!previous) return commandError("No se encontro un ajuste correctivo abierto.");
  const period = salaryClosurePeriod(previous);
  const linkedChanges = data.salarySettlements.filter(
    (settlement) =>
      settlement.correctionClosureId === correctionClosureId ||
      settlement.annulledInCorrectionClosureId === correctionClosureId,
  );
  if (!linkedChanges.length) return commandError("Registra al menos una correccion antes de cerrar el ajuste.");

  const snapshot = closureSnapshot(data, period);
  const timestamp = context.now();
  const next: SalaryClosure = {
    ...previous,
    snapshotVersion: 1,
    employeeSnapshots: snapshot.employeeSnapshots,
    employeeCount: snapshot.employeeSnapshots.length,
    settlementIds: snapshot.settlementIds,
    ...snapshot.totals,
    status: "CERRADO",
    closedBy: context.user.id,
    closedByName: context.user.name,
    closedAt: timestamp,
  };
  const salaryClosures = data.salaryClosures.map((closure) =>
    closure.id === correctionClosureId ? next : closure,
  );
  const nextData = auditCommand(
    { ...data, salaryClosures },
    context,
    "Cerrar ajuste correctivo salarial",
    "LiquidacionSalarioCierre",
    next.id,
    previous,
    next,
    next.note,
  );
  return commandSuccess(nextData, next);
}

export function cancelSalaryCorrectionCommand(
  data: AppData,
  correctionClosureId: string,
  context: CommandContext,
): CommandResult<SalaryClosure> {
  if (!canManageSalaryClosures(context)) return commandError("Solo encargado o administrador pueden cancelar ajustes salariales.");
  const previous = data.salaryClosures.find(
    (closure) => closure.id === correctionClosureId && closure.status === "CORRECCION_ABIERTA",
  );
  if (!previous) return commandError("No se encontro un ajuste correctivo abierto.");
  const linkedChanges = data.salarySettlements.some(
    (settlement) =>
      settlement.correctionClosureId === correctionClosureId ||
      settlement.annulledInCorrectionClosureId === correctionClosureId,
  );
  if (linkedChanges) return commandError("El ajuste ya tiene movimientos. Reviertelos dentro de la correccion y cierra la revision.");
  const timestamp = context.now();
  const next: SalaryClosure = {
    ...previous,
    status: "ANULADO",
    closedBy: context.user.id,
    closedByName: context.user.name,
    closedAt: timestamp,
  };
  const salaryClosures = data.salaryClosures.map((closure) =>
    closure.id === correctionClosureId ? next : closure,
  );
  const nextData = auditCommand(
    { ...data, salaryClosures },
    context,
    "Cancelar ajuste correctivo salarial",
    "LiquidacionSalarioCierre",
    next.id,
    previous,
    next,
    next.note,
  );
  return commandSuccess(nextData, next);
}
