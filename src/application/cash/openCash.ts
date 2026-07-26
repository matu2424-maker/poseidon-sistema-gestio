import type {
  Balance,
  CapitalMovementPerson,
  AppData,
  PartnerMovement,
  Reading,
  TreasuryTransfer,
} from "../../types";
import {
  partnerMovementAccountMovements,
  treasuryTransferAccountMovements,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { openBalanceForLocal } from "../../lib/balanceReferences";
import { ensureFinancialCurrentAccounts, localAccountBalances } from "../../lib/currentAccounts";
import { nextBalanceVisibleId } from "../../data/appData";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { localCommandAccessError } from "../localAccess";

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
  const accessError = localCommandAccessError(
    data,
    input.localId,
    context,
    ["CAJERO"],
    "La caja solo se abre desde la funcion Cajero.",
  );
  if (accessError) return commandError(accessError);
  if (!input.operatingDate) return commandError("La fecha operativa es obligatoria.");
  if (![input.initialFund, input.initialBankFund].every(Number.isFinite)) {
    return commandError("Los saldos iniciales deben ser numeros finitos.");
  }
  if (input.initialFund < 0 || input.initialBankFund < 0) return commandError("Los saldos iniciales no pueden ser negativos.");
  const firstOpening = !data.balances.some((balance) => balance.localId === input.localId);
  if (input.firstOpening !== firstOpening) {
    return commandError("El estado de apertura inicial no coincide con el historial del local.");
  }
  if (!firstOpening) {
    const inherited = localAccountBalances(data, input.localId);
    if (input.initialFund !== inherited.cash || input.initialBankFund !== inherited.bank) {
      return commandError("La caja debe abrir con los saldos vigentes de Caja / Efectivo y Caja / Banco.");
    }
  }
  if (openBalanceForLocal(data, input.localId)) {
    return commandError("Ya existe una caja abierta para ese local. Primero hay que cerrarla.");
  }

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

  const openingPartnerCandidates: Array<PartnerMovement | null> = firstOpening
    ? [
        input.initialFund > 0
          ? {
              id: context.id("partner-opening-cash"),
              balanceId: balance.id,
              localId: input.localId,
              partner: input.openingCapitalPerson,
              type: "APORTE_SOCIO" as const,
              medium: "EFECTIVO" as const,
              amount: input.initialFund,
              currency: "UYU" as const,
              note: `Aporte inicial de socio para caja ${balance.visibleId}`,
              status: "ACTIVO" as const,
              userId: context.user.id,
              createdAt: timestamp,
            }
          : null,
        input.initialBankFund > 0
          ? {
              id: context.id("partner-opening-bank"),
              balanceId: balance.id,
              localId: input.localId,
              partner: input.openingCapitalPerson,
              type: "APORTE_SOCIO" as const,
              medium: "BANCO" as const,
              amount: input.initialBankFund,
              currency: "UYU" as const,
              note: `Aporte inicial de socio para banco de caja ${balance.visibleId}`,
              status: "ACTIVO" as const,
              userId: context.user.id,
              createdAt: timestamp,
            }
          : null,
      ]
    : [];
  const openingPartnerMovements = openingPartnerCandidates.filter(
    (movement): movement is PartnerMovement => movement !== null,
  );
  const openingTransferCandidates: Array<TreasuryTransfer | null> = firstOpening
    ? [
        input.initialFund > 0
          ? {
              id: context.id("treasury-opening-cash"),
              balanceId: balance.id,
              localId: input.localId,
              type: "APORTE_CAJA" as const,
              medium: "EFECTIVO" as const,
              timing: "APERTURA" as const,
              amount: input.initialFund,
              currency: "UYU" as const,
              note: `Asignacion inicial a caja ${balance.visibleId}`,
              status: "ACTIVO" as const,
              userId: context.user.id,
              createdAt: timestamp,
            }
          : null,
        input.initialBankFund > 0
          ? {
              id: context.id("treasury-opening-bank"),
              balanceId: balance.id,
              localId: input.localId,
              type: "APORTE_CAJA" as const,
              medium: "BANCO" as const,
              timing: "APERTURA" as const,
              amount: input.initialBankFund,
              currency: "UYU" as const,
              note: `Asignacion inicial a banco de caja ${balance.visibleId}`,
              status: "ACTIVO" as const,
              userId: context.user.id,
              createdAt: timestamp,
            }
          : null,
      ]
    : [];
  const openingTreasuryTransfers = openingTransferCandidates.filter(
    (transfer): transfer is TreasuryTransfer => transfer !== null,
  );
  const financialAccounts = ensureFinancialCurrentAccounts(data, input.localId);
  const withPartnerMovements = openingPartnerMovements.reduce(
    (movements, movement) => partnerMovementAccountMovements(movement).reduce(upsertAccountMovement, movements),
    data.accountMovements,
  );
  const accountMovements = openingTreasuryTransfers.reduce(
    (movements, transfer) => treasuryTransferAccountMovements(transfer).reduce(upsertAccountMovement, movements),
    withPartnerMovements,
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
      currentAccounts: financialAccounts,
      accountMovements,
      treasuryTransfers: [...openingTreasuryTransfers, ...data.treasuryTransfers],
      partnerMovements: [...openingPartnerMovements, ...data.partnerMovements],
      balances: [balance, ...data.balances],
      readings: [...readings, ...data.readings],
    },
    context,
    "Abrir caja",
    "BalanceDiario",
    balance.id,
    "",
    { balance, openingPartnerMovements, openingTreasuryTransfers },
  );
  return commandSuccess(nextData, balance);
}
