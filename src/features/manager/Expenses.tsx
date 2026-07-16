import { useEffect, useState, type ReactNode } from "react";
import type { AppData, Balance, Expense, ExpenseReviewStatus, MovementStatus, User } from "../../types";
import { formatDateTime, nowIso } from "../../lib/dates";
import { balanceVisibleId, localName, userDisplayName } from "../../lib/display";
import { money } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { InfoCard, Modal, type TableColumn } from "../../components/ui";
import { reverseSourceAccountMovements } from "../../lib/accountMovements";
import { historicalCashMutationError } from "../../lib/cashAvailability";
import { confirmAction } from "../../lib/confirmations";

type ExpenseRow = { expense: Expense; balance: Balance };
type ExpenseColumnKey =
  | "createdAt"
  | "balance"
  | "local"
  | "category"
  | "subcategory"
  | "description"
  | "receipt"
  | "amount"
  | "user"
  | "status"
  | "review"
  | "actions";

const expenseColumns: TableColumn<ExpenseColumnKey>[] = [
  { key: "createdAt", label: "Fecha", sortable: true },
  { key: "balance", label: "Caja", sortable: true },
  { key: "local", label: "Local", sortable: true },
  { key: "category", label: "Categoria", sortable: true },
  { key: "subcategory", label: "Subcategoria", sortable: true },
  { key: "description", label: "Descripcion", sortable: true },
  { key: "receipt", label: "Comprobante", sortable: true },
  { key: "amount", label: "Monto", sortable: true },
  { key: "user", label: "Usuario", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "review", label: "Revision", sortable: true },
  { key: "actions", label: "Acciones" },
];

export function ManagerExpenses({
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
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ExpenseReviewStatus | "TODOS">("TODOS");
  const [statusFilter, setStatusFilter] = useState<MovementStatus | "TODOS">("TODOS");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [draftReviewStatus, setDraftReviewStatus] = useState<ExpenseReviewStatus>("REVISADO");
  const [draftReviewNote, setDraftReviewNote] = useState("");
  const [sort, setSort] = useState<SortState<ExpenseColumnKey>>({ key: "createdAt", direction: "desc" });
  const [error, setError] = useState("");
  const allowedLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const rows: ExpenseRow[] = data.expenses
    .map((expense) => {
      const balance = data.balances.find((item) => item.id === expense.balanceId);
      return balance ? { expense, balance } : null;
    })
    .filter((row): row is ExpenseRow => {
      if (!row) return false;
      return !allowedLocalIds || allowedLocalIds.has(row.balance.localId);
    });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows
    .filter(({ expense, balance }) => {
      const reviewStatus = expense.reviewStatus ?? "PENDIENTE";
      if (reviewFilter !== "TODOS" && reviewStatus !== reviewFilter) return false;
      if (statusFilter !== "TODOS" && expense.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [
        expense.category,
        expense.subcategory,
        expense.description,
        expense.receiptFileName,
        expense.receipt,
        balanceVisibleId(data, balance),
        localName(data, balance.localId),
        userDisplayName(data, expense.userId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((a, b) => {
      const result = compareValues(expenseSortValue(data, a, sort.key), expenseSortValue(data, b, sort.key));
      return sort.direction === "asc" ? result : -result;
    });
  const selectedRow = rows.find(({ expense }) => expense.id === selectedExpenseId) ?? null;
  const activeTotal = rows.filter(({ expense }) => expense.status === "ACTIVO").reduce((total, { expense }) => total + expense.amount, 0);
  const pendingCount = rows.filter(({ expense }) => expense.status === "ACTIVO" && (expense.reviewStatus ?? "PENDIENTE") === "PENDIENTE").length;
  const observedCount = rows.filter(({ expense }) => expense.status === "ACTIVO" && expense.reviewStatus === "OBSERVADO").length;
  const reviewedCount = rows.filter(({ expense }) => expense.status === "ACTIVO" && expense.reviewStatus === "REVISADO").length;

  useEffect(() => {
    if (!selectedRow) return;
    setDraftReviewStatus(selectedRow.expense.reviewStatus === "OBSERVADO" ? "OBSERVADO" : "REVISADO");
    setDraftReviewNote(selectedRow.expense.reviewNote ?? "");
    setError("");
  }, [selectedRow?.expense.id]);

  const reviewClass = (expense: Expense) => {
    const reviewStatus = expense.reviewStatus ?? "PENDIENTE";
    if (expense.status === "ANULADO") return "status-inactive";
    if (reviewStatus === "OBSERVADO") return "status-error";
    if (reviewStatus === "REVISADO") return "status-active";
    return "status-maintenance";
  };

  const reviewPill = (expense: Expense) => {
    const reviewStatus = expense.reviewStatus ?? "PENDIENTE";
    const className = reviewStatus === "REVISADO" ? "ok" : reviewStatus === "OBSERVADO" ? "danger" : "warning";
    return <span className={`status-pill ${className}`}>{reviewStatus}</span>;
  };

  const saveReview = () => {
    if (!selectedRow) return;
    const note = draftReviewNote.trim();
    if (draftReviewStatus === "OBSERVADO" && !note) {
      setError("Para observar un gasto tenes que escribir una observacion.");
      return;
    }
    const reviewedAt = nowIso();
    patchData((current) => {
      const previous = current.expenses.find((expense) => expense.id === selectedRow.expense.id);
      const expenses = current.expenses.map((expense) =>
        expense.id === selectedRow.expense.id
          ? {
              ...expense,
              reviewStatus: draftReviewStatus,
              reviewedBy: user.id,
              reviewedAt,
              reviewNote: note,
            }
          : expense,
      );
      const next = expenses.find((expense) => expense.id === selectedRow.expense.id);
      return audit({ ...current, expenses }, "Revisar gasto", "Gasto", selectedRow.expense.id, previous, next, note);
    });
    setMessage("Gasto revisado y auditado.");
    setError("");
  };

  const annulExpense = () => {
    if (!selectedRow) return;
    const note = draftReviewNote.trim();
    if (!note) {
      setError("Para anular un gasto tenes que escribir el motivo.");
      return;
    }
    const mutationError = historicalCashMutationError(
      data,
      selectedRow.balance.localId,
      selectedRow.balance.id,
    );
    if (mutationError) {
      setError(mutationError);
      return;
    }
    if (!confirmAction("Anular este gasto? El movimiento queda auditado y no se borra.")) return;
    const reviewedAt = nowIso();
    patchData((current) => {
      const previous = current.expenses.find((expense) => expense.id === selectedRow.expense.id);
      const expenses = current.expenses.map((expense) =>
        expense.id === selectedRow.expense.id
          ? {
              ...expense,
              status: "ANULADO" as MovementStatus,
              reviewStatus: "OBSERVADO" as ExpenseReviewStatus,
              reviewedBy: user.id,
              reviewedAt,
              reviewNote: note,
            }
          : expense,
      );
      const accountMovements = reverseSourceAccountMovements(
        current.accountMovements,
        ["GASTO"],
        selectedRow.expense.id,
        user.id,
        note,
        reviewedAt,
      );
      const next = expenses.find((expense) => expense.id === selectedRow.expense.id);
      return audit({ ...current, expenses, accountMovements }, "Anular gasto encargado", "Gasto", selectedRow.expense.id, previous, next, note);
    });
    setMessage("Gasto anulado y auditado.");
    setSelectedExpenseId(null);
    setError("");
  };

  return (
    <section className="admin-focus manager-expenses-page detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Revision completa por caja, categoria, comprobante, usuario y estado. No se borra historial operativo.</p>
        </div>
        <div className="admin-header-actions">
          <span>{rows.length} gasto(s)</span>
        </div>
      </div>
      <div className="card-grid three cashier-status-grid">
        <InfoCard tone="green" title="Gastos activos" lines={[money(activeTotal), `${rows.filter(({ expense }) => expense.status === "ACTIVO").length} movimiento(s)`]} />
        <InfoCard tone={pendingCount > 0 ? "orange" : "green"} title="Pendientes" lines={[`${pendingCount} pendiente(s)`, "Requieren revision"]} />
        <InfoCard tone={observedCount > 0 ? "red" : "blue"} title="Control" lines={[`${reviewedCount} revisado(s)`, `${observedCount} observado(s)`]} />
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar gasto, caja, local, usuario..." />
        <label className="compact-filter">
          Revision
          <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ExpenseReviewStatus | "TODOS")}>
            <option value="TODOS">Todas</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="REVISADO">Revisado</option>
            <option value="OBSERVADO">Observado</option>
          </select>
        </label>
        <label className="compact-filter">
          Estado
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MovementStatus | "TODOS")}>
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </label>
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table manager-expenses-table">
          <thead>
            <tr>
              {expenseColumns.map((column) => (
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
            {filteredRows.map((row) => (
              <tr key={row.expense.id} className={reviewClass(row.expense)}>
                {expenseColumns.map((column) => (
                  <td key={column.key}>{renderExpenseCell(data, row, column.key, reviewPill, setSelectedExpenseId)}</td>
                ))}
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={expenseColumns.length}>No hay gastos para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedRow && (
        <Modal title={`Gasto ${balanceVisibleId(data, selectedRow.balance)}`} onClose={() => setSelectedExpenseId(null)} wide>
          <div className="detail-grid">
            <InfoCard
              tone={selectedRow.expense.status === "ACTIVO" ? "blue" : "red"}
              title="Movimiento"
              variant="cash"
              lines={[
                `*Monto: ${money(selectedRow.expense.amount)}`,
                `Categoria: ${selectedRow.expense.category || "-"}`,
                `Subcategoria: ${selectedRow.expense.subcategory || "-"}`,
                `Estado: ${selectedRow.expense.status}`,
              ]}
            />
            <InfoCard
              tone="green"
              title="Origen"
              variant="cash"
              lines={[
                `Caja: ${balanceVisibleId(data, selectedRow.balance)}`,
                `Local: ${localName(data, selectedRow.balance.localId)}`,
                `Usuario: ${userDisplayName(data, selectedRow.expense.userId)}`,
                `Fecha: ${formatDateTime(selectedRow.expense.createdAt)}`,
              ]}
            />
            <InfoCard
              tone={(selectedRow.expense.reviewStatus ?? "PENDIENTE") === "OBSERVADO" ? "red" : "orange"}
              title="Revision"
              variant="cash"
              lines={[
                `Estado: ${selectedRow.expense.reviewStatus ?? "PENDIENTE"}`,
                `Revisado por: ${userDisplayName(data, selectedRow.expense.reviewedBy)}`,
                `Fecha: ${selectedRow.expense.reviewedAt ? formatDateTime(selectedRow.expense.reviewedAt) : "-"}`,
              ]}
            />
          </div>
          <dl className="summary-detail-list">
            <div>
              <dt>Descripcion</dt>
              <dd>{selectedRow.expense.description || "-"}</dd>
            </div>
            <div>
              <dt>Comprobante</dt>
              <dd>{selectedRow.expense.receiptFileName || selectedRow.expense.receipt || "-"}</dd>
            </div>
            <div>
              <dt>Tipo archivo</dt>
              <dd>{selectedRow.expense.receiptFileType || "-"}</dd>
            </div>
            <div>
              <dt>Observacion revision</dt>
              <dd>{selectedRow.expense.reviewNote || "-"}</dd>
            </div>
          </dl>
          {error && <p className="validation error">{error}</p>}
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              Estado de revision
              <select value={draftReviewStatus} onChange={(event) => setDraftReviewStatus(event.target.value as ExpenseReviewStatus)}>
                <option value="REVISADO">Revisado</option>
                <option value="OBSERVADO">Observado</option>
                <option value="PENDIENTE">Pendiente</option>
              </select>
            </label>
            <label className="span-2">
              Observacion / motivo
              <textarea rows={3} value={draftReviewNote} onChange={(event) => setDraftReviewNote(event.target.value)} placeholder="Obligatorio si se observa o se anula." />
            </label>
            <div className="form-actions span-2">
              <div className="button-row end">
                <button className="button success" type="button" onClick={saveReview}>
                  Guardar revision
                </button>
                <button className="button danger" type="button" onClick={annulExpense} disabled={selectedRow.expense.status === "ANULADO"}>
                  Anular gasto
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function expenseSortValue(data: AppData, row: ExpenseRow, key: ExpenseColumnKey): string | number {
  const { expense, balance } = row;
  if (key === "createdAt") return expense.createdAt;
  if (key === "balance") return balanceVisibleId(data, balance);
  if (key === "local") return localName(data, balance.localId);
  if (key === "category") return expense.category || "";
  if (key === "subcategory") return expense.subcategory || "";
  if (key === "description") return expense.description || "";
  if (key === "receipt") return expense.receiptFileName || expense.receipt || "";
  if (key === "amount") return expense.amount;
  if (key === "user") return userDisplayName(data, expense.userId);
  if (key === "status") return expense.status;
  if (key === "review") return expense.reviewStatus ?? "PENDIENTE";
  return "";
}

function renderExpenseCell(
  data: AppData,
  row: ExpenseRow,
  key: ExpenseColumnKey,
  reviewPill: (expense: Expense) => ReactNode,
  setSelectedExpenseId: (id: string) => void,
) {
  const { expense, balance } = row;
  if (key === "createdAt") return formatDateTime(expense.createdAt);
  if (key === "balance") return balanceVisibleId(data, balance);
  if (key === "local") return localName(data, balance.localId);
  if (key === "category") return expense.category || "-";
  if (key === "subcategory") return expense.subcategory || "-";
  if (key === "description") return <span className="long-cell">{expense.description || "-"}</span>;
  if (key === "receipt") return expense.receiptFileName || expense.receipt || "-";
  if (key === "amount") return money(expense.amount);
  if (key === "user") return userDisplayName(data, expense.userId);
  if (key === "status") return expense.status;
  if (key === "review") return reviewPill(expense);
  return (
    <button className="button primary compact" type="button" onClick={() => setSelectedExpenseId(expense.id)}>
      Ver detalle
    </button>
  );
}
