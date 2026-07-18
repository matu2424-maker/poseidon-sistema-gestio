import { useMemo, useState } from "react";
import { formatDateTime } from "../../lib/dates";
import type { ManagerActivityRow } from "../../lib/managerDashboardSummary";
import { money } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";

type ActivityColumn = "createdAt" | "action" | "account" | "amount" | "user" | "detail";

const columns: Array<{ key: ActivityColumn; label: string }> = [
  { key: "createdAt", label: "Fecha" },
  { key: "action", label: "Accion" },
  { key: "account", label: "Cuenta" },
  { key: "amount", label: "Monto" },
  { key: "user", label: "Usuario" },
  { key: "detail", label: "Detalle" },
];

export function ManagerActivityTable({ rows }: { rows: ManagerActivityRow[] }) {
  const [sort, setSort] = useState<SortState<ActivityColumn>>({ key: "createdAt", direction: "desc" });
  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const result = compareValues(a[sort.key], b[sort.key]);
        return sort.direction === "asc" ? result : -result;
      }),
    [rows, sort],
  );

  if (!rows.length) {
    return <p className="manager-activity-empty">Todavia no hay movimientos financieros para mostrar.</p>;
  }

  return (
    <div className="table-scroll manager-activity-table-wrap">
      <table className="data-table manager-activity-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} aria-sort={ariaSort(sort, column.key)}>
                <button type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                  {column.label}{sortIndicator(sort, column.key)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.createdAt)}</td>
              <td>{row.action}</td>
              <td>{row.account}</td>
              <td className={row.amount < 0 ? "amount-negative" : "amount-positive"}>{money(row.amount)}</td>
              <td>{row.user}</td>
              <td>{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
