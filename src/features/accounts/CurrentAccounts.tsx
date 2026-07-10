import { useEffect, useState } from "react";
import type { AccountMovement, AppData, CurrentAccount, Local, Role, User } from "../../types";
import { accountLedgerRows, accountTotalsFromMovements } from "../../lib/accountMovements";
import { balanceForMovement, balanceReferenceLabel } from "../../lib/balanceReferences";
import { accountKindLabel } from "../../lib/currentAccounts";
import { formatDateTime, monthRange } from "../../lib/dates";
import { balanceVisibleId } from "../../lib/display";
import { money } from "../../lib/money";
import { historicalYearOptions, periodForMode, periodRange, type MonthlyPeriodMode } from "../../lib/periods";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { Modal } from "../../components/ui";
import { MonthlyPeriodSelector } from "../../components/MonthlyPeriodSelector";
import { ClosedBalanceSummary } from "../cashier/ClosedBalanceSummary";
import { EmptyState } from "../layout/AppShell";

type AccountMovementColumn = "createdAt" | "sourceType" | "detail" | "user" | "debit" | "credit" | "balance";

type LedgerRow = {
  movement: AccountMovement;
  debit: number;
  credit: number;
  balance: number;
  userName: string;
};

export function AdminCurrentAccounts({ data, user, effectiveRole, local }: { data: AppData; user: User; effectiveRole: Role; local: Local }) {
  const [query, setQuery] = useState("");
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [showMovementBalance, setShowMovementBalance] = useState(false);
  const [movementSort, setMovementSort] = useState<SortState<AccountMovementColumn>>({ key: "createdAt", direction: "desc" });
  const currentRange = monthRange(0);
  const previousRange = monthRange(-1);
  const currentPeriod = currentRange.start.slice(0, 7);
  const previousPeriod = previousRange.start.slice(0, 7);
  const [periodMode, setPeriodMode] = useState<MonthlyPeriodMode>("current");
  const [customMonth, setCustomMonth] = useState(currentPeriod.slice(5, 7));
  const [customYear, setCustomYear] = useState(currentPeriod.slice(0, 4));
  const selectedPeriod = periodForMode(periodMode, currentPeriod, previousPeriod, customMonth, customYear);
  const activeRange = periodRange(selectedPeriod);
  const availableYears = historicalYearOptions(
    currentPeriod,
    previousPeriod,
    ...data.accountMovements.map((movement) => movement.createdAt),
    ...data.balances.map((balance) => String(balance.closedAt ?? balance.operatingDate)),
  );
  const scopedLocalIds = effectiveRole === "ENCARGADO" ? (user.localIds.length ? user.localIds : [local.id]) : data.locals.map((item) => item.id);
  const scopedLocalSet = new Set(scopedLocalIds);
  const accountInScope = (account: CurrentAccount) => {
    if (account.kind === "PERSONAL") return false;
    if (effectiveRole !== "ENCARGADO") return true;
    if (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") return Boolean(account.entityId && scopedLocalSet.has(account.entityId));
    return account.kind === "TRANSFERENCIAS";
  };
  const movementInScope = (movement: AccountMovement) => {
    const account = data.currentAccounts.find((item) => item.id === movement.accountId);
    if (!account || account.kind === "PERSONAL") return false;
    if (effectiveRole !== "ENCARGADO") return true;
    const balance = movement.balanceId ? data.balances.find((item) => item.id === movement.balanceId) : undefined;
    if (balance) return scopedLocalSet.has(balance.localId);
    if (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") return Boolean(account.entityId && scopedLocalSet.has(account.entityId));
    return false;
  };
  const movementInRange = (movement: AccountMovement) => {
    const movementDate = movement.createdAt.slice(0, 10);
    return (!activeRange.start || movementDate >= activeRange.start) && (!activeRange.end || movementDate <= activeRange.end);
  };
  const visibleMovements = data.accountMovements.filter((movement) => movementInScope(movement) && movementInRange(movement));
  const totalsForVisibleAccount = (accountId: string) => accountTotalsFromMovements(visibleMovements.filter((movement) => movement.accountId === accountId));
  const openingBalanceForAccount = (accountId: string) =>
    activeRange.start
      ? data.accountMovements
          .filter((movement) => movementInScope(movement) && movement.accountId === accountId && movement.status === "ACTIVO" && movement.createdAt.slice(0, 10) < activeRange.start)
          .reduce((total, movement) => total + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount), 0)
      : 0;
  const closingBalanceForAccount = (accountId: string) => {
    const totals = totalsForVisibleAccount(accountId);
    return openingBalanceForAccount(accountId) + totals.income - totals.outcome;
  };
  const normalizedQuery = query.trim().toLowerCase();
  const scopedAccounts = data.currentAccounts.filter(accountInScope);
  const accounts = [...scopedAccounts]
    .filter((account) =>
      normalizedQuery
        ? [account.name, account.kind, account.status, account.entityId ?? ""].join(" ").toLowerCase().includes(normalizedQuery)
        : true,
    )
    .sort((a, b) => accountKindLabel(a.kind).localeCompare(accountKindLabel(b.kind), "es-UY") || a.name.localeCompare(b.name, "es-UY"));
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  useEffect(() => {
    if (!accounts.length) {
      if (selectedAccountId !== null) setSelectedAccountId(null);
      return;
    }
    if (!selectedAccountId || !accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts.map((account) => account.id).join("|"), selectedAccountId]);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];
  const selectedTotals = selectedAccount ? totalsForVisibleAccount(selectedAccount.id) : { income: 0, outcome: 0, balance: 0, count: 0 };
  const movements = selectedAccount
    ? visibleMovements
        .filter((movement) => movement.accountId === selectedAccount.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const openingBalance =
    selectedAccount && activeRange.start
      ? data.accountMovements
          .filter((movement) => movementInScope(movement) && movement.accountId === selectedAccount.id && movement.status === "ACTIVO" && movement.createdAt.slice(0, 10) < activeRange.start)
          .reduce((total, movement) => total + (movement.direction === "ENTRADA" ? movement.amount : -movement.amount), 0)
      : 0;
  const ledgerRows = accountLedgerRows(movements, openingBalance)
    .map((row) => ({
      ...row,
      userName: data.users.find((item) => item.id === row.movement.userId)?.name ?? row.movement.userId,
    }))
    .reverse();
  const sortedLedgerRows = [...ledgerRows].sort((a, b) => {
    const valueFor = (row: LedgerRow) => {
      if (movementSort.key === "createdAt") return row.movement.createdAt;
      if (movementSort.key === "sourceType") return row.movement.sourceType;
      if (movementSort.key === "detail") return row.movement.detail || row.movement.concept || "";
      if (movementSort.key === "user") return row.userName;
      if (movementSort.key === "debit") return row.debit;
      if (movementSort.key === "credit") return row.credit;
      return row.balance;
    };
    const result = compareValues(valueFor(a), valueFor(b));
    return movementSort.direction === "asc" ? result : -result;
  });
  const selectedMovementRow = ledgerRows.find((row) => row.movement.id === selectedMovementId);
  const selectedMovement = selectedMovementRow?.movement ?? null;
  const selectedMovementBalance = balanceForMovement(data, selectedMovement);
  const sortMovement = (key: AccountMovementColumn) => setMovementSort((current) => nextSort(current, key));

  return (
    <section className="admin-focus detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Libro interno de empleados, transferencias y cuentas por local en efectivo/banco.</p>
        </div>
        <div className="admin-header-actions">
          <span>{accounts.length} cuentas</span>
          <span>{visibleMovements.length} movimientos</span>
        </div>
      </div>

      <MonthlyPeriodSelector
        mode={periodMode}
        currentPeriod={currentPeriod}
        previousPeriod={previousPeriod}
        customMonth={customMonth}
        customYear={customYear}
        yearOptions={availableYears}
        onModeChange={setPeriodMode}
        onCustomMonthChange={setCustomMonth}
        onCustomYearChange={setCustomYear}
        selectedPeriod={selectedPeriod}
      />

      <div className="accounts-layout">
        <aside className="accounts-list-panel">
          <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cuenta..." />
          <div className="account-selector-list">
            {accounts.map((account) => {
              const closingBalance = closingBalanceForAccount(account.id);
              return (
                <button
                  key={account.id}
                  className={account.id === selectedAccount?.id ? "account-selector active" : "account-selector"}
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <span>{accountKindLabel(account.kind)}</span>
                  <strong>{account.name}</strong>
                  <small>Saldo final {money(closingBalance)}</small>
                </button>
              );
            })}
            {!accounts.length && <div className="empty-recent-cash">No hay cuentas para mostrar.</div>}
          </div>
        </aside>

        <section className="account-detail-panel">
          {selectedAccount ? (
            <>
              <div className="section-toolbar close-cash-toolbar">
                <div>
                  <h2>{selectedAccount.name}</h2>
                  <p>
                    {accountKindLabel(selectedAccount.kind)} - {selectedAccount.status}
                  </p>
                </div>
                <span className="close-status-pill">{selectedTotals.count} movimientos activos</span>
              </div>
              <div className="account-summary-grid four">
                <div>
                  <span>Saldo anterior</span>
                  <strong>{money(openingBalance)}</strong>
                </div>
                <div>
                  <span>Entradas</span>
                  <strong>{money(selectedTotals.income)}</strong>
                </div>
                <div>
                  <span>Salidas</span>
                  <strong>{money(selectedTotals.outcome)}</strong>
                </div>
                <div>
                  <span>Saldo final</span>
                  <strong>{money(openingBalance + selectedTotals.income - selectedTotals.outcome)}</strong>
                </div>
              </div>
              <div className="table-wrap grow">
                <table className="data-table admin-data-table">
                  <thead>
                    <tr>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("createdAt")}>
                          Fecha {sortIndicator(movementSort, "createdAt")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("sourceType")}>
                          Tipo {sortIndicator(movementSort, "sourceType")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("detail")}>
                          Detalle {sortIndicator(movementSort, "detail")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("user")}>
                          Usuario {sortIndicator(movementSort, "user")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("debit")}>
                          Debito {sortIndicator(movementSort, "debit")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("credit")}>
                          Credito {sortIndicator(movementSort, "credit")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-button" type="button" onClick={() => sortMovement("balance")}>
                          Saldo {sortIndicator(movementSort, "balance")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLedgerRows.map(({ movement, debit, credit, balance, userName }) => (
                      <tr
                        key={movement.id}
                        className={movement.status === "ANULADO" ? "status-inactive clickable-row" : "clickable-row"}
                        onClick={() => {
                          setSelectedMovementId(movement.id);
                          setShowMovementBalance(false);
                        }}
                      >
                        <td>{formatDateTime(movement.createdAt)}</td>
                        <td>{movement.sourceType}</td>
                        <td>{movement.detail || movement.concept || "-"}</td>
                        <td>{userName}</td>
                        <td>{debit ? money(debit) : "-"}</td>
                        <td>{credit ? money(credit) : "-"}</td>
                        <td>{money(balance)}</td>
                      </tr>
                    ))}
                    {!sortedLedgerRows.length && (
                      <tr>
                        <td colSpan={7}>No hay movimientos para esta cuenta.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState title="Sin cuentas" text="Todavia no hay cuentas corrientes para mostrar." />
          )}
        </section>
      </div>
      {selectedMovement && (
        <Modal
          title={showMovementBalance ? `Recaudacion ${selectedMovementBalance ? balanceVisibleId(data, selectedMovementBalance) : ""}` : "Detalle de movimiento"}
          onClose={() => {
            setSelectedMovementId(null);
            setShowMovementBalance(false);
          }}
          wide
        >
          {showMovementBalance && selectedMovementBalance ? (
            <ClosedBalanceSummary data={data} balance={selectedMovementBalance} />
          ) : (
            <div className="movement-detail-modal">
              <div className="account-summary-grid">
                <div>
                  <span>Debito</span>
                  <strong>{selectedMovementRow?.debit ? money(selectedMovementRow.debit) : "-"}</strong>
                </div>
                <div>
                  <span>Credito</span>
                  <strong>{selectedMovementRow?.credit ? money(selectedMovementRow.credit) : "-"}</strong>
                </div>
                <div>
                  <span>Saldo</span>
                  <strong>{money(selectedMovementRow?.balance)}</strong>
                </div>
              </div>
              <dl className="summary-detail-list">
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatDateTime(selectedMovement.createdAt)}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{selectedMovement.sourceType}</dd>
                </div>
                <div>
                  <dt>Concepto</dt>
                  <dd>{selectedMovement.concept || "-"}</dd>
                </div>
                <div>
                  <dt>Detalle</dt>
                  <dd>{selectedMovement.detail || "-"}</dd>
                </div>
                <div>
                  <dt>Usuario</dt>
                  <dd>{data.users.find((item) => item.id === selectedMovement.userId)?.name ?? selectedMovement.userId}</dd>
                </div>
                <div>
                  <dt>Direccion original</dt>
                  <dd>{selectedMovement.direction}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{selectedMovement.status}</dd>
                </div>
                <div>
                  <dt>Recaudacion asociada</dt>
                  <dd>{balanceReferenceLabel(data, selectedMovementBalance)}</dd>
                </div>
              </dl>
              {selectedMovementBalance && (
                <div className="button-row end">
                  <button className="button primary compact" type="button" onClick={() => setShowMovementBalance(true)}>
                    Ver recaudacion completa
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
