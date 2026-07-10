import type { AppData, Balance, Local, Role, Screen, User } from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { localAccountBalances } from "../../lib/currentAccounts";
import { balanceHasDifference, bankDifferenceForBalance, cashDifferenceForBalance, differenceIsPending, pendingDifferenceCount } from "../../lib/differences";
import { money } from "../../lib/money";
import { today } from "../../lib/dates";
import { InfoCard } from "../../components/ui";

export function Panel({
  data,
  local,
  openBalance,
  effectiveRole,
  modeStatus,
  setScreen,
  resetDemo,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  effectiveRole: Role;
  modeStatus: string;
  setScreen: (screen: Screen) => void;
  resetDemo: () => void;
}) {
  const activeBalance = openBalance ?? data.balances.find((balance) => balance.status === "CERRADO");
  const totals = activeBalance ? totalsForBalance(data, activeBalance.id) : null;
  const pendingDifferences = pendingDifferenceCount(data);
  const localClosedBalances = data.balances
    .filter((balance) => balance.localId === local.id && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)));
  const localDifferenceBalances = localClosedBalances.filter((balance) => balanceHasDifference(data, balance));
  const localPendingDifferences = localDifferenceBalances.filter(differenceIsPending).length;
  const localCashDifferenceTotal = localDifferenceBalances.reduce((total, balance) => total + cashDifferenceForBalance(data, balance), 0);
  const localBankDifferenceTotal = localDifferenceBalances.reduce((total, balance) => total + bankDifferenceForBalance(balance), 0);
  const localBalances = localAccountBalances(data, local.id);
  const currentDate = today();
  const currentMonthStart = `${currentDate.slice(0, 7)}-01`;
  const currentMonthName = new Date(`${currentMonthStart}T00:00:00`).toLocaleDateString("es-UY", { month: "long", year: "numeric" });
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
        outcome: acc.outcome + Math.max(-balanceTotals.resultMachines, 0) + balanceTotals.totalExpenses + balanceTotals.totalSalaries + gifts,
      };
    },
    { income: 0, outcome: 0 },
  );
  const monthlyNetResult = monthlyEconomicTotals.income - monthlyEconomicTotals.outcome;

  if (effectiveRole === "ADMINISTRADOR") {
    return (
      <>
        <h2>Reportes iniciales</h2>
        <div className="card-grid three">
          <InfoCard tone="blue" title="Cierre diario" lines={["Exportacion Excel", "Caja, maquinas y movimientos"]} />
          <InfoCard tone="green" title="Maquinas" lines={["Resultado por maquina", "Historial de lecturas"]} />
          <InfoCard
            tone="red"
            title="Diferencias"
            lines={[`${pendingDifferences} pendiente(s)`, "Revision obligatoria con observacion"]}
            action={{ label: "Gestionar", onClick: () => setScreen("differences") }}
          />
        </div>
        <h2>Panel administrativo</h2>
        <div className="card-grid three">
          <ActionCard title="Usuarios" text="Cajero, encargado, admin" onClick={() => setScreen("admin-users")} />
          <ActionCard title="Personal" text="Salarios, horarios y bajas" onClick={() => setScreen("admin-staff")} />
          <ActionCard title="Liquidacion salarios" text="Base, pagos, adelantos y total" onClick={() => setScreen("admin-salary-settlements")} />
          <ActionCard title="Clientes" text="Listado para regalos y transferencias" onClick={() => setScreen("admin-clients")} />
          <ActionCard title="Maquinas" text="ID unico, activa, mantenimiento" onClick={() => setScreen("admin-machines")} />
          <ActionCard title="Categorias gastos" text="Categorias y subcategorias" onClick={() => setScreen("admin-expense-categories")} />
          <ActionCard title="Papelera" text="Restaurar o eliminar definitivo" onClick={() => setScreen("admin-trash")} />
          <ActionCard title="Auditoria" text="Cambios sensibles e historial" onClick={() => setScreen("audit")} />
        </div>
        <div className="button-row end">
          <button className="button muted" onClick={resetDemo}>
            Reiniciar demo
          </button>
        </div>
      </>
    );
  }

  if (effectiveRole === "ENCARGADO") {
    return (
      <section className="manager-dashboard manager-dashboard-minimal detail-card-surface">
        <div className="card-grid three manager-kpis manager-minimal-grid">
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
            action={{ label: "Ver diferencias", onClick: () => setScreen("differences") }}
          />
          <InfoCard
            tone={localBalances.cash < 0 ? "red" : "green"}
            title="Cuenta efectivo"
            variant="cash"
            lines={[`*Saldo actual: ${money(localBalances.cash)}`, "Cuenta corriente de efectivo"]}
            action={{ label: "Ver cuentas", onClick: () => setScreen("admin-current-accounts") }}
          />
          <InfoCard
            tone={localBalances.bank < 0 ? "red" : "blue"}
            title="Cuenta banco"
            variant="cash"
            lines={[`*Saldo actual: ${money(localBalances.bank)}`, "Cuenta corriente de banco"]}
            action={{ label: "Ver cuentas", onClick: () => setScreen("admin-current-accounts") }}
          />
        </div>

        <div className="card-grid three manager-kpis manager-minimal-grid">
          <InfoCard
            tone="green"
            title={`Ingreso total - ${currentMonthName}`}
            variant="cash"
            lines={[`*Total: ${money(monthlyEconomicTotals.income)}`, `Hasta hoy: ${currentDate}`, `Cajas cerradas: ${monthlyClosedBalances.length}`]}
          />
          <InfoCard
            tone="red"
            title={`Salida total - ${currentMonthName}`}
            variant="cash"
            lines={[
              `*Total: ${money(monthlyEconomicTotals.outcome)}`,
              "Incluye gastos, salarios, regalos",
              "y resultado negativo de maquinas",
            ]}
          />
          <InfoCard
            tone={monthlyNetResult < 0 ? "red" : "green"}
            title={`Resultado neto - ${currentMonthName}`}
            variant="cash"
            lines={[
              `*Total: ${money(monthlyNetResult)}`,
              `Ingresos: ${money(monthlyEconomicTotals.income)}`,
              `Salidas: ${money(monthlyEconomicTotals.outcome)}`,
              "Resultado economico mensual",
            ]}
          />
        </div>

        <div className="manager-shortcuts" aria-label="Accesos de revision del encargado">
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
        </div>
      </section>
    );
  }

  return (
    <>
      <h2>Estado de caja</h2>
      <div className="card-grid three">
        <InfoCard
          tone="green"
          title="Caja del dia"
          lines={[
            `Fecha operativa: ${openBalance?.operatingDate ?? "libre"}`,
            `Estado: ${openBalance?.status ?? "SIN CAJA"}`,
            `Efectivo inicial: ${money(openBalance?.initialFund)}`,
            `Banco inicial: ${money(openBalance?.initialBankFund)}`,
          ]}
        />
        <InfoCard
          tone="blue"
          title="Maquinas"
          lines={[
            `Activas: ${data.machines.filter((machine) => machine.localId === local.id && machine.status === "ACTIVA").length}`,
            `Pendientes: ${openBalance ? data.readings.filter((reading) => reading.balanceId === openBalance.id && reading.status === "PENDIENTE").length : 0}`,
            `Resultado: ${money(totals?.resultMachines)}`,
          ]}
        />
        <InfoCard
          tone="orange"
          title="Cierre"
          lines={[
            `Efectivo esperado: ${money(totals?.expectedCash)}`,
            `Diferencia: ${money(activeBalance?.cashDifference ?? totals?.difference)}`,
            `Pendientes revision: ${pendingDifferences}`,
            `Modo: ${modeStatus}`,
          ]}
        />
      </div>
      <div className="card-grid three action-area">
        <ActionCard title="Caja diaria" text="Abrir caja o revisar cierres" onClick={() => setScreen("open-cash")} />
        <ActionCard title="Cargar contadores" text="IN / OUT por maquina" onClick={() => setScreen("counters")} />
        <ActionCard title="Cargar gastos" text="Limpieza, repuestos, servicios" onClick={() => setScreen("expenses")} />
        <ActionCard title="Cargar transferencias" text="Comprobante, nombre y monto" onClick={() => setScreen("transfers")} />
        <ActionCard title="Cargar regalos" text="Efectivo o credito" onClick={() => setScreen("gifts")} />
        <ActionCard title="Cerrar caja" text="Declarar efectivo y cerrar" onClick={() => setScreen("close-cash")} />
      </div>
    </>
  );
}

function ActionCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <article className="action-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button primary small" onClick={onClick}>
        Abrir
      </button>
    </article>
  );
}
