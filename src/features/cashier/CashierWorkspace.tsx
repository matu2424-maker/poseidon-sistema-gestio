import type { ReactNode } from "react";
import { NoticeBanner } from "../../components/NoticeBanner";
import { Modal } from "../../components/ui";
import { balanceCashReconciliation } from "../../lib/cashAvailability";
import { totalsForBalance } from "../../lib/cashTotals";
import { localAccountBalances } from "../../lib/currentAccounts";
import { balanceVisibleId } from "../../lib/display";
import { money } from "../../lib/money";
import { titleForScreen } from "../../navigation/screens";
import type { AppData, Balance, Local, Screen, User } from "../../types";

export function CashierWorkspace({
  data,
  user,
  local,
  openBalance,
  screen,
  setScreen,
  message,
  onLogout,
  onSwitchToManager,
  returnRoleLabel = "encargado",
  children,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  message: string;
  onLogout: () => void;
  onSwitchToManager?: () => void;
  returnRoleLabel?: string;
  children: ReactNode;
}) {
  const totals = openBalance ? totalsForBalance(data, openBalance.id) : null;
  const pendingReadings = openBalance
    ? data.readings.filter((reading) => reading.balanceId === openBalance.id && reading.status === "PENDIENTE").length
    : 0;
  const balanceReadings = openBalance
    ? data.readings.filter((reading) => reading.balanceId === openBalance.id)
    : [];
  const cashierMachines = balanceReadings.length;
  const completedReadings = balanceReadings.filter((reading) => reading.status === "CARGADA").length;
  const localBalances = localAccountBalances(data, local.id);
  const cashReconciliation = openBalance ? balanceCashReconciliation(data, openBalance.id) : null;
  const hasCashReconciliationError = Boolean(openBalance && !cashReconciliation?.isConsistent);
  const machineResultTone = (totals?.resultMachines ?? 0) >= 0 ? "positive" : "negative";
  const totalOutflows =
    (totals?.totalExpenses ?? 0) + (totals?.totalSalaries ?? 0) + (totals?.giftCash ?? 0);
  const windowScreens: Screen[] = ["close-cash"];
  const inlineScreens: Screen[] = [
    "open-cash",
    "cashier-summary",
    "counters",
    "expenses",
    "transfers",
    "gifts",
    "salary-payments",
    "capital-movements",
    "cashier-clients",
  ];
  const noBalanceScreens: Screen[] = ["open-cash", "cashier-summary", "cashier-clients"];
  const showWindow = openBalance && windowScreens.includes(screen);
  const showInline = openBalance ? inlineScreens.includes(screen) : noBalanceScreens.includes(screen);

  return (
    <div className="cashier-shell">
      <header className="cashier-top">
        <div>
          <strong>POSEIDON</strong>
          <span>Sistema de Gestion</span>
        </div>
        <div className="cashier-user">
          <span>Local: {local.name}</span>
          <span>Usuario: {user.name}</span>
        </div>
        <button className="button muted compact" onClick={onLogout}>
          Salir
        </button>
        {onSwitchToManager && (
          <button className="button primary compact" type="button" onClick={onSwitchToManager}>
            Modo {returnRoleLabel}
          </button>
        )}
      </header>
      <main className="cashier-content">
        <NoticeBanner message={message} className="cashier-notice" />
        <section className="cashier-panel">
          <div className="cashier-heading">
            <div>
              <h1>Panel del cajero</h1>
              <p>
                {openBalance
                  ? `Fecha: ${openBalance.operatingDate} - Caja: ${balanceVisibleId(data, openBalance)} ABIERTA`
                  : "No hay caja abierta. Para continuar tenes que abrir una caja diaria."}
              </p>
            </div>
            {openBalance && (
              <div className="cashier-heading-balances">
                <span>
                  <small>Efectivo inicial</small>
                  <strong>{money(openBalance.initialFund)}</strong>
                </span>
                <span>
                  <small>Banco inicial</small>
                  <strong>{money(openBalance.initialBankFund)}</strong>
                </span>
              </div>
            )}
          </div>
          {hasCashReconciliationError && (
            <div className="cashier-reconciliation-alert" role="alert">
              El efectivo calculado no coincide con Caja / Efectivo. Caja:{" "}
              {money(cashReconciliation?.expectedCash)}. Cuenta corriente:{" "}
              {money(cashReconciliation?.accountCash)}. Diferencia tecnica:{" "}
              {money(cashReconciliation?.delta)}. Las operaciones quedan bloqueadas hasta una reconciliacion auditada.
            </div>
          )}
          {openBalance && !showInline && (
            <div className="cashier-summary-grid">
              <button className={`cashier-metric ${machineResultTone}`} type="button" onClick={() => setScreen("counters")}>
                <span>Resultado de maquinas</span>
                <strong>{money(totals?.resultMachines)}</strong>
                <small>
                  {completedReadings}/{cashierMachines} recaudadas - {pendingReadings} pendientes
                </small>
              </button>
              <div className="cashier-metric passive neutral">
                <span>Salida total</span>
                <strong>{money(totalOutflows)}</strong>
                <small>Gastos + salarios + regalos</small>
              </div>
              <div className="cashier-metric passive neutral">
                <span>Efectivo en caja</span>
                <strong>{hasCashReconciliationError ? "No conciliado" : money(cashReconciliation?.expectedCash)}</strong>
                <small>{hasCashReconciliationError ? "Saldo bloqueado" : "Saldo conciliado con Caja / Efectivo"}</small>
              </div>
              <div className="cashier-metric passive neutral">
                <span>Dinero en banco</span>
                <strong>{money(localBalances.bank)}</strong>
                <small>Saldo Caja / Banco</small>
              </div>
              <button className="cashier-metric bank" type="button" onClick={() => setScreen("transfers")}>
                <span>Transferencias</span>
                <strong>{money(totals?.totalTransfers)}</strong>
                <small>Movimientos registrados en banco</small>
              </button>
              <button className="cashier-metric cash" type="button" onClick={() => setScreen("capital-movements")}>
                <span>Principal a Caja</span>
                <strong>{money(totals?.capitalContributionsCash)}</strong>
                <small>Fondos recibidos en Caja</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("capital-movements")}>
                <span>Caja a Principal</span>
                <strong>{money(totals?.totalWithdrawals)}</strong>
                <small>Traspasos en efectivo y banco</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("expenses")}>
                <span>Gastos</span>
                <strong>{money(totals?.totalExpenses)}</strong>
                <small>Salidas operativas</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("salary-payments")}>
                <span>Salarios</span>
                <strong>{money(totals?.totalSalaries)}</strong>
                <small>Pagos al personal</small>
              </button>
              <button className="cashier-metric out" type="button" onClick={() => setScreen("gifts")}>
                <span>Regalos</span>
                <strong>{money(totals?.giftCash)}</strong>
                <small>Regalos en efectivo</small>
              </button>
            </div>
          )}
          {showInline ? (
            <section className="cashier-inline-view">{children}</section>
          ) : openBalance ? (
            <div className="cashier-secondary-actions">
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                Clientes
              </button>
              <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
                Resumen cajas
              </button>
              <button className="button muted compact" type="button" disabled>
                Abrir caja
              </button>
              <button className="button soft-blue compact" type="button" onClick={() => setScreen("close-cash")}>
                Cerrar caja
              </button>
            </div>
          ) : (
            <section className="cashier-required">
              <div className="cashier-required-alert">Necesita abrir una nueva caja para poder operar.</div>
              <div className="cashier-secondary-actions cashier-secondary-actions-open">
                <button className="button muted compact" type="button" onClick={() => setScreen("cashier-clients")}>
                  Clientes
                </button>
                <button className="button muted compact" type="button" onClick={() => setScreen("cashier-summary")}>
                  Resumen cajas
                </button>
                <button className="button success compact" type="button" onClick={() => setScreen("open-cash")}>
                  Abrir caja
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
      {showWindow && (
        <Modal title={titleForScreen(screen, user.role)} onClose={() => setScreen("panel")} closeLabel="Volver al panel" wide>
          {children}
        </Modal>
      )}
    </div>
  );
}
