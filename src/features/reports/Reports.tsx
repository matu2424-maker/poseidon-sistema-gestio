import { useState } from "react";
import type { AppData, User } from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { balanceVisibleId } from "../../lib/display";
import { exportCsv, exportDailyExcel } from "../../lib/export";
import { money } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";

type ReportBalanceColumnKey = "id" | "operatingDate" | "status" | "expectedCash" | "declaredCash" | "cashDifference" | "bankDifference" | "actions";

const balanceColumns: { key: ReportBalanceColumnKey; label: string; sortable?: boolean }[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "operatingDate", label: "Fecha", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "expectedCash", label: "Efectivo esperado", sortable: true },
  { key: "declaredCash", label: "Declarado", sortable: true },
  { key: "cashDifference", label: "Diferencia efectivo", sortable: true },
  { key: "bankDifference", label: "Diferencia banco", sortable: true },
  { key: "actions", label: "Accion" },
];

export function Reports({ data, user }: { data: AppData; user: User }) {
  const closedBalances = data.balances.filter((balance) => balance.status === "CERRADO");
  const [sort, setSort] = useState<SortState<ReportBalanceColumnKey>>({ key: "operatingDate", direction: "desc" });
  const latest = closedBalances[0];
  const diffs = closedBalances.filter((balance) => (balance.cashDifference ?? 0) !== 0 || (balance.bankDifference ?? 0) !== 0);
  const sortedBalances = [...closedBalances].sort((a, b) => {
    const result = compareValues(reportBalanceValue(data, a, sort.key), reportBalanceValue(data, b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });

  return (
    <>
      <h2>Reportes iniciales</h2>
      <div className="card-grid three">
        <article className="action-card">
          <h3>Cierre diario</h3>
          <p>Exportacion Excel con caja, maquinas y movimientos</p>
          <button className="button primary small" disabled={!latest} onClick={() => latest && exportDailyExcel(data, latest)}>
            Exportar
          </button>
        </article>
        <article className="action-card">
          <h3>Maquinas</h3>
          <p>Resultado por maquina e historial de lecturas</p>
          <button
            className="button primary small"
            onClick={() =>
              exportCsv("poseidon-maquinas.csv", [
                ["ID", "Nombre", "Estado", "Ultimo IN", "Ultimo OUT"],
                ...data.machines.map((machine) => [machine.visibleId, machine.name, machine.status, String(machine.lastIn), String(machine.lastOut)]),
              ])
            }
          >
            Exportar
          </button>
        </article>
        <article className="action-card">
          <h3>Diferencias</h3>
          <p>Pendientes / revisadas con observacion</p>
          <button
            className="button primary small"
            onClick={() =>
              exportCsv("poseidon-diferencias.csv", [
                ["Fecha", "Diferencia efectivo", "Diferencia banco", "Estado", "Observacion"],
                ...diffs.map((balance) => [
                  balance.operatingDate,
                  String(balance.cashDifference ?? 0),
                  String(balance.bankDifference ?? 0),
                  balance.differenceStatus ?? "",
                  balance.differenceNote ?? "",
                ]),
              ])
            }
          >
            Exportar
          </button>
        </article>
      </div>
      <h2>Historial de cierres</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {balanceColumns.map((column) => (
                <th key={column.key} aria-sort={column.sortable ? ariaSort(sort, column.key) : undefined}>
                  {column.sortable ? (
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                      {column.label}
                      {sortIndicator(sort, column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedBalances.map((balance) => {
              const totals = totalsForBalance(data, balance.id);
              return (
                <tr key={balance.id}>
                  <td>{balanceVisibleId(data, balance)}</td>
                  <td>{balance.operatingDate}</td>
                  <td>{balance.status}</td>
                  <td>{money(totals.expectedCash)}</td>
                  <td>{money(balance.declaredCash)}</td>
                  <td>{money(balance.cashDifference)}</td>
                  <td>{money(balance.bankDifference)}</td>
                  <td>
                    <button className="link-button" onClick={() => exportDailyExcel(data, balance)}>
                      Excel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {user.role === "CAJERO" && <p className="helper">El cajero ve reportes de la caja operativa, no historicos generales.</p>}
    </>
  );
}

function reportBalanceValue(data: AppData, balance: AppData["balances"][number], key: ReportBalanceColumnKey): string | number {
  if (key === "id") return balanceVisibleId(data, balance);
  if (key === "operatingDate") return balance.operatingDate;
  if (key === "status") return balance.status;
  if (key === "expectedCash") return totalsForBalance(data, balance.id).expectedCash;
  if (key === "declaredCash") return balance.declaredCash ?? 0;
  if (key === "cashDifference") return balance.cashDifference ?? 0;
  if (key === "bankDifference") return balance.bankDifference ?? 0;
  return "";
}
