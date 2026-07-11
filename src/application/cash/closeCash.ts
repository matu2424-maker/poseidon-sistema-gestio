import type {
  AppData,
  Balance,
  CapitalMovement,
  CapitalMovementPerson,
  MachineLocalHistory,
} from "../../types";
import {
  capitalAccountMovement,
  syncDifferenceAccountMovements,
  syncMachineResultAccountMovement,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { totalsForBalance } from "../../lib/cashTotals";
import { ensureLocalCurrentAccounts, localAccountBalances } from "../../lib/currentAccounts";
import { balanceVisibleId } from "../../lib/display";
import { machineHistoryEvent } from "../../lib/machineHistory";
import { counter } from "../../lib/money";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";

export type CloseCashInput = {
  balanceId: string;
  declaredCash: number;
  declaredBank: number;
  finalWithdrawalCash: number;
  finalWithdrawalBank: number;
  withdrawalCashPerson: CapitalMovementPerson;
  withdrawalBankPerson: CapitalMovementPerson;
  differenceNote: string;
};

export function closeCashCommand(data: AppData, input: CloseCashInput, context: CommandContext): CommandResult<Balance> {
  const balance = data.balances.find((item) => item.id === input.balanceId);
  if (!balance || balance.status !== "EN_PROCESO") return commandError("La caja ya no esta abierta.");
  const inputAmounts = [
    input.declaredCash,
    input.declaredBank,
    input.finalWithdrawalCash,
    input.finalWithdrawalBank,
    balance.initialFund,
    balance.initialBankFund ?? 0,
  ];
  if (!inputAmounts.every((amount) => Number.isFinite(amount))) {
    return commandError("Los importes del cierre deben ser numeros finitos.");
  }
  const pendingInvalid = data.readings.filter(
    (reading) => reading.balanceId === balance.id && reading.status === "PENDIENTE" && !reading.observation.trim(),
  );
  if (pendingInvalid.length) return commandError("No se puede cerrar: hay maquinas activas pendientes sin observacion.");
  if (input.declaredCash < 0 || input.declaredBank < 0) return commandError("Los importes declarados no pueden ser negativos.");
  if (input.finalWithdrawalCash < 0 || input.finalWithdrawalBank < 0) return commandError("Los retiros finales no pueden ser negativos.");

  const totals = totalsForBalance(data, balance.id);
  const localBalances = localAccountBalances(data, balance.localId);
  if (
    !Object.values(totals).every((amount) => Number.isFinite(amount)) ||
    ![localBalances.cash, localBalances.bank].every((amount) => Number.isFinite(amount))
  ) {
    return commandError("Los importes del cierre deben ser numeros finitos.");
  }
  if (input.finalWithdrawalCash > totals.expectedCash) {
    return commandError("El retiro final en efectivo no puede superar el efectivo esperado antes del retiro.");
  }
  if (input.finalWithdrawalBank > localBalances.bank) {
    return commandError("El retiro final por transferencia no puede superar el saldo banco del local.");
  }

  const expectedCashAfterWithdrawal = totals.expectedCash - input.finalWithdrawalCash;
  const expectedBankAfterWithdrawal = localBalances.bank - input.finalWithdrawalBank;
  const cashDifference = input.declaredCash - expectedCashAfterWithdrawal;
  const bankDifference = input.declaredBank - expectedBankAfterWithdrawal;
  if (![expectedCashAfterWithdrawal, expectedBankAfterWithdrawal, cashDifference, bankDifference].every((amount) => Number.isFinite(amount))) {
    return commandError("Los importes del cierre deben ser numeros finitos.");
  }
  const differenceNote = input.differenceNote.trim();
  if ((cashDifference !== 0 || bankDifference !== 0) && !differenceNote) {
    return commandError("Toda diferencia requiere observacion.");
  }

  const timestamp = context.now();
  const closingCapitalCandidates: Array<CapitalMovement | null> = [
    input.finalWithdrawalCash > 0
      ? {
          id: context.id("capital-close-cash"),
          balanceId: balance.id,
          localId: balance.localId,
          type: "RETIRO" as const,
          medium: "EFECTIVO" as const,
          timing: "CIERRE" as const,
          person: input.withdrawalCashPerson,
          amount: input.finalWithdrawalCash,
          note: `Retiro final caja ${balanceVisibleId(data, balance)}`,
          status: "ACTIVO" as const,
          userId: context.user.id,
          createdAt: timestamp,
        }
      : null,
    input.finalWithdrawalBank > 0
      ? {
          id: context.id("capital-close-bank"),
          balanceId: balance.id,
          localId: balance.localId,
          type: "RETIRO" as const,
          medium: "TRANSFERENCIA" as const,
          timing: "CIERRE" as const,
          person: input.withdrawalBankPerson,
          amount: input.finalWithdrawalBank,
          note: `Retiro final banco caja ${balanceVisibleId(data, balance)}`,
          status: "ACTIVO" as const,
          userId: context.user.id,
          createdAt: timestamp,
        }
      : null,
  ];
  const closingCapitalMovements = closingCapitalCandidates.filter((movement): movement is CapitalMovement => movement !== null);
  const accountMovements = closingCapitalMovements.reduce(
    (movements, movement) => upsertAccountMovement(movements, capitalAccountMovement(movement)),
    data.accountMovements,
  );
  const next: Balance = {
    ...balance,
    status: "CERRADO",
    closedBy: context.user.id,
    closedByRole: context.actorRole,
    closedAt: timestamp,
    declaredCash: input.declaredCash,
    declaredBank: input.declaredBank,
    nextBase: input.declaredCash,
    nextBankBase: input.declaredBank,
    withdrawal: input.finalWithdrawalCash,
    finalWithdrawalCash: input.finalWithdrawalCash,
    finalWithdrawalBank: input.finalWithdrawalBank,
    cashDifference,
    bankDifference,
    differenceNote,
    differenceStatus: cashDifference === 0 && bankDifference === 0 ? undefined : "PENDIENTE",
  };
  const balances = data.balances.map((item) => (item.id === balance.id ? next : item));
  const machines = data.machines.map((machine) => {
    const reading = data.readings.find(
      (item) => item.balanceId === balance.id && item.machineId === machine.id && item.status === "CARGADA",
    );
    return reading ? { ...machine, lastIn: reading.inActual ?? machine.lastIn, lastOut: reading.outActual ?? machine.lastOut } : machine;
  });
  const historyEvents = data.readings
    .filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA")
    .map((reading) => {
      const machine = data.machines.find((item) => item.id === reading.machineId);
      return machine
        ? machineHistoryEvent(
            machine,
            machine.localId,
            "CONTADORES",
            `Cierre ${balance.operatingDate}: IN ${counter(reading.inPrevious)} -> ${counter(reading.inActual)}, OUT ${counter(reading.outPrevious)} -> ${counter(reading.outActual)}`,
            context.user.id,
            { id: context.id("machine-history"), createdAt: timestamp },
          )
        : null;
    })
    .filter((event): event is MachineLocalHistory => Boolean(event));
  let synced = syncMachineResultAccountMovement(
    {
      ...data,
      currentAccounts: ensureLocalCurrentAccounts(data, balance.localId),
      accountMovements,
      capitalMovements: [...closingCapitalMovements, ...data.capitalMovements],
      balances,
      machines,
      machineLocalHistory: [...historyEvents, ...data.machineLocalHistory],
    },
    balance.id,
    context.user.id,
  );
  synced = {
    ...synced,
    accountMovements: syncDifferenceAccountMovements(synced.accountMovements, next, context.user.id, {
      id: context.id,
      createdAt: timestamp,
    }),
  };
  return commandSuccess(
    auditCommand(synced, context, "Cerrar caja", "BalanceDiario", balance.id, balance, next, differenceNote),
    next,
  );
}
