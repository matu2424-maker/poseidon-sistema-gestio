import { useState } from "react";
import type { AppData, Balance, PeriodicClosure, PeriodicClosureStatus, PeriodicClosureType, User } from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { today, nowIso } from "../../lib/dates";
import { balanceVisibleId, localName } from "../../lib/display";
import { balanceHasDifference, bankDifferenceForBalance, cashDifferenceForBalance, differenceIsPending } from "../../lib/differences";
import { uid } from "../../lib/ids";
import { money } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { InfoCard } from "../../components/ui";
import { confirmAction } from "../../lib/confirmations";
import { summarizePeriodicRange } from "../../lib/periodicTotals";

const POSEIDON_LOCAL_ID = "1";

type BalanceColumnKey =
  | "id"
  | "date"
  | "local"
  | "resultMachines"
  | "expenses"
  | "salaries"
  | "gifts"
  | "commercialResult"
  | "cashDifference"
  | "bankDifference"
  | "differenceStatus";
type ClosureColumnKey = "id" | "type" | "period" | "commercialResult" | "differences" | "status" | "actions";

const balanceColumns: { key: BalanceColumnKey; label: string; sortable?: boolean }[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "date", label: "Fecha", sortable: true },
  { key: "local", label: "Local", sortable: true },
  { key: "resultMachines", label: "Resultado maquinas", sortable: true },
  { key: "expenses", label: "Gastos", sortable: true },
  { key: "salaries", label: "Salarios", sortable: true },
  { key: "gifts", label: "Regalos", sortable: true },
  { key: "commercialResult", label: "Resultado final", sortable: true },
  { key: "cashDifference", label: "Dif. efectivo", sortable: true },
  { key: "bankDifference", label: "Dif. banco", sortable: true },
  { key: "differenceStatus", label: "Estado dif.", sortable: true },
];

const closureColumns: { key: ClosureColumnKey; label: string; sortable?: boolean }[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "type", label: "Tipo", sortable: true },
  { key: "period", label: "Periodo", sortable: true },
  { key: "commercialResult", label: "Resultado", sortable: true },
  { key: "differences", label: "Diferencias", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "actions", label: "Accion" },
];

export function Periodic({
  data,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const [closureType, setClosureType] = useState<PeriodicClosureType>("MENSUAL");
  const initialRange = rangeForType("MENSUAL");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [balanceSort, setBalanceSort] = useState<SortState<BalanceColumnKey>>({ key: "date", direction: "asc" });
  const [closureSort, setClosureSort] = useState<SortState<ClosureColumnKey>>({ key: "id", direction: "desc" });
  const allowedLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const closedBalances = data.balances
    .filter((balance) => balance.status === "CERRADO" && (!allowedLocalIds || allowedLocalIds.has(balance.localId)))
    .filter((balance) => {
      const date = balanceDate(balance);
      return date >= startDate && date <= endDate;
    })
    .sort((a, b) => {
      const result = compareValues(balanceSortValue(data, a, balanceSort.key), balanceSortValue(data, b, balanceSort.key));
      return balanceSort.direction === "asc" ? result : -result;
    });
  const scopedLocalIds = allowedLocalIds ? [...allowedLocalIds] : data.locals.map((item) => item.id);
  const totals = summarizePeriodicRange(data, {
    balances: closedBalances,
    localIds: scopedLocalIds,
    startDate,
    endDate,
    type: closureType,
  });
  const savedClosures = data.periodicClosures
    .filter((closure) => !allowedLocalIds || allowedLocalIds.has(closure.localId))
    .sort((a, b) => {
      const result = compareValues(closureSortValue(a, closureSort.key), closureSortValue(b, closureSort.key));
      return closureSort.direction === "asc" ? result : -result;
    });
  const changeClosureType = (type: PeriodicClosureType) => {
    setClosureType(type);
    if (type !== "PERSONALIZADO") {
      const range = rangeForType(type);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };
  const nextPeriodicVisibleId = (current: AppData) => {
    const max = current.periodicClosures
      .map((closure) => {
        const match = String(closure.visibleId ?? "").match(/PER-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0);
    return `PER-${max + 1}`;
  };
  const saveClosure = () => {
    if (startDate > endDate) {
      setError("La fecha inicial no puede ser mayor a la fecha final.");
      return;
    }
    if (!closedBalances.length) {
      setError("No hay cajas cerradas dentro del periodo seleccionado.");
      return;
    }
    patchData((current) => {
      const currentBalances = current.balances
        .filter((balance) => balance.status === "CERRADO" && (!allowedLocalIds || allowedLocalIds.has(balance.localId)))
        .filter((balance) => {
          const date = balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
          return date >= startDate && date <= endDate;
        });
      const currentTotals = summarizePeriodicRange(current, {
        balances: currentBalances,
        localIds: scopedLocalIds,
        startDate,
        endDate,
        type: closureType,
      });
      const localId = user.localIds[0] ?? POSEIDON_LOCAL_ID;
      const closure: PeriodicClosure = {
        id: uid("periodic"),
        visibleId: nextPeriodicVisibleId(current),
        localId,
        type: closureType,
        startDate,
        endDate,
        balanceIds: currentBalances.map((balance) => balance.id),
        ...currentTotals,
        status: "GENERADO",
        note: note.trim(),
        createdBy: user.id,
        createdAt: nowIso(),
      };
      return audit(
        { ...current, periodicClosures: [closure, ...current.periodicClosures] },
        "Generar cierre periodico",
        "CierrePeriodico",
        closure.id,
        "",
        closure,
        closure.note,
      );
    });
    setMessage("Cierre periodico generado y auditado.");
    setNote("");
    setError("");
  };
  const annulClosure = (closure: PeriodicClosure) => {
    if (!confirmAction(`Anular cierre periodico ${closure.visibleId}?`)) return;
    patchData((current) => {
      const previous = current.periodicClosures.find((item) => item.id === closure.id);
      const periodicClosures = current.periodicClosures.map((item) =>
        item.id === closure.id ? { ...item, status: "ANULADO" as PeriodicClosureStatus } : item,
      );
      const next = periodicClosures.find((item) => item.id === closure.id);
      return audit({ ...current, periodicClosures }, "Anular cierre periodico", "CierrePeriodico", closure.id, previous, next, "Anulacion de control");
    });
    setMessage("Cierre periodico anulado.");
  };

  return (
    <section className="admin-focus periodic-page detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Consolidado semanal, quincenal, mensual o por fechas. Guarda una foto auditada del periodo seleccionado.</p>
        </div>
        <div className="admin-header-actions">
          <span>{closedBalances.length} caja(s) incluidas</span>
          <button className="button success compact" type="button" onClick={saveClosure}>
            Guardar cierre
          </button>
        </div>
      </div>
      {error && <p className="validation error">{error}</p>}
      <div className="periodic-controls">
        <label>
          Tipo de cierre
          <select value={closureType} onChange={(event) => changeClosureType(event.target.value as PeriodicClosureType)}>
            <option value="SEMANAL">Semanal</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
            <option value="PERSONALIZADO">Entre fechas</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <label className="periodic-note">
          Observacion
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional para auditoria" />
        </label>
      </div>
      <div className="card-grid three periodic-kpis">
        <InfoCard tone={totals.commercialResult >= 0 ? "green" : "red"} title="Resultado economico" lines={[money(totals.commercialResult), "Maquinas - gastos - salarios - regalos"]} />
        <InfoCard tone="blue" title="Resultado maquinas" lines={[money(totals.resultMachines), `${closedBalances.length} recaudacion(es)`]} />
        <InfoCard tone="red" title="Salida total" lines={[money(totals.totalOutflows), `Gastos ${money(totals.totalExpenses)} / Salarios ${money(totals.totalSalaries)} / Regalos ${money(totals.totalGifts)}`]} />
        <InfoCard tone="blue" title="Transferencias" lines={[money(totals.totalTransfers), "Movimientos bancarios"]} />
        <InfoCard tone="orange" title="Caja / Principal" lines={[`Caja a Principal ${money(totals.totalCajaToPrincipal)}`, `Principal a Caja ${money(totals.totalPrincipalToCaja)}`]} />
        <InfoCard tone="blue" title="Socios" lines={[`Aportes ${money(totals.totalPartnerContributions)}`, `Retiros ${money(totals.totalPartnerWithdrawals)}`]} />
        <InfoCard
          tone={totals.pendingDifferences > 0 || totals.cashDifference !== 0 || totals.bankDifference !== 0 ? "red" : "green"}
          title="Diferencias"
          lines={[`Efectivo ${money(totals.cashDifference)}`, `Banco ${money(totals.bankDifference)}`, `${totals.pendingDifferences} pendiente(s)`]}
        />
      </div>
      <div className="periodic-layout">
        <section className="periodic-panel">
          <div className="section-toolbar">
            <div>
              <h3>Cajas incluidas</h3>
              <p>Solo cajas cerradas dentro del rango seleccionado.</p>
            </div>
          </div>
          <div className="table-wrap grow">
            <table className="data-table admin-data-table periodic-table">
              <thead>
                <tr>
                  {balanceColumns.map((column) => (
                    <th key={column.key} aria-sort={ariaSort(balanceSort, column.key)}>
                      <button className="sort-button" type="button" onClick={() => setBalanceSort((current) => nextSort(current, column.key))}>
                        {column.label}
                        {sortIndicator(balanceSort, column.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedBalances.map((balance) => {
                  const balanceTotals = totalsForBalance(data, balance.id);
                  const gifts = balanceTotals.giftCash + balanceTotals.giftCredit;
                  const hasDifference = balanceHasDifference(data, balance);
                  return (
                    <tr key={balance.id} className={hasDifference && differenceIsPending(balance) ? "status-error" : undefined}>
                      <td>{balanceVisibleId(data, balance)}</td>
                      <td>{balanceDate(balance)}</td>
                      <td>{localName(data, balance.localId)}</td>
                      <td>{money(balanceTotals.resultMachines)}</td>
                      <td>{money(balanceTotals.totalExpenses)}</td>
                      <td>{money(balanceTotals.totalSalaries)}</td>
                      <td>{money(gifts)}</td>
                      <td className={balanceTotals.commercialResult >= 0 ? "money-positive" : "money-negative"}>{money(balanceTotals.commercialResult)}</td>
                      <td>{money(cashDifferenceForBalance(data, balance))}</td>
                      <td>{money(bankDifferenceForBalance(balance))}</td>
                      <td>{hasDifference ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIF."}</td>
                    </tr>
                  );
                })}
                {!closedBalances.length && (
                  <tr>
                    <td colSpan={balanceColumns.length}>No hay cajas cerradas en el periodo seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(totals.principalExpenseIds.length > 0 || totals.principalSalarySettlementIds.length > 0) && (
            <p className="helper">
              El consolidado tambien incluye {totals.principalExpenseIds.length} gasto(s) y {totals.principalSalarySettlementIds.length} liquidacion(es) pagados desde Principal.
            </p>
          )}
        </section>
        <section className="periodic-panel">
          <div className="section-toolbar">
            <div>
              <h3>Cierres guardados</h3>
              <p>Fotos auditadas de periodos ya generados.</p>
            </div>
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  {closureColumns.map((column) => (
                    <th key={column.key} aria-sort={column.sortable ? ariaSort(closureSort, column.key) : undefined}>
                      {column.sortable ? (
                        <button className="sort-button" type="button" onClick={() => setClosureSort((current) => nextSort(current, column.key))}>
                          {column.label}
                          {sortIndicator(closureSort, column.key)}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {savedClosures.map((closure) => (
                  <tr key={closure.id} className={closure.status === "ANULADO" ? "status-inactive" : undefined}>
                    <td>{closure.visibleId}</td>
                    <td>{closure.type}</td>
                    <td>
                      {closure.startDate} a {closure.endDate}
                    </td>
                    <td className={closure.commercialResult >= 0 ? "money-positive" : "money-negative"}>{money(closure.commercialResult)}</td>
                    <td>{money(closure.cashDifference + closure.bankDifference)}</td>
                    <td>{closure.status}</td>
                    <td>
                      {closure.status === "GENERADO" ? (
                        <button className="button muted compact" type="button" onClick={() => annulClosure(closure)}>
                          Anular
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {!savedClosures.length && (
                  <tr>
                    <td colSpan={closureColumns.length}>No hay cierres periodicos guardados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function balanceDate(balance: Balance) {
  return balance.closedAt?.slice(0, 10) ?? balance.operatingDate;
}

function balanceSortValue(data: AppData, balance: Balance, key: BalanceColumnKey): string | number {
  const balanceTotals = totalsForBalance(data, balance.id);
  const gifts = balanceTotals.giftCash + balanceTotals.giftCredit;
  if (key === "id") return balanceVisibleId(data, balance);
  if (key === "date") return balanceDate(balance);
  if (key === "local") return localName(data, balance.localId);
  if (key === "resultMachines") return balanceTotals.resultMachines;
  if (key === "expenses") return balanceTotals.totalExpenses;
  if (key === "salaries") return balanceTotals.totalSalaries;
  if (key === "gifts") return gifts;
  if (key === "commercialResult") return balanceTotals.commercialResult;
  if (key === "cashDifference") return cashDifferenceForBalance(data, balance);
  if (key === "bankDifference") return bankDifferenceForBalance(balance);
  return balanceHasDifference(data, balance) ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIF.";
}

function closureSortValue(closure: PeriodicClosure, key: ClosureColumnKey): string | number {
  if (key === "id") {
    const match = String(closure.visibleId ?? "").match(/PER-(\d+)$/);
    return match ? Number(match[1]) : closure.visibleId;
  }
  if (key === "type") return closure.type;
  if (key === "period") return `${closure.startDate} ${closure.endDate}`;
  if (key === "commercialResult") return closure.commercialResult;
  if (key === "differences") return closure.cashDifference + closure.bankDifference;
  if (key === "status") return closure.status;
  return "";
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function rangeForType(type: PeriodicClosureType) {
  const base = new Date();
  if (type === "MENSUAL") {
    return {
      start: formatInputDate(new Date(base.getFullYear(), base.getMonth(), 1)),
      end: formatInputDate(endOfMonth(base)),
    };
  }
  if (type === "QUINCENAL") {
    const firstHalf = base.getDate() <= 15;
    return {
      start: formatInputDate(new Date(base.getFullYear(), base.getMonth(), firstHalf ? 1 : 16)),
      end: formatInputDate(firstHalf ? new Date(base.getFullYear(), base.getMonth(), 15) : endOfMonth(base)),
    };
  }
  if (type === "SEMANAL") {
    const weekDay = base.getDay() || 7;
    const monday = addDays(base, 1 - weekDay);
    return { start: formatInputDate(monday), end: formatInputDate(addDays(monday, 6)) };
  }
  return { start: today(), end: today() };
}
