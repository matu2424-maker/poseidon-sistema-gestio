import type {
  Balance,
  CapitalMovement,
  CapitalMovementPerson,
  AppData,
  Reading,
} from "../../types";
import { capitalAccountMovement, upsertAccountMovement } from "../../lib/accountMovements";
import { ensureLocalCurrentAccounts } from "../../lib/currentAccounts";
import { nextBalanceVisibleId } from "../../data/appData";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

export type OpenCashInput = {
  localId: string;
  operatingDate: string;
  initialFund: number;
  initialBankFund: number;
  initialNote: string;
  openingCapitalPerson: CapitalMovementPerson;
  firstOpening: boolean;
};

export function openCashCommand(data: AppData, input: OpenCashInput, context: CommandContext): CommandResult<Balance> {
  const local = data.locals.find((item) => item.id === input.localId);
  if (!local) return commandError("No se encontro el local activo.");
  if (!input.operatingDate) return commandError("La fecha operativa es obligatoria.");
  if (input.initialFund < 0 || input.initialBankFund < 0) return commandError("Los saldos iniciales no pueden ser negativos.");
  const duplicate = data.balances.find(
    (balance) =>
      balance.localId === input.localId &&
      balance.operatingDate === input.operatingDate &&
      balance.status === "EN_PROCESO",
  );
  if (duplicate) return commandError("Ya existe una caja abierta para ese local y fecha.");

  const timestamp = context.now();
  const balance: Balance = {
    id: context.id("balance"),
    visibleId: nextBalanceVisibleId(data, input.localId),
    localId: input.localId,
    operatingDate: input.operatingDate,
    status: "EN_PROCESO",
    initialFund: input.initialFund,
    initialBankFund: input.initialBankFund,
    initialNote: input.initialNote,
    openedBy: context.user.id,
    openedByRole: context.actorRole,
    openedAt: timestamp,
  };

  const openingCapitalCandidates: Array<CapitalMovement | null> = input.firstOpening
    ? [
        input.initialFund > 0
          ? {
              id: context.id("capital-opening-cash"),
              balanceId: balance.id,
              localId: input.localId,
              type: "APORTE" as const,
              medium: "EFECTIVO" as const,
              timing: "APERTURA" as const,
              person: input.openingCapitalPerson,
              amount: input.initialFund,
              note: `Aporte inicial caja ${balance.visibleId}`,
              status: "ACTIVO" as const,
              userId: context.user.id,
              createdAt: timestamp,
            }
          : null,
        input.initialBankFund > 0
          ? {
              id: context.id("capital-opening-bank"),
              balanceId: balance.id,
              localId: input.localId,
              type: "APORTE" as const,
              medium: "TRANSFERENCIA" as const,
              timing: "APERTURA" as const,
              person: input.openingCapitalPerson,
              amount: input.initialBankFund,
              note: `Aporte inicial banco caja ${balance.visibleId}`,
              status: "ACTIVO" as const,
              userId: context.user.id,
              createdAt: timestamp,
            }
          : null,
      ]
    : [];
  const openingCapitalMovements = openingCapitalCandidates.filter((movement): movement is CapitalMovement => movement !== null);

  const accountMovements = openingCapitalMovements.reduce(
    (movements, movement) => upsertAccountMovement(movements, capitalAccountMovement(movement)),
    data.accountMovements,
  );
  const readings: Reading[] = data.machines
    .filter((machine) => machine.localId === input.localId && machine.status !== "INACTIVA" && machine.status !== "DESUSO")
    .map((machine) => ({
      id: context.id("reading"),
      balanceId: balance.id,
      machineId: machine.id,
      inPrevious: machine.lastIn,
      inActual: machine.lastIn,
      outPrevious: machine.lastOut,
      outActual: machine.lastOut,
      result: 0,
      status: machine.status === "ACTIVA" ? "PENDIENTE" : "FUERA_DE_SERVICIO",
      observation: machine.status === "ACTIVA" ? "" : "Maquina en mantenimiento",
      updatedBy: context.user.id,
      updatedAt: timestamp,
    }));
  const nextData = auditCommand(
    {
      ...data,
      currentAccounts: ensureLocalCurrentAccounts(data, input.localId),
      accountMovements,
      capitalMovements: [...openingCapitalMovements, ...data.capitalMovements],
      balances: [balance, ...data.balances],
      readings: [...readings, ...data.readings],
    },
    context,
    "Abrir caja",
    "BalanceDiario",
    balance.id,
    "",
    { balance, openingCapitalMovements },
  );
  return commandSuccess(nextData, balance);
}
