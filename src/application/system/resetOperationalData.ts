import type { AppData } from "../../types";
import { clearOperationalData } from "../../data/appData";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

export type OperationalDataSummary = {
  balances: number;
  readings: number;
  expenses: number;
  transfers: number;
  gifts: number;
  salarySettlements: number;
  periodicClosures: number;
  salaryClosures: number;
  financialMovements: number;
  auditEvents: number;
};

export function operationalDataSummary(data: AppData): OperationalDataSummary {
  return {
    balances: data.balances.length,
    readings: data.readings.length,
    expenses: data.expenses.length,
    transfers: data.transfers.length,
    gifts: data.gifts.length,
    salarySettlements: data.salarySettlements.length,
    periodicClosures: data.periodicClosures.length,
    salaryClosures: data.salaryClosures.length,
    financialMovements:
      data.accountMovements.length +
      data.capitalMovements.length +
      data.treasuryTransfers.length +
      data.partnerMovements.length,
    auditEvents: data.audit.length,
  };
}

export function resetOperationalDataCommand(
  data: AppData,
  context: CommandContext,
): CommandResult<OperationalDataSummary> {
  if (context.user.status !== "ACTIVO") return commandError("El usuario no esta activo.");
  if (context.user.role !== "ADMINISTRADOR" || context.actorRole !== "ADMINISTRADOR") {
    return commandError("Solo un Administrador en funcion Administrador puede reiniciar los datos operativos.");
  }

  const previousSummary = operationalDataSummary(data);
  const timestamp = context.now();
  const cleared = clearOperationalData(data, timestamp);
  const cleanSummary = operationalDataSummary(cleared);
  const audited = auditCommand(
    cleared,
    context,
    "Crear base operativa limpia",
    "Sistema",
    "operational-data",
    previousSummary,
    cleanSummary,
    "Reinicio local de pruebas con respaldo previo",
  );

  return commandSuccess(audited, cleanSummary);
}
