import type {
  AppData,
  Balance,
  MachineLocalHistory,
  TreasuryTransfer,
} from "../../types";
import {
  syncDifferenceAccountMovements,
  syncMachineResultAccountMovement,
  treasuryTransferAccountMovements,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { totalsForBalance } from "../../lib/cashTotals";
import { balanceCashReconciliationError } from "../../lib/cashAvailability";
import { ensureFinancialCurrentAccounts, localAccountBalances } from "../../lib/currentAccounts";
import { balanceVisibleId } from "../../lib/display";
import { machineHistoryEvent } from "../../lib/machineHistory";
import { counter, money } from "../../lib/money";
import { auditCommand, commandError, commandSuccess, type CommandContext, type CommandResult } from "../command";
import { localCommandAccessError } from "../localAccess";

export type CloseCashInput = {
  balanceId: string;
  declaredCash: number;
  declaredBank: number;
  transferToPrincipalCash: number;
  transferToPrincipalBank: number;
  differenceNote: string;
};

export function closeCashCommand(data: AppData, input: CloseCashInput, context: CommandContext): CommandResult<Balance> {
  const balance = data.balances.find((item) => item.id === input.balanceId);
  if (!balance || balance.status !== "EN_PROCESO") return commandError("La caja ya no esta abierta.");
  const accessError = localCommandAccessError(
    data,
    balance.localId,
    context,
    ["CAJERO"],
    "La caja solo se cierra desde la funcion Cajero.",
  );
  if (accessError) return commandError(accessError);
  const inputAmounts = [
    input.declaredCash,
    input.declaredBank,
    input.transferToPrincipalCash,
    input.transferToPrincipalBank,
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
  if (input.transferToPrincipalCash < 0 || input.transferToPrincipalBank < 0) {
    return commandError("Los retiros de caja a las cuentas principales no pueden ser negativos.");
  }

  const totals = totalsForBalance(data, balance.id);
  const localBalances = localAccountBalances(data, balance.localId);
  if (
    !Object.values(totals).every((amount) => Number.isFinite(amount)) ||
    ![localBalances.cash, localBalances.bank].every((amount) => Number.isFinite(amount))
  ) {
    return commandError("Los importes del cierre deben ser numeros finitos.");
  }
  const reconciliationError = balanceCashReconciliationError(data, balance.id);
  if (reconciliationError) return commandError(reconciliationError);
  if (totals.expectedCash < 0) {
    return commandError(
      `No se puede cerrar la caja porque el efectivo esperado es negativo (${money(totals.expectedCash)}). Registra un aporte real en efectivo para cubrir el faltante antes de cerrar.`,
    );
  }
  if (input.transferToPrincipalCash > totals.expectedCash) {
    return commandError("El retiro de caja en efectivo no puede superar el efectivo esperado antes del retiro.");
  }
  if (input.transferToPrincipalBank > localBalances.bank) {
    return commandError("El retiro de caja por banco no puede superar el saldo banco de la caja.");
  }

  const expectedCashAfterTransfer = totals.expectedCash - input.transferToPrincipalCash;
  const expectedBankAfterTransfer = localBalances.bank - input.transferToPrincipalBank;
  const cashDifference = input.declaredCash - expectedCashAfterTransfer;
  const bankDifference = input.declaredBank - expectedBankAfterTransfer;
  if (![expectedCashAfterTransfer, expectedBankAfterTransfer, cashDifference, bankDifference].every((amount) => Number.isFinite(amount))) {
    return commandError("Los importes del cierre deben ser numeros finitos.");
  }
  const differenceNote = input.differenceNote.trim();
  if ((cashDifference !== 0 || bankDifference !== 0) && !differenceNote) {
    return commandError("Toda diferencia requiere observacion.");
  }

  const timestamp = context.now();
  const closingTransferCandidates: Array<TreasuryTransfer | null> = [
    input.transferToPrincipalCash > 0
      ? {
          id: context.id("treasury-close-cash"),
          balanceId: balance.id,
          localId: balance.localId,
          type: "RETIRO_CAJA" as const,
          medium: "EFECTIVO" as const,
          timing: "CIERRE" as const,
          amount: input.transferToPrincipalCash,
          currency: "UYU" as const,
          note: `Traspaso final de caja a Principal ${balanceVisibleId(data, balance)}`,
          status: "ACTIVO" as const,
          userId: context.user.id,
          createdAt: timestamp,
        }
      : null,
    input.transferToPrincipalBank > 0
      ? {
          id: context.id("treasury-close-bank"),
          balanceId: balance.id,
          localId: balance.localId,
          type: "RETIRO_CAJA" as const,
          medium: "BANCO" as const,
          timing: "CIERRE" as const,
          amount: input.transferToPrincipalBank,
          currency: "UYU" as const,
          note: `Traspaso final de banco a Principal ${balanceVisibleId(data, balance)}`,
          status: "ACTIVO" as const,
          userId: context.user.id,
          createdAt: timestamp,
        }
      : null,
  ];
  const closingTreasuryTransfers = closingTransferCandidates.filter(
    (transfer): transfer is TreasuryTransfer => transfer !== null,
  );
  const accountMovements = closingTreasuryTransfers
    .flatMap(treasuryTransferAccountMovements)
    .reduce(upsertAccountMovement, data.accountMovements);
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
    withdrawal: input.transferToPrincipalCash,
    finalWithdrawalCash: input.transferToPrincipalCash,
    finalWithdrawalBank: input.transferToPrincipalBank,
    finalTransferToPrincipalCash: input.transferToPrincipalCash,
    finalTransferToPrincipalBank: input.transferToPrincipalBank,
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
      currentAccounts: ensureFinancialCurrentAccounts(data, balance.localId),
      accountMovements,
      treasuryTransfers: [...closingTreasuryTransfers, ...data.treasuryTransfers],
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
