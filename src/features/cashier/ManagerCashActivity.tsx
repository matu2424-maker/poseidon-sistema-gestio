import { useState } from "react";
import type { AppData } from "../../types";
import { formatTime } from "../../lib/dates";
import {
  managerCashActivityForBalance,
  type ManagerCashActivityItem,
} from "../../lib/managerCashActivity";
import { money } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";

type SortKey = "Hora" | "Usuario" | "Movimiento" | "Cuenta" | "Detalle" | "Entrada" | "Salida" | "Estado";

const kindLabels: Record<ManagerCashActivityItem["kind"], string> = {
  GASTO: "Gasto",
  APORTE: "Aporte",
  RETIRO: "Retiro",
};

const mediumLabels: Record<ManagerCashActivityItem["medium"], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Banco",
};

const sortValue = (item: ManagerCashActivityItem, key: SortKey) => {
  switch (key) {
    case "Hora":
      return item.occurredAt;
    case "Usuario":
      return item.userName;
    case "Movimiento":
      return kindLabels[item.kind];
    case "Cuenta":
      return mediumLabels[item.medium];
    case "Detalle":
      return item.detail;
    case "Entrada":
      return item.entry;
    case "Salida":
      return item.outflow;
    case "Estado":
      return item.status;
  }
};

const signedMoney = (value: number) => (value > 0 ? `+ ${money(value)}` : money(value));

export function ManagerCashActivity({ data, balanceId }: { data: AppData; balanceId: string }) {
  const activity = managerCashActivityForBalance(data, balanceId);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "Hora", direction: "desc" });
  const columns: SortKey[] = ["Hora", "Usuario", "Movimiento", "Cuenta", "Detalle", "Entrada", "Salida", "Estado"];
  const sortedItems = [...activity.items].sort((left, right) => {
    const result = compareValues(sortValue(left, sort.key), sortValue(right, sort.key));
    return sort.direction === "asc" ? result : -result;
  });

  return (
    <section className="manager-cash-activity" aria-labelledby="manager-cash-activity-title">
      <div className="manager-cash-activity-header">
        <div>
          <h3 id="manager-cash-activity-title">Movimientos del encargado</h3>
          <p>
            Intervenciones registradas durante esta recaudacion. Los movimientos anulados conservan el detalle historico y no integran el impacto.
          </p>
        </div>
        <div className="manager-cash-impact" aria-label="Impacto vigente de los movimientos del encargado">
          <div>
            <span>Impacto efectivo</span>
            <strong className={activity.cashNet > 0 ? "positive" : activity.cashNet < 0 ? "negative" : "neutral"}>
              {signedMoney(activity.cashNet)}
            </strong>
          </div>
          <div>
            <span>Impacto banco</span>
            <strong className={activity.bankNet > 0 ? "positive" : activity.bankNet < 0 ? "negative" : "neutral"}>
              {signedMoney(activity.bankNet)}
            </strong>
          </div>
        </div>
      </div>

      {sortedItems.length ? (
        <div className="table-wrap">
          <table className="data-table manager-cash-activity-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} aria-sort={ariaSort(sort, column)}>
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column))}>
                      {column}
                      {sortIndicator(sort, column)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id} className={item.status === "ANULADO" ? "status-inactive" : undefined}>
                  <td>{formatTime(item.occurredAt)}</td>
                  <td>{item.userName}</td>
                  <td>{kindLabels[item.kind]}</td>
                  <td>{mediumLabels[item.medium]}</td>
                  <td>{item.detail || "Sin detalle"}</td>
                  <td>{item.entry > 0 ? `+ ${money(item.entry)}` : "-"}</td>
                  <td>{item.outflow > 0 ? `- ${money(item.outflow)}` : "-"}</td>
                  <td>
                    <span className={`status-pill ${item.status === "ACTIVO" ? "ok" : "warning"}`}>
                      {item.status === "ACTIVO" ? "Activo" : "Anulado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="manager-cash-activity-empty">Sin movimientos del encargado en esta recaudacion.</p>
      )}

      {activity.items.length > 0 && (
        <p className="manager-cash-activity-count">
          {activity.activeCount} vigentes · {activity.annulledCount} anulados
        </p>
      )}
    </section>
  );
}
