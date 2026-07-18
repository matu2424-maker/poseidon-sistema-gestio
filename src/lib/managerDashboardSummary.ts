import type { AccountMovement, AccountMovementSource, AppData, CurrentAccountKind } from "../types";
import { totalsForBalance } from "./cashTotals";
import { companyLiquidity, localAccountBalances, principalAccountBalances } from "./currentAccounts";
import { today } from "./dates";
import {
  balanceHasDifference,
  bankDifferenceForBalance,
  cashDifferenceForBalance,
  differenceIsPending,
} from "./differences";
import { balanceVisibleId } from "./display";
import { salarySettlementAmount } from "./salaryRules";

const moneyAccountKinds = new Set<CurrentAccountKind>([
  "LOCAL_EFECTIVO",
  "LOCAL_BANCO",
  "PRINCIPAL_EFECTIVO",
  "PRINCIPAL_BANCO",
]);

const movementLabels: Record<AccountMovementSource, string> = {
  SUELDO: "Salario",
  TRANSFERENCIA: "Transferencia",
  GASTO: "Gasto",
  REGALO: "Regalo",
  RETIRO: "Retiro",
  APORTE: "Aporte",
  TRASPASO_CAJA: "Traspaso Caja / Principal",
  APORTE_SOCIO: "Aporte de socio",
  RETIRO_SOCIO: "Retiro de socio",
  RESULTADO_MAQUINAS: "Resultado de maquinas",
  DIFERENCIA_CAJA: "Diferencia de caja",
  MIGRACION: "Migracion tecnica",
  AJUSTE: "Ajuste",
};

export type ManagerActivityRow = {
  id: string;
  createdAt: string;
  action: string;
  account: string;
  amount: number;
  user: string;
  detail: string;
};

export type ManagerDashboardSummary = {
  currentDate: string;
  currentMonthName: string;
  differences: {
    pending: number;
    total: number;
    cash: number;
    bank: number;
  };
  balances: {
    caja: { cash: number; bank: number };
    principal: { cash: number; bank: number };
    liquidity: { cash: number; bank: number; total: number };
  };
  economic: {
    closedBalances: number;
    machineResult: number;
    machineLoss: number;
    expenses: number;
    salaries: number;
    gifts: number;
    income: number;
    outcome: number;
    net: number;
  };
  recentActivity: ManagerActivityRow[];
};

function movementLocalId(data: AppData, movement: AccountMovement) {
  if (movement.localId) return movement.localId;
  const balance = movement.balanceId ? data.balances.find((item) => item.id === movement.balanceId) : undefined;
  if (balance) return balance.localId;
  const account = data.currentAccounts.find((item) => item.id === movement.accountId);
  if ((account?.kind === "LOCAL_EFECTIVO" || account?.kind === "LOCAL_BANCO") && account.entityId) return account.entityId;
  if (movement.sourceType === "GASTO") return data.expenses.find((item) => item.id === movement.sourceId)?.localId;
  if (movement.sourceType === "SUELDO") return data.salarySettlements.find((item) => item.id === movement.sourceId)?.localId;
  if (movement.sourceType === "TRASPASO_CAJA") return data.treasuryTransfers.find((item) => item.id === movement.sourceId)?.localId;
  if (movement.sourceType === "APORTE_SOCIO" || movement.sourceType === "RETIRO_SOCIO") {
    return data.partnerMovements.find((item) => item.id === movement.sourceId)?.localId;
  }
  if (movement.sourceType === "APORTE" || movement.sourceType === "RETIRO") {
    return data.capitalMovements.find((item) => item.id === movement.sourceId)?.localId;
  }
  if (movement.sourceType === "TRANSFERENCIA") {
    const sourceBalanceId = data.transfers.find((item) => item.id === movement.sourceId)?.balanceId;
    return data.balances.find((item) => item.id === sourceBalanceId)?.localId;
  }
  if (movement.sourceType === "REGALO") {
    const sourceBalanceId = data.gifts.find((item) => item.id === movement.sourceId)?.balanceId;
    return data.balances.find((item) => item.id === sourceBalanceId)?.localId;
  }
  return undefined;
}

function recentFinancialActivity(data: AppData, localId: string): ManagerActivityRow[] {
  return data.accountMovements
    .filter((movement) => {
      const account = data.currentAccounts.find((item) => item.id === movement.accountId);
      return movement.status === "ACTIVO" && Boolean(account && moneyAccountKinds.has(account.kind)) && movementLocalId(data, movement) === localId;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .slice(0, 5)
    .map((movement) => {
      const account = data.currentAccounts.find((item) => item.id === movement.accountId);
      const user = data.users.find((item) => item.id === movement.userId);
      const balance = movement.balanceId ? data.balances.find((item) => item.id === movement.balanceId) : undefined;
      const reference = balance ? `${balanceVisibleId(data, balance)} - ` : "";
      return {
        id: movement.id,
        createdAt: movement.createdAt,
        action: movementLabels[movement.sourceType],
        account: account?.name ?? movement.accountId,
        amount: movement.direction === "ENTRADA" ? movement.amount : -movement.amount,
        user: user?.name ?? movement.userId,
        detail: `${reference}${movement.detail || movement.concept || movementLabels[movement.sourceType]}`,
      };
    });
}

export function managerDashboardSummary(
  data: AppData,
  localId: string,
  currentDate = today(),
): ManagerDashboardSummary {
  const currentMonthStart = `${currentDate.slice(0, 7)}-01`;
  const currentMonthName = new Date(`${currentMonthStart}T00:00:00`).toLocaleDateString("es-UY", {
    month: "long",
    year: "numeric",
  });
  const localClosedBalances = data.balances
    .filter((balance) => balance.localId === localId && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)));
  const differenceBalances = localClosedBalances.filter((balance) => balanceHasDifference(data, balance));
  const monthlyClosedBalances = localClosedBalances.filter((balance) => {
    const balanceDate = balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
    return balanceDate >= currentMonthStart && balanceDate <= currentDate;
  });
  const machineResult = monthlyClosedBalances.reduce(
    (total, balance) => total + totalsForBalance(data, balance.id).resultMachines,
    0,
  );
  const isCurrentMonth = (createdAt: string) => {
    const date = createdAt.slice(0, 10);
    return date >= currentMonthStart && date <= currentDate;
  };
  const expenses = data.expenses
    .filter((expense) => expense.localId === localId && expense.status === "ACTIVO" && isCurrentMonth(expense.createdAt))
    .reduce((total, expense) => total + expense.amount, 0);
  const salaries = data.salarySettlements
    .filter(
      (settlement) =>
        settlement.localId === localId &&
        settlement.status !== "ANULADA" &&
        settlement.period === currentDate.slice(0, 7),
    )
    .reduce((total, settlement) => total + salarySettlementAmount(settlement), 0);
  const gifts = data.gifts
    .filter((gift) => gift.status === "ACTIVO" && isCurrentMonth(gift.createdAt))
    .filter((gift) => data.balances.find((balance) => balance.id === gift.balanceId)?.localId === localId)
    .reduce((total, gift) => total + gift.cashAmount + gift.creditAmount, 0);
  const income = Math.max(machineResult, 0);
  const machineLoss = Math.max(-machineResult, 0);
  const outcome = machineLoss + expenses + salaries + gifts;
  const caja = localAccountBalances(data, localId);
  const principal = principalAccountBalances(data);

  return {
    currentDate,
    currentMonthName,
    differences: {
      pending: differenceBalances.filter(differenceIsPending).length,
      total: differenceBalances.length,
      cash: differenceBalances.reduce((total, balance) => total + cashDifferenceForBalance(data, balance), 0),
      bank: differenceBalances.reduce((total, balance) => total + bankDifferenceForBalance(balance), 0),
    },
    balances: {
      caja,
      principal,
      liquidity: companyLiquidity(data, localId),
    },
    economic: {
      closedBalances: monthlyClosedBalances.length,
      machineResult,
      machineLoss,
      expenses,
      salaries,
      gifts,
      income,
      outcome,
      net: income - outcome,
    },
    recentActivity: recentFinancialActivity(data, localId),
  };
}
