import { InfoCard } from "../../components/ui";
import { pendingDifferenceCount } from "../../lib/differences";
import type { AppData, Screen } from "../../types";
import { DashboardActionCard } from "./DashboardActionCard";

export function AdminDashboard({
  data,
  setScreen,
  resetDemo,
}: {
  data: AppData;
  setScreen: (screen: Screen) => void;
  resetDemo: () => void;
}) {
  const pendingDifferences = pendingDifferenceCount(data);

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
        <DashboardActionCard title="Usuarios" text="Cajero, encargado, admin" onClick={() => setScreen("admin-users")} />
        <DashboardActionCard title="Personal" text="Salarios, horarios y bajas" onClick={() => setScreen("admin-staff")} />
        <DashboardActionCard
          title="Liquidacion salarios"
          text="Base, pagos, adelantos y total"
          onClick={() => setScreen("admin-salary-settlements")}
        />
        <DashboardActionCard
          title="Clientes"
          text="Listado para regalos y transferencias"
          onClick={() => setScreen("admin-clients")}
        />
        <DashboardActionCard title="Maquinas" text="ID unico, activa, mantenimiento" onClick={() => setScreen("admin-machines")} />
        <DashboardActionCard
          title="Categorias gastos"
          text="Categorias y subcategorias"
          onClick={() => setScreen("admin-expense-categories")}
        />
        <DashboardActionCard title="Papelera" text="Restaurar o eliminar definitivo" onClick={() => setScreen("admin-trash")} />
        <DashboardActionCard title="Auditoria" text="Cambios sensibles e historial" onClick={() => setScreen("audit")} />
      </div>
      <div className="button-row end">
        <button className="button muted" type="button" onClick={resetDemo}>
          Reiniciar demo
        </button>
      </div>
    </>
  );
}
