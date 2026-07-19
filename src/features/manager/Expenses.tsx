import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AppData, Balance, Expense, ExpenseReviewStatus, MovementStatus, Role, User } from "../../types";
import { formatDateTime } from "../../lib/dates";
import { balanceVisibleId, localName, userDisplayName } from "../../lib/display";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, parseMoneyInput } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { InfoCard, Modal, type TableColumn } from "../../components/ui";
import { confirmAction } from "../../lib/confirmations";
import { readUploadFile } from "../../lib/files";
import {
  PRINCIPAL_BANK_ACCOUNT_ID,
  PRINCIPAL_CASH_ACCOUNT_ID,
  principalAccountBalances,
} from "../../lib/currentAccounts";
import { commandContext } from "../../application/command";
import { createPrincipalExpenseCommand } from "../../application/expenses/principalExpenseCommands";
import {
  annulManagedExpenseCommand,
  reviewExpenseCommand,
} from "../../application/expenses/expenseReviewCommands";

type ExpenseRow = { expense: Expense; balance?: Balance };
type ExpenseColumnKey =
  | "createdAt"
  | "balance"
  | "local"
  | "account"
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
  { key: "balance", label: "Recaudacion", sortable: true },
  { key: "local", label: "Local", sortable: true },
  { key: "account", label: "Cuenta", sortable: true },
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
  actorRole = user.role,
  patchData,
  setMessage,
}: {
  data: AppData;
  user: User;
  actorRole?: Role;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit?: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const activeCategories = data.expenseCategories.filter((category) => category.status === "ACTIVA");
  const [selectedCategoryId, setSelectedCategoryId] = useState(activeCategories[0]?.id ?? "");
  const selectedCategory = activeCategories.find((category) => category.id === selectedCategoryId) ?? activeCategories[0];
  const availableLocals = data.locals.filter(
    (item) => item.status === "ACTIVO" && (user.role === "ADMINISTRADOR" || user.localIds.includes(item.id)),
  );
  const [createLocalId, setCreateLocalId] = useState(availableLocals[0]?.id ?? "");
  const principalBalances = principalAccountBalances(data);
  const allowedLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const rows: ExpenseRow[] = data.expenses
    .map((expense) => {
      const balance = data.balances.find((item) => item.id === expense.balanceId);
      return { expense, balance };
    })
    .filter((row) => {
      return !allowedLocalIds || allowedLocalIds.has(row.expense.localId);
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
        balance ? balanceVisibleId(data, balance) : "Principal",
        localName(data, expense.localId),
        data.currentAccounts.find((account) => account.id === expense.paymentAccountId)?.name,
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
  const activeCashierTotal = rows
    .filter(({ expense }) => expense.status === "ACTIVO" && ![PRINCIPAL_CASH_ACCOUNT_ID, PRINCIPAL_BANK_ACCOUNT_ID].includes(expense.paymentAccountId))
    .reduce((total, { expense }) => total + expense.amount, 0);
  const activePrincipalTotal = rows
    .filter(({ expense }) => expense.status === "ACTIVO" && [PRINCIPAL_CASH_ACCOUNT_ID, PRINCIPAL_BANK_ACCOUNT_ID].includes(expense.paymentAccountId))
    .reduce((total, { expense }) => total + expense.amount, 0);
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

  const createExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    const form = new FormData(event.currentTarget);
    const receiptFile = form.get("receiptFile");
    const uploadedReceipt = receiptFile instanceof File && receiptFile.size > 0 ? readUploadFile(receiptFile) : undefined;
    patchData((current) => {
      const result = createPrincipalExpenseCommand(
        current,
        {
          localId: createLocalId,
          paymentAccountId: String(form.get("paymentAccountId") ?? PRINCIPAL_CASH_ACCOUNT_ID),
          category: selectedCategory?.name ?? "",
          subcategory: String(form.get("subcategory") ?? ""),
          amount: parseMoneyInput(form.get("amount")),
          description: String(form.get("description") ?? ""),
          receiptFileName: uploadedReceipt?.name,
          receiptFileType: uploadedReceipt?.type,
        },
        commandContext(user, actorRole),
      );
      if (!result.ok) {
        setCreateError(result.error);
        return current;
      }
      setMessage("Gasto registrado desde la cuenta Principal.");
      setCreateOpen(false);
      return result.data;
    });
  };

  const saveReview = () => {
    if (!selectedRow) return;
    const note = draftReviewNote.trim();
    if (draftReviewStatus === "OBSERVADO" && !note) {
      setError("Para observar un gasto tenes que escribir una observacion.");
      return;
    }
    patchData((current) => {
      const result = reviewExpenseCommand(
        current,
        { expenseId: selectedRow.expense.id, status: draftReviewStatus, note },
        commandContext(user, actorRole),
      );
      if (!result.ok) {
        setError(result.error);
        return current;
      }
      setMessage("Gasto revisado y auditado.");
      setError("");
      return result.data;
    });
  };

  const annulExpense = () => {
    if (!selectedRow) return;
    const note = draftReviewNote.trim();
    if (!note) {
      setError("Para anular un gasto tenes que escribir el motivo.");
      return;
    }
    if (!confirmAction("Anular este gasto? El movimiento queda auditado y no se borra.")) return;
    patchData((current) => {
      const result = annulManagedExpenseCommand(
        current,
        selectedRow.expense.id,
        note,
        commandContext(user, actorRole),
      );
      if (!result.ok) {
        setError(result.error);
        return current;
      }
      setMessage("Gasto anulado y auditado.");
      setSelectedExpenseId(null);
      setError("");
      return result.data;
    });
  };

  return (
    <section className="admin-focus manager-expenses-page detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Revision completa por caja, categoria, comprobante, usuario y estado. No se borra historial operativo.</p>
        </div>
        <div className="admin-header-actions">
          <span>{rows.length} gasto(s)</span>
          <button className="button primary compact" type="button" onClick={() => setCreateOpen(true)}>
            Agregar gasto
          </button>
        </div>
      </div>
      <div className="card-grid four cashier-status-grid">
        <InfoCard tone="blue" title="Gastos desde Caja" lines={[money(activeCashierTotal), "Asociados a recaudacion"]} />
        <InfoCard tone="green" title="Gastos desde Principal" lines={[money(activePrincipalTotal), "Efectivo y banco principal"]} />
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
        <Modal
          title={selectedRow.balance ? `Gasto ${balanceVisibleId(data, selectedRow.balance)}` : "Gasto desde Principal"}
          onClose={() => setSelectedExpenseId(null)}
          wide
        >
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
                `Caja: ${selectedRow.balance ? balanceVisibleId(data, selectedRow.balance) : "Sin caja asociada"}`,
                `Local: ${localName(data, selectedRow.expense.localId)}`,
                `Cuenta: ${data.currentAccounts.find((account) => account.id === selectedRow.expense.paymentAccountId)?.name ?? "-"}`,
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
      {createOpen && (
        <Modal
          title="Agregar gasto desde Principal"
          onClose={() => {
            setCreateOpen(false);
            setCreateError("");
          }}
          wide
        >
          <form className="form-grid" onSubmit={createExpense}>
            {createError && <p className="validation error span-2">{createError}</p>}
            <label>
              Local
              <select value={createLocalId} onChange={(event) => setCreateLocalId(event.target.value)} required>
                {availableLocals.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select
                value={selectedCategory?.id ?? ""}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                required
              >
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategoria
              <select name="subcategory" required>
                {(selectedCategory?.subcategories ?? []).map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cuenta de pago
              <select name="paymentAccountId" defaultValue={PRINCIPAL_CASH_ACCOUNT_ID}>
                <option value={PRINCIPAL_CASH_ACCOUNT_ID}>Principal / Efectivo - {money(principalBalances.cash)}</option>
                <option value={PRINCIPAL_BANK_ACCOUNT_ID}>Principal / Banco - {money(principalBalances.bank)}</option>
              </select>
            </label>
            <label>
              Monto
              <input
                name="amount"
                inputMode="numeric"
                defaultValue="0"
                onFocus={handleMoneyFocus}
                onChange={handleMoneyInput}
                onBlur={handleMoneyBlur}
                required
              />
            </label>
            <label className="span-2">
              Descripcion
              <input name="description" placeholder="Descripcion opcional" />
            </label>
            <label className="span-2">
              Comprobante
              <input name="receiptFile" type="file" accept="image/*,.pdf,application/pdf" />
            </label>
            <div className="form-actions span-2">
              <div className="button-row end">
                <button className="button muted" type="button" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </button>
                <button className="button success" type="submit" disabled={!activeCategories.length}>
                  Guardar gasto
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
  if (key === "balance") return balance ? balanceVisibleId(data, balance) : "Sin recaudacion";
  if (key === "local") return localName(data, expense.localId);
  if (key === "account") return data.currentAccounts.find((account) => account.id === expense.paymentAccountId)?.name ?? "";
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
  if (key === "balance") return balance ? balanceVisibleId(data, balance) : "Sin recaudacion";
  if (key === "local") return localName(data, expense.localId);
  if (key === "account") return data.currentAccounts.find((account) => account.id === expense.paymentAccountId)?.name ?? "-";
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
