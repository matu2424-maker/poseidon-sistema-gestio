import { InfoCard } from "../../components/ui";
import { totalsForBalance } from "../../lib/cashTotals";
import { localAccountBalances } from "../../lib/currentAccounts";
import { today } from "../../lib/dates";
import {
  balanceHasDifference,
  bankDifferenceForBalance,
  cashDifferenceForBalance,
  differenceIsPending,
} from "../../lib/differences";
import { money } from "../../lib/money";
import type { AppData, Local, Screen } from "../../types";

export function ManagerDashboard({
  data,
  local,
  setScreen,
}: {
  data: AppData;
  local: Local;
  setScreen: (screen: Screen) => void;
}) {
  const localClosedBalances = data.balances
    .filter((balance) => balance.localId === local.id && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)));
  const localDifferenceBalances = localClosedBalances.filter((balance) => balanceHasDifference(data, balance));
  const localPendingDifferences = localDifferenceBalances.filter(differenceIsPending).length;
  const localCashDifferenceTotal = localDifferenceBalances.reduce(
    (total, balance) => total + cashDifferenceForBalance(data, balance),
    0,
  );
  const localBankDifferenceTotal = localDifferenceBalances.reduce(
    (total, balance) => total + bankDifferenceForBalance(balance),
    0,
  );
  const localBalances = localAccountBalances(data, local.id);
  const currentDate = today();
  const currentMonthStart = `${currentDate.slice(0, 7)}-01`;
  const currentMonthName = new Date(`${currentMonthStart}T00:00:00`).toLocaleDateString("es-UY", {
    month: "long",
    year: "numeric",
  });
  const monthlyClosedBalances = localClosedBalances.filter((balance) => {
    const balanceDate = balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
    return balanceDate >= currentMonthStart && balanceDate <= currentDate;
  });
  const monthlyEconomicTotals = monthlyClosedBalances.reduce(
    (acc, balance) => {
      const balanceTotals = totalsForBalance(data, balance.id);
      const gifts = balanceTotals.giftCash + balanceTotals.giftCredit;
      return {
        income: acc.income + Math.max(balanceTotals.resultMachines, 0),
        outcome:
          acc.outcome +
          Math.max(-balanceTotals.resultMachines, 0) +
          balanceTotals.totalExpenses +
          balanceTotals.totalSalaries +
          gifts,
      };
    },
    { income: 0, outcome: 0 },
  );
  const monthlyNetResult = monthlyEconomicTotals.income - monthlyEconomicTotals.outcome;

  return (
    <section className="manager-dashboard manager-dashboard-minimal">
      <section className="manager-overview-section" aria-labelledby="manager-financial-title">
        <div className="manager-section-heading">
          <h2 id="manager-financial-title">Control financiero</h2>
        </div>
        <div className="manager-metric-strip">
          <InfoCard
            tone={localPendingDifferences > 0 ? "red" : "green"}
            title="Diferencias"
            variant="cash"
            lines={[
              `*Pendientes: ${localPendingDifferences}`,
              `Total con diferencia: ${localDifferenceBalances.length}`,
              `Efectivo: ${money(localCashDifferenceTotal)}`,
              `Banco: ${money(localBankDifferenceTotal)}`,
            ]}
          />
          <InfoCard
            tone={localBalances.cash < 0 ? "red" : "green"}
            title="Cuenta efectivo"
            variant="cash"
            lines={[`*Saldo actual: ${money(localBalances.cash)}`, "Cuenta corriente de efectivo"]}
          />
          <InfoCard
            tone={localBalances.bank < 0 ? "red" : "blue"}
            title="Cuenta banco"
            variant="cash"
            lines={[`*Saldo actual: ${money(localBalances.bank)}`, "Cuenta corriente de banco"]}
          />
        </div>
      </section>

      <section className="manager-overview-section" aria-labelledby="manager-economic-title">
        <div className="manager-section-heading">
          <h2 id="manager-economic-title">Resultado economico de {currentMonthName}</h2>
        </div>
        <div className="manager-metric-strip">
          <InfoCard
            tone="green"
            title="Ingresos"
            variant="cash"
            lines={[
              `*Total: ${money(monthlyEconomicTotals.income)}`,
              `Hasta hoy: ${currentDate}`,
              `Cajas cerradas: ${monthlyClosedBalances.length}`,
            ]}
          />
          <InfoCard
            tone="red"
            title="Salidas"
            variant="cash"
            lines={[
              `*Total: ${money(monthlyEconomicTotals.outcome)}`,
              "Incluye gastos, salarios, regalos",
              "y resultado negativo de maquinas",
            ]}
          />
          <InfoCard
            tone={monthlyNetResult < 0 ? "red" : "green"}
            title="Resultado neto"
            variant="cash"
            lines={[
              `*Total: ${money(monthlyNetResult)}`,
              `Ingresos: ${money(monthlyEconomicTotals.income)}`,
              `Salidas: ${money(monthlyEconomicTotals.outcome)}`,
              "Resultado economico mensual",
            ]}
          />
        </div>
      </section>

      <nav className="manager-shortcuts" aria-label="Accesos de revision del encargado">
        <button className="button primary compact" type="button" onClick={() => setScreen("differences")}>
          Ver diferencias
        </button>
        <button className="button primary compact" type="button" onClick={() => setScreen("admin-current-accounts")}>
          Cuentas corrientes
        </button>
        <button className="button primary compact" type="button" onClick={() => setScreen("manager-expenses")}>
          Control de gastos
        </button>
        <button className="button primary compact" type="button" onClick={() => setScreen("admin-salary-settlements")}>
          Salarios
        </button>
        <button className="button primary compact" type="button" onClick={() => setScreen("cashier-summary")}>
          Resumen de cajas
        </button>
      </nav>
    </section>
  );
}
