import type { AppData, Balance } from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { formatDateTime, formatTime } from "../../lib/dates";
import { balanceVisibleId, localName, userDisplayName, userDisplayNameWithRole } from "../../lib/display";
import { bankDifferenceForBalance, cashDifferenceForBalance, differenceIsPending } from "../../lib/differences";
import { money } from "../../lib/money";
export function ClosedBalanceSummary({ data, balance }: { data: AppData; balance: Balance }) {
  const totals = totalsForBalance(data, balance.id);
  const recalculatedDifference = cashDifferenceForBalance(data, balance);
  const declaredBank = balance.declaredBank ?? balance.nextBankBase ?? 0;
  const recalculatedBankDifference = bankDifferenceForBalance(balance);
  const expectedBank = declaredBank - recalculatedBankDifference;
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const expenses = data.expenses.filter((expense) => expense.balanceId === balance.id && expense.status === "ACTIVO");
  const transfers = data.transfers.filter((transfer) => transfer.balanceId === balance.id && transfer.status === "ACTIVO");
  const gifts = data.gifts.filter((gift) => gift.balanceId === balance.id && gift.status === "ACTIVO");
  const salaryPayments = data.salarySettlements.filter((settlement) => settlement.balanceId === balance.id && settlement.status !== "ANULADA");
  const capitalMovements = data.capitalMovements.filter((movement) => movement.balanceId === balance.id && movement.status === "ACTIVO");
  const operatingCapitalMovements = capitalMovements.filter((movement) => movement.timing !== "APERTURA");
  const cashWithdrawals = operatingCapitalMovements.filter((movement) => movement.type === "RETIRO" && movement.medium === "EFECTIVO");
  const bankWithdrawals = operatingCapitalMovements.filter((movement) => movement.type === "RETIRO" && movement.medium === "TRANSFERENCIA");
  const cashContributions = operatingCapitalMovements.filter((movement) => movement.type === "APORTE" && movement.medium === "EFECTIVO");
  const bankContributions = operatingCapitalMovements.filter((movement) => movement.type === "APORTE" && movement.medium === "TRANSFERENCIA");
  const loadedReadings = readings.filter((reading) => reading.status === "CARGADA").length;
  const local = localName(data, balance.localId);
  const totalCashOutflows = totals.totalExpenses + totals.totalSalaries + totals.giftCash;
  const hasDifference = recalculatedDifference !== 0 || recalculatedBankDifference !== 0;
  const differenceTone = !hasDifference ? "green" : differenceIsPending(balance) ? "red" : "orange";
  const resultTone = totals.commercialResult >= 0 ? "green" : "red";
  const differenceStatus = hasDifference ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIFERENCIA";
  const financialRows = [
    { concept: "Transferencias", count: String(transfers.length), amount: money(totals.totalTransfers), detail: "Entran a banco / descuentan efectivo" },
    { concept: "Aportes efectivo", count: String(cashContributions.length), amount: money(totals.capitalContributionsCash), detail: "Suman al efectivo de caja" },
    { concept: "Aportes transferencia", count: String(bankContributions.length), amount: money(totals.capitalContributionsBank), detail: "Suman a banco" },
    { concept: "Retiros efectivo", count: String(cashWithdrawals.length), amount: money(totals.withdrawalsCash), detail: "Salen del efectivo de caja" },
    { concept: "Retiros transferencia", count: String(bankWithdrawals.length), amount: money(totals.withdrawalsBank), detail: "Salen de banco" },
  ];
  const outflowRows = [
    { concept: "Gastos", count: String(expenses.length), amount: money(totals.totalExpenses) },
    { concept: "Salarios", count: String(salaryPayments.length), amount: money(totals.totalSalaries) },
    { concept: "Regalos", count: String(gifts.length), amount: money(totals.giftCash) },
    { concept: "Salida total", count: "-", amount: money(totalCashOutflows) },
  ];

  return (
    <section className="closed-summary-panel">
      <div className="section-toolbar close-cash-toolbar">
        <div>
          <h2>Resumen de caja cerrada</h2>
          <p>
            {balanceVisibleId(data, balance)} - {local} - {balance.operatingDate} - apertura {formatTime(balance.openedAt)} - cierre {formatTime(balance.closedAt)}
          </p>
          <p>
            Abierta por {userDisplayNameWithRole(data, balance.openedBy, balance.openedByRole)} - Cerrada por{" "}
            {userDisplayNameWithRole(data, balance.closedBy, balance.closedByRole)}
          </p>
        </div>
        <span className="close-status-pill">
          {loadedReadings}/{readings.length} maquinas recaudadas
        </span>
      </div>

      <div className="close-kpi-grid">
        <article className={`close-kpi ${resultTone}`}>
          <span>Resultado final</span>
          <strong>{money(totals.commercialResult)}</strong>
          <p>Maquinas {money(totals.resultMachines)}</p>
          <p>Salida total {money(totalCashOutflows)}</p>
        </article>
        <article className={`close-kpi ${differenceTone}`}>
          <span>Control diferencias</span>
          <strong>{differenceStatus}</strong>
          <p>Efectivo {money(recalculatedDifference)}</p>
          <p>Banco {money(recalculatedBankDifference)}</p>
        </article>
        <article className="close-kpi blue">
          <span>Maquinas</span>
          <strong>{money(totals.resultMachines)}</strong>
          <p>Entrada {money(totals.totalIn)}</p>
          <p>Salida {money(totals.totalOut)}</p>
        </article>
        <article className="close-kpi slate">
          <span>Saldos proximos</span>
          <strong>{money((balance.nextBase ?? 0) + (balance.nextBankBase ?? 0))}</strong>
          <p>Efectivo {money(balance.nextBase)}</p>
          <p>Banco {money(balance.nextBankBase)}</p>
        </article>
      </div>

      <div className="closed-summary-grid">
        <div className="closed-summary-card">
          <h3>Datos de caja</h3>
          <dl className="summary-detail-list">
            <div>
              <dt>ID recaudacion</dt>
              <dd>{balanceVisibleId(data, balance)}</dd>
            </div>
            <div>
              <dt>Local</dt>
              <dd>{local}</dd>
            </div>
            <div>
              <dt>Fecha operativa</dt>
              <dd>{balance.operatingDate}</dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>
                {formatTime(balance.openedAt)} - {formatTime(balance.closedAt)}
              </dd>
            </div>
            <div>
              <dt>Apertura por</dt>
              <dd>{userDisplayNameWithRole(data, balance.openedBy, balance.openedByRole)}</dd>
            </div>
            <div>
              <dt>Cierre por</dt>
              <dd>{userDisplayNameWithRole(data, balance.closedBy, balance.closedByRole)}</dd>
            </div>
            <div>
              <dt>Efectivo inicial</dt>
              <dd>{money(balance.initialFund)}</dd>
            </div>
            <div>
              <dt>Banco inicial</dt>
              <dd>{money(balance.initialBankFund)}</dd>
            </div>
          </dl>
        </div>

        <div className={`closed-summary-card difference-control-card ${hasDifference && differenceIsPending(balance) ? "danger" : hasDifference ? "warning" : "ok"}`}>
          <h3>Control de diferencias</h3>
          <dl className="summary-detail-list">
            <div>
              <dt>Estado</dt>
              <dd>{differenceStatus}</dd>
            </div>
            <div className={recalculatedDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia efectivo</dt>
              <dd>{money(recalculatedDifference)}</dd>
            </div>
            <div className={recalculatedBankDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia banco</dt>
              <dd>{money(recalculatedBankDifference)}</dd>
            </div>
            <div>
              <dt>Obs. cierre cajero</dt>
              <dd>{balance.differenceNote || "-"}</dd>
            </div>
            <div>
              <dt>Gestionada por</dt>
              <dd>{userDisplayName(data, balance.differenceReviewedBy)}</dd>
            </div>
            <div>
              <dt>Fecha gestion</dt>
              <dd>{balance.differenceReviewedAt ? formatDateTime(balance.differenceReviewedAt) : "-"}</dd>
            </div>
            <div>
              <dt>Revision encargado/admin</dt>
              <dd>{balance.differenceReviewNote || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="closed-summary-card">
          <h3>Salidas operativas</h3>
          <table className="mini-summary-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {outflowRows.map((row) => (
                <tr key={row.concept} className={row.concept === "Salida total" ? "summary-total-row danger" : undefined}>
                  <td>{row.concept}</td>
                  <td>{row.count}</td>
                  <td>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="closed-summary-card">
          <h3>Movimientos financieros</h3>
          <table className="mini-summary-table">
            <thead>
              <tr>
                <th>Movimiento</th>
                <th>Cant.</th>
                <th>Total</th>
                <th>Impacto</th>
              </tr>
            </thead>
            <tbody>
              {financialRows.map((row) => (
                <tr key={row.concept}>
                  <td>{row.concept}</td>
                  <td>{row.count}</td>
                  <td>{row.amount}</td>
                  <td>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="closed-summary-card">
          <h3>Control de efectivo y banco</h3>
          <dl className="summary-detail-list">
            <div>
              <dt>Efectivo esperado</dt>
              <dd>{money(totals.expectedCash)}</dd>
            </div>
            <div>
              <dt>Efectivo declarado</dt>
              <dd>{money(balance.declaredCash)}</dd>
            </div>
            <div className={recalculatedDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia efectivo</dt>
              <dd>{money(recalculatedDifference)}</dd>
            </div>
            <div>
              <dt>Dinero banco esperado</dt>
              <dd>{money(expectedBank)}</dd>
            </div>
            <div>
              <dt>Dinero banco declarado</dt>
              <dd>{money(declaredBank)}</dd>
            </div>
            <div className={recalculatedBankDifference === 0 ? "summary-ok" : "summary-danger"}>
              <dt>Diferencia banco</dt>
              <dd>{money(recalculatedBankDifference)}</dd>
            </div>
            <div>
              <dt>Efectivo proxima caja</dt>
              <dd>{money(balance.nextBase)}</dd>
            </div>
            <div>
              <dt>Banco proxima caja</dt>
              <dd>{money(balance.nextBankBase)}</dd>
            </div>
          </dl>
        </div>

        <div className="closed-summary-card closed-summary-wide">
          <h3>Maquinas</h3>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Maquina</th>
                  <th>IN</th>
                  <th>OUT</th>
                  <th>Resultado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => {
                  const machine = data.machines.find((item) => item.id === reading.machineId);
                  return (
                    <tr key={reading.id}>
                      <td>{machine?.visibleId ?? "-"}</td>
                      <td>{machine?.name ?? "-"}</td>
                      <td>{money((reading.inActual ?? reading.inPrevious) - reading.inPrevious)}</td>
                      <td>{money((reading.outActual ?? reading.outPrevious) - reading.outPrevious)}</td>
                      <td>{money(reading.result)}</td>
                      <td>{reading.status}</td>
                    </tr>
                  );
                })}
                {!readings.length && (
                  <tr>
                    <td colSpan={6}>Sin maquinas registradas en esta caja.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

