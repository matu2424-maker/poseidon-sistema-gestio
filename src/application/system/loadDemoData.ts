import type { AppData } from "../../types";
import { createSeedData } from "../../data/appData";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

export type DemoDataSummary = {
  users: number;
  staff: number;
  clients: number;
  machines: number;
  closedBalances: number;
  pendingDifferences: number;
  expenses: number;
  transfers: number;
  gifts: number;
  salarySettlements: number;
  accountMovements: number;
};

export function demoDataSummary(data: AppData): DemoDataSummary {
  return {
    users: data.users.length,
    staff: data.staff.length,
    clients: data.clients.length,
    machines: data.machines.length,
    closedBalances: data.balances.filter((balance) => balance.status === "CERRADO").length,
    pendingDifferences: data.balances.filter((balance) => balance.differenceStatus === "PENDIENTE").length,
    expenses: data.expenses.length,
    transfers: data.transfers.length,
    gifts: data.gifts.length,
    salarySettlements: data.salarySettlements.length,
    accountMovements: data.accountMovements.length,
  };
}

export function loadDemoDataCommand(data: AppData, context: CommandContext): CommandResult<DemoDataSummary> {
  if (context.user.status !== "ACTIVO") return commandError("El usuario no esta activo.");
  if (context.user.role !== "ADMINISTRADOR" || context.actorRole !== "ADMINISTRADOR") {
    return commandError("Solo un Administrador en funcion Administrador puede cargar los datos demo.");
  }

  const previousSummary = demoDataSummary(data);
  const demo = createSeedData();
  const nextSummary = demoDataSummary(demo);
  const audited = auditCommand(
    demo,
    context,
    "Cargar escenario demo integral",
    "Sistema",
    "demo-data",
    previousSummary,
    nextSummary,
    "Carga local de pruebas con respaldo previo",
  );

  return commandSuccess(audited, nextSummary);
}
