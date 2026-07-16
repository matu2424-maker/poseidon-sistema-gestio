import type { AppData, Reading } from "../../types";
import { syncMachineResultAccountMovement } from "../../lib/accountMovements";
import { balanceCashReconciliationError } from "../../lib/cashAvailability";
import { calcReading } from "../../lib/cashTotals";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

export type ReadingPatch = Partial<Pick<Reading, "inActual" | "outActual" | "status" | "observation">>;

export function saveReadingCommand(
  data: AppData,
  balanceId: string,
  readingId: string,
  patch: ReadingPatch,
  context: CommandContext,
): CommandResult<Reading> {
  const balance = data.balances.find((item) => item.id === balanceId);
  if (!balance || balance.status !== "EN_PROCESO") return commandError("La caja ya no esta abierta.");
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  const previous = data.readings.find((reading) => reading.id === readingId && reading.balanceId === balanceId);
  if (!previous) return commandError("No se encontro la lectura de la maquina.");
  if (patch.inActual !== undefined && patch.inActual !== null && patch.inActual < previous.inPrevious) {
    return commandError("El IN actual debe ser igual o mayor al IN anterior.");
  }
  if (patch.outActual !== undefined && patch.outActual !== null && patch.outActual < previous.outPrevious) {
    return commandError("El OUT actual debe ser igual o mayor al OUT anterior.");
  }
  const updated: Reading = {
    ...previous,
    ...patch,
    updatedBy: context.user.id,
    updatedAt: context.now(),
  };
  const nextReading = { ...updated, result: calcReading(updated) };
  const readings = data.readings.map((reading) => (reading.id === readingId ? nextReading : reading));
  const synced = syncMachineResultAccountMovement({ ...data, readings }, balanceId, context.user.id);
  return commandSuccess(
    auditCommand(synced, context, "Guardar contador", "Recaudacion", readingId, previous, nextReading),
    nextReading,
  );
}
