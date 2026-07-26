import type { AppData, Reading } from "../../types";
import { syncMachineResultAccountMovement } from "../../lib/accountMovements";
import { balanceCashReconciliationError } from "../../lib/cashAvailability";
import { calcReading } from "../../lib/cashTotals";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { localCommandAccessError } from "../localAccess";

export type ReadingPatch = Partial<Pick<Reading, "inActual" | "outActual" | "status" | "observation">>;

export type ReadingUpdate = {
  readingId: string;
  patch: ReadingPatch;
};

function validatedReading(previous: Reading, patch: ReadingPatch, context: CommandContext): Reading | string {
  if (patch.inActual !== undefined && patch.inActual !== null && !Number.isFinite(patch.inActual)) {
    return "El IN actual debe ser un numero valido.";
  }
  if (patch.outActual !== undefined && patch.outActual !== null && !Number.isFinite(patch.outActual)) {
    return "El OUT actual debe ser un numero valido.";
  }
  if (patch.inActual !== undefined && patch.inActual !== null && patch.inActual < previous.inPrevious) {
    return "El IN actual debe ser igual o mayor al IN anterior.";
  }
  if (patch.outActual !== undefined && patch.outActual !== null && patch.outActual < previous.outPrevious) {
    return "El OUT actual debe ser igual o mayor al OUT anterior.";
  }
  const updated: Reading = {
    ...previous,
    ...patch,
    updatedBy: context.user.id,
    updatedAt: context.now(),
  };
  return { ...updated, result: calcReading(updated) };
}

export function saveReadingsCommand(
  data: AppData,
  balanceId: string,
  updates: ReadingUpdate[],
  context: CommandContext,
): CommandResult<Reading[]> {
  const balance = data.balances.find((item) => item.id === balanceId);
  if (!balance || balance.status !== "EN_PROCESO") return commandError("La caja ya no esta abierta.");
  const accessError = localCommandAccessError(
    data,
    balance.localId,
    context,
    ["CAJERO"],
    "Los contadores solo se guardan desde la funcion Cajero.",
  );
  if (accessError) return commandError(accessError);
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  if (!updates.length) return commandError("No hay contadores para guardar.");
  if (new Set(updates.map((update) => update.readingId)).size !== updates.length) {
    return commandError("La carga contiene contadores repetidos.");
  }

  const nextById = new Map<string, Reading>();
  for (const update of updates) {
    const previous = data.readings.find(
      (reading) => reading.id === update.readingId && reading.balanceId === balanceId,
    );
    if (!previous) return commandError("No se encontro una lectura de maquina de esta caja.");
    const next = validatedReading(previous, update.patch, context);
    if (typeof next === "string") return commandError(next);
    nextById.set(previous.id, next);
  }

  const readings = data.readings.map((reading) => nextById.get(reading.id) ?? reading);
  let nextData = syncMachineResultAccountMovement({ ...data, readings }, balanceId, context.user.id);
  for (const [readingId, nextReading] of nextById) {
    const previous = data.readings.find((reading) => reading.id === readingId)!;
    nextData = auditCommand(
      nextData,
      context,
      "Guardar contador",
      "Recaudacion",
      readingId,
      previous,
      nextReading,
    );
  }
  return commandSuccess(nextData, [...nextById.values()]);
}

export function saveReadingCommand(
  data: AppData,
  balanceId: string,
  readingId: string,
  patch: ReadingPatch,
  context: CommandContext,
): CommandResult<Reading> {
  const result = saveReadingsCommand(data, balanceId, [{ readingId, patch }], context);
  if (!result.ok) return result;
  return commandSuccess(result.data, result.value[0]);
}
