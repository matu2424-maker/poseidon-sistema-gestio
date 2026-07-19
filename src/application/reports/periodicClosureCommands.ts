import type { AppData, PeriodicClosure, PeriodicClosureType, Role } from "../../types";
import { summarizePeriodicRange } from "../../lib/periodicTotals";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { localCommandAccessError } from "../localAccess";

const PERIODIC_ROLES: readonly Role[] = ["ENCARGADO", "ADMINISTRADOR"];
const PERIODIC_TYPES: readonly PeriodicClosureType[] = ["SEMANAL", "QUINCENAL", "MENSUAL", "PERSONALIZADO"];

export type CreatePeriodicClosureInput = {
  localId: string;
  type: PeriodicClosureType;
  startDate: string;
  endDate: string;
  note: string;
};

const balanceDate = (value: { closedAt?: string; operatingDate: string }) =>
  value.closedAt?.slice(0, 10) ?? value.operatingDate;

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const nextPeriodicVisibleId = (data: AppData) => {
  const max = data.periodicClosures
    .map((closure) => {
      const match = String(closure.visibleId ?? "").match(/PER-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((highest, value) => Math.max(highest, value), 0);
  return `PER-${max + 1}`;
};

const periodicAccessError = (data: AppData, localId: string, context: CommandContext) =>
  localCommandAccessError(
    data,
    localId,
    context,
    PERIODIC_ROLES,
    "La funcion activa no permite gestionar cierres periodicos.",
  );

export function createPeriodicClosureCommand(
  data: AppData,
  input: CreatePeriodicClosureInput,
  context: CommandContext,
): CommandResult<PeriodicClosure> {
  const denied = periodicAccessError(data, input.localId, context);
  if (denied) return commandError(denied);
  if (!PERIODIC_TYPES.includes(input.type)) return commandError("Selecciona un tipo de cierre periodico valido.");
  if (!isValidDate(input.startDate) || !isValidDate(input.endDate)) {
    return commandError("Completa fechas validas para el cierre periodico.");
  }
  if (input.startDate > input.endDate) {
    return commandError("La fecha inicial no puede ser mayor a la fecha final.");
  }

  const balances = data.balances.filter(
    (balance) =>
      balance.localId === input.localId &&
      balance.status === "CERRADO" &&
      balanceDate(balance) >= input.startDate &&
      balanceDate(balance) <= input.endDate,
  );
  if (!balances.length) return commandError("No hay cajas cerradas dentro del periodo seleccionado.");

  const totals = summarizePeriodicRange(data, {
    balances,
    localIds: [input.localId],
    startDate: input.startDate,
    endDate: input.endDate,
    type: input.type,
  });
  const timestamp = context.now();
  const closure: PeriodicClosure = {
    id: context.id("periodic"),
    visibleId: nextPeriodicVisibleId(data),
    localId: input.localId,
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    balanceIds: balances.map((balance) => balance.id),
    ...totals,
    status: "GENERADO",
    note: input.note.trim(),
    createdBy: context.user.id,
    createdAt: timestamp,
  };
  const mutated = { ...data, periodicClosures: [closure, ...data.periodicClosures] };
  return commandSuccess(
    auditCommand(
      mutated,
      context,
      "Generar cierre periodico",
      "CierrePeriodico",
      closure.id,
      "",
      closure,
      closure.note,
      { localId: closure.localId },
    ),
    closure,
  );
}

export function annulPeriodicClosureCommand(
  data: AppData,
  closureId: string,
  reason: string,
  context: CommandContext,
): CommandResult<PeriodicClosure> {
  const previous = data.periodicClosures.find((closure) => closure.id === closureId);
  if (!previous) return commandError("No se encontro el cierre periodico.");
  const denied = periodicAccessError(data, previous.localId, context);
  if (denied) return commandError(denied);
  if (previous.status === "ANULADO") return commandError("El cierre periodico ya esta anulado.");
  const note = reason.trim();
  if (!note) return commandError("La anulacion requiere un motivo.");

  const next: PeriodicClosure = { ...previous, status: "ANULADO" };
  const mutated = {
    ...data,
    periodicClosures: data.periodicClosures.map((closure) => (closure.id === previous.id ? next : closure)),
  };
  return commandSuccess(
    auditCommand(
      mutated,
      context,
      "Anular cierre periodico",
      "CierrePeriodico",
      previous.id,
      previous,
      next,
      note,
      { localId: previous.localId },
    ),
    next,
  );
}
