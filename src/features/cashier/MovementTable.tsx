import { useState, type ReactNode } from "react";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import type { MovementStatus } from "../../types";

export function CashierMovementPanel({
  title,
  detail,
  totalLabel,
  total,
  onBack,
  onAdd,
  children,
}: {
  title: string;
  detail?: string;
  totalLabel: string;
  total: number;
  onBack?: () => void;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="admin-focus movement-admin-page">
      <div className="admin-header">
        <div>
          <h2>{title}</h2>
          {detail && <p className="helper">{detail}</p>}
        </div>
        <div className="admin-header-actions">
          <span>
            {total} {totalLabel}
          </span>
          {onAdd && (
            <button className="button success compact" type="button" onClick={onAdd}>
              Agregar
            </button>
          )}
          {onBack && (
            <button className="button muted compact" type="button" onClick={onBack}>
              Volver al panel
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function MovementTable({
  columns,
  rows,
  onAnnul,
  createRow,
  actionLabel = "Anular",
}: {
  columns: string[];
  rows: { id: string; cells: string[]; sortValues?: (string | number)[]; status: MovementStatus }[];
  onAnnul: (id: string) => void;
  createRow?: ReactNode;
  actionLabel?: string;
}) {
  const sortableColumns = columns.slice(0, Math.max(columns.length - 1, 0));
  const [sort, setSort] = useState<SortState<string>>({ key: sortableColumns[0] ?? "", direction: "asc" });
  const sortIndex = Math.max(sortableColumns.indexOf(sort.key), 0);
  const sortedRows = [...rows].sort((left, right) => {
    const result = compareValues(
      left.sortValues?.[sortIndex] ?? left.cells[sortIndex] ?? "",
      right.sortValues?.[sortIndex] ?? right.cells[sortIndex] ?? "",
    );
    return sort.direction === "asc" ? result : -result;
  });

  return (
    <div className="table-wrap grow">
      <table className="data-table movement-data-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column} aria-sort={index < columns.length - 1 ? ariaSort(sort, column) : undefined}>
                {index < columns.length - 1 ? (
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column))}>
                    {column}
                    {sortIndicator(sort, column)}
                  </button>
                ) : (
                  column
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {createRow}
          {sortedRows.map((row) => (
            <tr key={row.id} className={row.status === "ANULADO" ? "status-inactive" : undefined}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${index}`}>{cell}</td>
              ))}
              <td>
                {row.status === "ACTIVO" ? (
                  <button className="button muted compact" type="button" onClick={() => onAnnul(row.id)}>
                    {actionLabel}
                  </button>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length}>Sin movimientos cargados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
