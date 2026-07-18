import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ContactRound,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { balanceVisibleId } from "../../lib/display";
import { managerDashboardSummary } from "../../lib/managerDashboardSummary";
import { money } from "../../lib/money";
import type { AppData, Balance, Local, Screen } from "../../types";
import { ManagerActivityTable } from "./ManagerActivityTable";

function MetricDetails({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <span className="manager-summary-details">
      {rows.map((row) => (
        <span key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </span>
      ))}
    </span>
  );
}

export function ManagerDashboard({
  data,
  local,
  openBalance,
  setScreen,
}: {
  data: AppData;
  local: Local;
  openBalance: Balance | undefined;
  setScreen: (screen: Screen) => void;
}) {
  const summary = managerDashboardSummary(data, local.id);
  const negativeAccounts = [
    { label: "Caja / Efectivo", value: summary.balances.caja.cash },
    { label: "Caja / Banco", value: summary.balances.caja.bank },
    { label: "Principal / Efectivo", value: summary.balances.principal.cash },
    { label: "Principal / Banco", value: summary.balances.principal.bank },
  ].filter((account) => account.value < 0);
  const hasAttention = summary.differences.pending > 0 || negativeAccounts.length > 0;
  const openedBy = openBalance ? data.users.find((user) => user.id === openBalance.openedBy)?.name ?? openBalance.openedBy : "";

  return (
    <section className="manager-dashboard manager-dashboard-minimal">
      <section className={`manager-attention ${hasAttention ? "is-alert" : "is-ok"}`} role="status">
        {hasAttention ? <AlertTriangle size={19} aria-hidden="true" /> : <CheckCircle2 size={19} aria-hidden="true" />}
        <div>
          <strong>{hasAttention ? "Requiere atencion" : "Control financiero al dia"}</strong>
          <span>
            {summary.differences.pending > 0 && `${summary.differences.pending} diferencia${summary.differences.pending === 1 ? "" : "s"} pendiente${summary.differences.pending === 1 ? "" : "s"}. `}
            {negativeAccounts.length > 0
              ? `${negativeAccounts.map((account) => `${account.label} ${money(account.value)}`).join("; ")}.`
              : summary.differences.pending === 0
                ? "Sin diferencias pendientes ni saldos monetarios negativos."
                : ""}
          </span>
        </div>
      </section>

      <section className="manager-overview-section" aria-labelledby="manager-financial-title">
        <div className="manager-section-heading">
          <h2 id="manager-financial-title">Control financiero</h2>
        </div>
        <div className="manager-summary-surface">
          <button
            className={`manager-summary-item ${summary.differences.pending > 0 ? "is-alert" : "is-ok"}`}
            type="button"
            onClick={() => setScreen("differences")}
            aria-label="Ver diferencias"
          >
            <span className="manager-summary-label">Diferencias</span>
            <strong className="manager-summary-value">
              {summary.differences.pending > 0 ? `${summary.differences.pending} pendiente${summary.differences.pending === 1 ? "" : "s"}` : "Sin pendientes"}
            </strong>
            <MetricDetails
              rows={[
                { label: "Efectivo", value: money(summary.differences.cash) },
                { label: "Banco", value: money(summary.differences.bank) },
                { label: "Historicas", value: String(summary.differences.total) },
              ]}
            />
            <ArrowRight className="manager-summary-arrow" size={17} aria-hidden="true" />
          </button>

          <button
            className="manager-summary-item"
            type="button"
            onClick={() => setScreen("admin-current-accounts")}
            aria-label="Abrir cuentas corrientes de efectivo"
          >
            <span className="manager-summary-label">Efectivo</span>
            <strong className="manager-summary-value">{money(summary.balances.liquidity.cash)}</strong>
            <MetricDetails
              rows={[
                { label: "Caja", value: money(summary.balances.caja.cash) },
                { label: "Principal", value: money(summary.balances.principal.cash) },
              ]}
            />
            <ArrowRight className="manager-summary-arrow" size={17} aria-hidden="true" />
          </button>

          <button
            className="manager-summary-item"
            type="button"
            onClick={() => setScreen("admin-current-accounts")}
            aria-label="Abrir cuentas corrientes de banco"
          >
            <span className="manager-summary-label">Banco</span>
            <strong className="manager-summary-value">{money(summary.balances.liquidity.bank)}</strong>
            <MetricDetails
              rows={[
                { label: "Caja", value: money(summary.balances.caja.bank) },
                { label: "Principal", value: money(summary.balances.principal.bank) },
              ]}
            />
            <ArrowRight className="manager-summary-arrow" size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="manager-overview-section" aria-labelledby="manager-economic-title">
        <div className="manager-section-heading manager-section-heading-action">
          <div>
            <h2 id="manager-economic-title">Resultado economico de {summary.currentMonthName}</h2>
            <span>Hasta {summary.currentDate} - {summary.economic.closedBalances} cajas cerradas</span>
          </div>
          <button className="button muted compact" type="button" onClick={() => setScreen("periodic")}>
            Ver cierre periodico
          </button>
        </div>
        <div className="manager-economic-surface">
          <div className="manager-economic-totals">
            <div>
              <span>Ingresos</span>
              <strong className="amount-positive">{money(summary.economic.income)}</strong>
            </div>
            <div>
              <span>Salidas</span>
              <strong className="amount-negative">{money(summary.economic.outcome)}</strong>
            </div>
            <div>
              <span>Resultado neto</span>
              <strong className={summary.economic.net < 0 ? "amount-negative" : "amount-positive"}>{money(summary.economic.net)}</strong>
            </div>
          </div>
          <dl className="manager-economic-breakdown">
            <div>
              <dt>Resultado de maquinas</dt>
              <dd className={summary.economic.machineResult < 0 ? "amount-negative" : "amount-positive"}>{money(summary.economic.machineResult)}</dd>
            </div>
            <div><dt>Gastos</dt><dd>{money(summary.economic.expenses)}</dd></div>
            <div><dt>Salarios</dt><dd>{money(summary.economic.salaries)}</dd></div>
            <div><dt>Regalos</dt><dd>{money(summary.economic.gifts)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="manager-cash-context" aria-label="Contexto de recaudacion">
        <div>
          <span>{openBalance ? "Recaudacion activa" : "Sin recaudacion activa"}</span>
          <strong>
            {openBalance
              ? `${balanceVisibleId(data, openBalance)} - ${openBalance.operatingDate}`
              : "Operacion administrativa sobre Principal"}
          </strong>
          <small>{openBalance ? `Apertura por ${openedBy}` : "Caja disponible para una nueva apertura"}</small>
        </div>
        <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
          Ver resumen de cajas
        </button>
      </section>

      <section className="manager-overview-section" aria-labelledby="manager-actions-title">
        <div className="manager-section-heading">
          <h2 id="manager-actions-title">Accesos de gestion</h2>
        </div>
        <nav className="manager-shortcuts" aria-label="Accesos de gestion del encargado">
          <button className="button primary compact" type="button" onClick={() => setScreen("manager-expenses")}>
            <ReceiptText size={17} aria-hidden="true" /> Control de gastos
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("admin-salary-settlements")}>
            <WalletCards size={17} aria-hidden="true" /> Salarios
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("admin-clients")}>
            <UsersRound size={17} aria-hidden="true" /> Clientes
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("admin-staff")}>
            <ContactRound size={17} aria-hidden="true" /> Personal
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("reports")}>
            <BarChart3 size={17} aria-hidden="true" /> Reportes
          </button>
          <button className="button primary compact" type="button" onClick={() => setScreen("audit")}>
            <ShieldCheck size={17} aria-hidden="true" /> Auditoria
          </button>
        </nav>
      </section>

      <section className="manager-overview-section" aria-labelledby="manager-activity-title">
        <div className="manager-section-heading manager-section-heading-action">
          <div>
            <h2 id="manager-activity-title">Actividad financiera reciente</h2>
            <span>Ultimos movimientos monetarios del local</span>
          </div>
        </div>
        <ManagerActivityTable rows={summary.recentActivity} />
      </section>
    </section>
  );
}
