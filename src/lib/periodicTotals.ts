import type { AppData, Balance, PeriodicClosureType } from "../types";
import { totalsForBalance } from "./cashTotals";
import {
  balanceHasDifference,
  bankDifferenceForBalance,
  cashDifferenceForBalance,
  differenceIsPending,
} from "./differences";
import { salarySettlementAmount } from "./salaryRules";

export type PeriodicRangeInput = {
  balances: Balance[];
  localIds: string[];
  startDate: string;
  endDate: string;
  type: PeriodicClosureType;
};

const dateInRange = (value: string, startDate: string, endDate: string) => {
  const date = value.slice(0, 10);
  return date >= startDate && date <= endDate;
};

export function summarizePeriodicRange(data: AppData, input: PeriodicRangeInput) {
  const localIds = new Set(input.localIds);
  const monthlySalaryMode = input.type === "MENSUAL";
  const startPeriod = input.startDate.slice(0, 7);
  const endPeriod = input.endDate.slice(0, 7);
  const base = input.balances.reduce(
    (acc, balance) => {
      const totals = totalsForBalance(data, balance.id);
      const gifts = totals.giftCash + totals.giftCredit;
      return {
        resultMachines: acc.resultMachines + totals.resultMachines,
        totalExpenses: acc.totalExpenses + totals.totalExpenses,
        totalSalaries: acc.totalSalaries + totals.totalSalaries,
        totalGifts: acc.totalGifts + gifts,
        totalTransfers: acc.totalTransfers + totals.totalTransfers,
        totalCajaToPrincipal: acc.totalCajaToPrincipal + totals.totalWithdrawals,
        totalPrincipalToCaja: acc.totalPrincipalToCaja + totals.totalCapitalContributions,
        cashDifference: acc.cashDifference + cashDifferenceForBalance(data, balance),
        bankDifference: acc.bankDifference + bankDifferenceForBalance(balance),
        pendingDifferences:
          acc.pendingDifferences +
          (balanceHasDifference(data, balance) && differenceIsPending(balance) ? 1 : 0),
      };
    },
    {
      resultMachines: 0,
      totalExpenses: 0,
      totalSalaries: 0,
      totalGifts: 0,
      totalTransfers: 0,
      totalCajaToPrincipal: 0,
      totalPrincipalToCaja: 0,
      cashDifference: 0,
      bankDifference: 0,
      pendingDifferences: 0,
    },
  );

  const principalExpenses = data.expenses.filter(
    (expense) =>
      !expense.balanceId &&
      expense.status === "ACTIVO" &&
      localIds.has(expense.localId) &&
      dateInRange(expense.createdAt, input.startDate, input.endDate),
  );
  const principalSalaries = data.salarySettlements.filter(
    (settlement) =>
      !settlement.balanceId &&
      settlement.status !== "ANULADA" &&
      localIds.has(settlement.localId) &&
      (monthlySalaryMode
        ? settlement.period >= startPeriod && settlement.period <= endPeriod
        : dateInRange(settlement.createdAt, input.startDate, input.endDate)),
  );
  const unlinkedTreasuryTransfers = data.treasuryTransfers.filter(
    (transfer) =>
      !transfer.balanceId &&
      transfer.status === "ACTIVO" &&
      localIds.has(transfer.localId) &&
      dateInRange(transfer.createdAt, input.startDate, input.endDate),
  );
  const partnerMovements = data.partnerMovements.filter(
    (movement) =>
      movement.status === "ACTIVO" &&
      localIds.has(movement.localId) &&
      dateInRange(movement.createdAt, input.startDate, input.endDate),
  );

  const principalExpenseTotal = principalExpenses.reduce((total, expense) => total + expense.amount, 0);
  const principalSalaryTotal = principalSalaries.reduce(
    (total, settlement) => total + salarySettlementAmount(settlement),
    0,
  );
  const unlinkedCajaToPrincipal = unlinkedTreasuryTransfers
    .filter((transfer) => transfer.type === "RETIRO_CAJA")
    .reduce((total, transfer) => total + transfer.amount, 0);
  const unlinkedPrincipalToCaja = unlinkedTreasuryTransfers
    .filter((transfer) => transfer.type === "APORTE_CAJA")
    .reduce((total, transfer) => total + transfer.amount, 0);
  const totalPartnerContributions = partnerMovements
    .filter((movement) => movement.type === "APORTE_SOCIO")
    .reduce((total, movement) => total + movement.amount, 0);
  const totalPartnerWithdrawals = partnerMovements
    .filter((movement) => movement.type === "RETIRO_SOCIO")
    .reduce((total, movement) => total + movement.amount, 0);
  const totalExpenses = base.totalExpenses + principalExpenseTotal;
  const totalSalaries = base.totalSalaries + principalSalaryTotal;
  const totalOutflows = totalExpenses + totalSalaries + base.totalGifts;

  return {
    ...base,
    principalExpenseIds: principalExpenses.map((expense) => expense.id),
    principalSalarySettlementIds: principalSalaries.map((settlement) => settlement.id),
    treasuryTransferIds: unlinkedTreasuryTransfers.map((transfer) => transfer.id),
    partnerMovementIds: partnerMovements.map((movement) => movement.id),
    totalExpenses,
    totalSalaries,
    totalOutflows,
    commercialResult: base.resultMachines - totalOutflows,
    totalCajaToPrincipal: base.totalCajaToPrincipal + unlinkedCajaToPrincipal,
    totalPrincipalToCaja: base.totalPrincipalToCaja + unlinkedPrincipalToCaja,
    totalPartnerContributions,
    totalPartnerWithdrawals,
    totalWithdrawals: base.totalCajaToPrincipal + unlinkedCajaToPrincipal,
    totalContributions: base.totalPrincipalToCaja + unlinkedPrincipalToCaja,
  };
}
