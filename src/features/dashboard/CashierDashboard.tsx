import { InfoCard } from "../../components/ui";
import { totalsForBalance } from "../../lib/cashTotals";
import { pendingDifferenceCount } from "../../lib/differences";
import { money } from "../../lib/money";
import type { AppData, Balance, Local, Screen } from "../../types";
import { DashboardActionCard } from "./DashboardActionCard";

export function CashierDashboard({
  data,
  local,
  openBalance,
  modeStatus,
  setScreen,
}: {
  data: AppData;
  local: Local;
  openBalance: Balance | undefined;
  modeStatus: string;
  setScreen: (screen: Screen) => void;
}) {
  const activeBalance = openBalance ?? data.balances.find((balance) => balance.status === "CERRADO");
  const totals = activeBalance ? totalsForBalance(data, activeBalance.id) : null;
  const pendingDifferences = pendingDifferenceCount(data);

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
        <DashboardActionCard title="Caja diaria" text="Abrir caja o revisar cierres" onClick={() => setScreen("open-cash")} />
        <DashboardActionCard title="Cargar contadores" text="IN / OUT por maquina" onClick={() => setScreen("counters")} />
        <DashboardActionCard title="Cargar gastos" text="Limpieza, repuestos, servicios" onClick={() => setScreen("expenses")} />
        <DashboardActionCard
          title="Cargar transferencias"
          text="Comprobante, nombre y monto"
          onClick={() => setScreen("transfers")}
        />
        <DashboardActionCard title="Cargar regalos" text="Efectivo o credito" onClick={() => setScreen("gifts")} />
        <DashboardActionCard title="Cerrar caja" text="Declarar efectivo y cerrar" onClick={() => setScreen("close-cash")} />
      </div>
    </>
  );
}
