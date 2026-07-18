import type { AppData, Reading } from "../types";
import { localCashAccountId } from "./currentAccounts";
import { salarySettlementAmount } from "./salaryRules";

export function calcReading(reading: Pick<Reading, "inPrevious" | "inActual" | "outPrevious" | "outActual">) {
  if (reading.inActual === null || reading.outActual === null) return 0;
  return reading.inActual - reading.inPrevious - (reading.outActual - reading.outPrevious);
}

export function totalsForBalance(data: AppData, balanceId: string) {
  const readings = data.readings.filter((reading) => reading.balanceId === balanceId && reading.status === "CARGADA");
  const expenses = data.expenses.filter((expense) => expense.balanceId === balanceId && expense.status === "ACTIVO");
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balanceId && transfer.status === "ACTIVO");
  const gifts = data.gifts.filter((gift) => gift.balanceId === balanceId && gift.status === "ACTIVO");
  const capitalMovements = data.capitalMovements.filter((movement) => movement.balanceId === balanceId && movement.status === "ACTIVO");
  const treasuryTransfers = data.treasuryTransfers.filter(
    (transfer) => transfer.balanceId === balanceId && transfer.status === "ACTIVO",
  );
  const operatingTreasuryTransfers = treasuryTransfers.filter((transfer) => transfer.timing !== "APERTURA");
  const operatingCapitalMovements = capitalMovements.filter((movement) => movement.timing !== "APERTURA");
  const openingCapitalMovements = capitalMovements.filter((movement) => movement.timing === "APERTURA");
  const balance = data.balances.find((item) => item.id === balanceId);
  const salaryPayments = data.salarySettlements.filter((settlement) => settlement.balanceId === balanceId && settlement.status !== "ANULADA");
  const resultMachines = readings.reduce((total, reading) => total + reading.result, 0);
  const totalIn = readings.reduce((total, reading) => total + ((reading.inActual ?? reading.inPrevious) - reading.inPrevious), 0);
  const totalOut = readings.reduce((total, reading) => total + ((reading.outActual ?? reading.outPrevious) - reading.outPrevious), 0);
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const totalTransfers = transfers.reduce((total, transfer) => total + transfer.amount, 0);
  const giftCash = gifts.reduce((total, gift) => total + gift.cashAmount, 0);
  const giftCredit = gifts.reduce((total, gift) => total + gift.creditAmount, 0);
  const totalSalaries = salaryPayments.reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
  const balanceCashAccountId = balance ? localCashAccountId(balance.localId) : "";
  const cashExpenses = expenses
    .filter((expense) => (expense.paymentAccountId || balanceCashAccountId) === balanceCashAccountId)
    .reduce((total, expense) => total + expense.amount, 0);
  const cashSalaries = salaryPayments
    .filter((settlement) => (settlement.paymentAccountId ?? balanceCashAccountId) === balanceCashAccountId)
    .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
  const legacyWithdrawalsCash = operatingCapitalMovements
    .filter((movement) => movement.type === "RETIRO" && movement.medium === "EFECTIVO")
    .reduce((total, movement) => total + movement.amount, 0);
  const legacyWithdrawalsBank = operatingCapitalMovements
    .filter((movement) => movement.type === "RETIRO" && movement.medium === "TRANSFERENCIA")
    .reduce((total, movement) => total + movement.amount, 0);
  const legacyCapitalContributionsCash = operatingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "EFECTIVO")
    .reduce((total, movement) => total + movement.amount, 0);
  const legacyCapitalContributionsBank = operatingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "TRANSFERENCIA")
    .reduce((total, movement) => total + movement.amount, 0);
  const withdrawalsCash =
    legacyWithdrawalsCash +
    operatingTreasuryTransfers
      .filter((transfer) => transfer.type === "RETIRO_CAJA" && transfer.medium === "EFECTIVO")
      .reduce((total, transfer) => total + transfer.amount, 0);
  const withdrawalsBank =
    legacyWithdrawalsBank +
    operatingTreasuryTransfers
      .filter((transfer) => transfer.type === "RETIRO_CAJA" && transfer.medium === "BANCO")
      .reduce((total, transfer) => total + transfer.amount, 0);
  const capitalContributionsCash =
    legacyCapitalContributionsCash +
    operatingTreasuryTransfers
      .filter((transfer) => transfer.type === "APORTE_CAJA" && transfer.medium === "EFECTIVO")
      .reduce((total, transfer) => total + transfer.amount, 0);
  const capitalContributionsBank =
    legacyCapitalContributionsBank +
    operatingTreasuryTransfers
      .filter((transfer) => transfer.type === "APORTE_CAJA" && transfer.medium === "BANCO")
      .reduce((total, transfer) => total + transfer.amount, 0);
  const openingCapitalCash = openingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "EFECTIVO")
    .reduce((total, movement) => total + movement.amount, 0);
  const openingCapitalBank = openingCapitalMovements
    .filter((movement) => movement.type === "APORTE" && movement.medium === "TRANSFERENCIA")
    .reduce((total, movement) => total + movement.amount, 0);
  const expectedCash =
    (balance?.initialFund ?? 0) + resultMachines + capitalContributionsCash - cashExpenses - cashSalaries - giftCash - totalTransfers - withdrawalsCash;
  const commercialResult = resultMachines - totalExpenses - totalSalaries - giftCash - giftCredit;
  const withdrawal = (balance?.declaredCash ?? 0) - (balance?.nextBase ?? 0);
  const difference = (balance?.declaredCash ?? 0) - expectedCash;

  return {
    totalIn,
    totalOut,
    resultMachines,
    totalExpenses,
    totalSalaries,
    cashExpenses,
    cashSalaries,
    totalTransfers,
    giftCash,
    giftCredit,
    withdrawalsCash,
    withdrawalsBank,
    capitalContributionsCash,
    capitalContributionsBank,
    openingCapitalCash,
    openingCapitalBank,
    totalWithdrawals: withdrawalsCash + withdrawalsBank,
    totalCapitalContributions: capitalContributionsCash + capitalContributionsBank,
    expectedCash,
    commercialResult,
    withdrawal,
    difference,
  };
}
