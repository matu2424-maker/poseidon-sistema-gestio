import { useEffect, useState, type FormEvent } from "react";
import type {
  AccountMovement,
  AppData,
  CurrentAccount,
  FinancialMedium,
  Local,
  Partner,
  PartnerMovementType,
  Role,
  TreasuryTransferType,
  User,
} from "../../types";
import { accountLedgerRows, accountTotalsFromMovements } from "../../lib/accountMovements";
import { balanceForMovement, balanceReferenceLabel } from "../../lib/balanceReferences";
import { accountKindLabel } from "../../lib/currentAccounts";
import { formatDateTime, monthRange } from "../../lib/dates";
import { balanceVisibleId } from "../../lib/display";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, parseMoneyInput } from "../../lib/money";
import { historicalYearOptions, periodForMode, periodRange, type MonthlyPeriodMode } from "../../lib/periods";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { Modal } from "../../components/ui";
import { MonthlyPeriodSelector } from "../../components/MonthlyPeriodSelector";
import { ClosedBalanceSummary } from "../cashier/ClosedBalanceSummary";
import { EmptyState } from "../../components/EmptyState";
import { commandContext } from "../../application/command";
import {
  annulPartnerMovementCommand,
  annulTreasuryTransferCommand,
  createPartnerMovementCommand,
  createTreasuryTransferCommand,
} from "../../application/treasury/treasuryCommands";
import { confirmAction } from "../../lib/confirmations";

type AccountMovementColumn = "createdAt" | "sourceType" | "detail" | "user" | "debit" | "credit" | "balance";

type LedgerRow = {
  movement: AccountMovement;
  debit: number;
  credit: number;
  balance: number;
  userName: string;
};

export function AdminCurrentAccounts({
  data,
  user,
  effectiveRole,
  local,
  patchData,
  setMessage,
}: {
  data: AppData;
  user: User;
  effectiveRole: Role;
  local: Local;
  patchData: (updater: (current: AppData) => AppData) => void;
  setMessage: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [showMovementBalance, setShowMovementBalance] = useState(false);
  const [movementSort, setMovementSort] = useState<SortState<AccountMovementColumn>>({ key: "createdAt", direction: "desc" });
  const [operation, setOperation] = useState<"TREASURY" | "PARTNER" | null>(null);
  const [operationError, setOperationError] = useState("");
  const [annulReason, setAnnulReason] = useState("");
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
    return ["TRANSFERENCIAS", "PRINCIPAL_EFECTIVO", "PRINCIPAL_BANCO", "SOCIO"].includes(account.kind);
  };
  const movementInScope = (movement: AccountMovement) => {
    const account = data.currentAccounts.find((item) => item.id === movement.accountId);
    if (!account || account.kind === "PERSONAL") return false;
    if (effectiveRole !== "ENCARGADO") return true;
    if (movement.localId) return scopedLocalSet.has(movement.localId);
    const balance = movement.balanceId ? data.balances.find((item) => item.id === movement.balanceId) : undefined;
    if (balance) return scopedLocalSet.has(balance.localId);
    if (account.kind === "LOCAL_EFECTIVO" || account.kind === "LOCAL_BANCO") return Boolean(account.entityId && scopedLocalSet.has(account.entityId));
    return ["TRANSFERENCIAS", "PRINCIPAL_EFECTIVO", "PRINCIPAL_BANCO", "SOCIO"].includes(account.kind);
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
  const accountGroups = [
    { label: "Caja", accounts: accounts.filter((account) => ["LOCAL_EFECTIVO", "LOCAL_BANCO"].includes(account.kind)) },
    { label: "Principal", accounts: accounts.filter((account) => ["PRINCIPAL_EFECTIVO", "PRINCIPAL_BANCO"].includes(account.kind)) },
    { label: "Socios", accounts: accounts.filter((account) => account.kind === "SOCIO") },
    { label: "Otras", accounts: accounts.filter((account) => account.kind === "TRANSFERENCIAS") },
  ].filter((group) => group.accounts.length > 0);
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
  const activeBalance = data.balances.find((balance) => balance.localId === local.id && balance.status === "EN_PROCESO");

  const saveTreasuryTransfer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOperationError("");
    const form = new FormData(event.currentTarget);
    patchData((current) => {
      const currentOpenBalance = current.balances.find(
        (balance) => balance.localId === local.id && balance.status === "EN_PROCESO",
      );
      const result = createTreasuryTransferCommand(
        current,
        {
          localId: local.id,
          balanceId: currentOpenBalance?.id,
          type: String(form.get("type") ?? "") as TreasuryTransferType,
          medium: String(form.get("medium") ?? "EFECTIVO") as FinancialMedium,
          timing: "OPERATIVO",
          amount: parseMoneyInput(form.get("amount")),
          note: String(form.get("note") ?? ""),
        },
        commandContext(user, effectiveRole),
      );
      if (!result.ok) {
        setOperationError(result.error);
        return current;
      }
      setMessage("Traspaso entre Caja y Principal registrado.");
      setOperation(null);
      return result.data;
    });
  };

  const savePartnerMovement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOperationError("");
    const form = new FormData(event.currentTarget);
    patchData((current) => {
      const result = createPartnerMovementCommand(
        current,
        {
          localId: local.id,
          partner: String(form.get("partner") ?? "") as Partner,
          type: String(form.get("type") ?? "") as PartnerMovementType,
          medium: String(form.get("medium") ?? "EFECTIVO") as FinancialMedium,
          amount: parseMoneyInput(form.get("amount")),
          note: String(form.get("note") ?? ""),
        },
        commandContext(user, effectiveRole),
      );
      if (!result.ok) {
        setOperationError(result.error);
        return current;
      }
      setMessage(result.value.type === "APORTE_SOCIO" ? "Aporte de socio registrado." : "Retiro de socio registrado.");
      setOperation(null);
      return result.data;
    });
  };

  const selectedSourceCanBeAnnulled = Boolean(
    selectedMovement && ["TRASPASO_CAJA", "APORTE_SOCIO", "RETIRO_SOCIO"].includes(selectedMovement.sourceType),
  );
  const selectedSourceStatus = selectedMovement
    ? selectedMovement.sourceType === "TRASPASO_CAJA"
      ? data.treasuryTransfers.find((transfer) => transfer.id === selectedMovement.sourceId)?.status
      : ["APORTE_SOCIO", "RETIRO_SOCIO"].includes(selectedMovement.sourceType)
        ? data.partnerMovements.find((movement) => movement.id === selectedMovement.sourceId)?.status
        : undefined
    : undefined;
  const annulSelectedMovement = () => {
    if (!selectedMovement || !selectedSourceCanBeAnnulled) return;
    const reason = annulReason.trim();
    if (!reason) {
      setOperationError("La anulacion requiere un motivo.");
      return;
    }
    if (!confirmAction("Anular este movimiento? Se registrara un reverso auditado.")) return;
    patchData((current) => {
      const result =
        selectedMovement.sourceType === "TRASPASO_CAJA"
          ? annulTreasuryTransferCommand(current, selectedMovement.sourceId, commandContext(user, effectiveRole), reason)
          : annulPartnerMovementCommand(current, selectedMovement.sourceId, commandContext(user, effectiveRole), reason);
      if (!result.ok) {
        setOperationError(result.error);
        return current;
      }
      setMessage("Movimiento anulado mediante reverso auditado.");
      setSelectedMovementId(null);
      setAnnulReason("");
      setOperationError("");
      return result.data;
    });
  };

  return (
    <section className="admin-focus detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Caja, Principal y cuentas patrimoniales de socios en pesos uruguayos.</p>
        </div>
        <div className="admin-header-actions">
          <span>{accounts.length} cuentas</span>
          <span>{visibleMovements.length} movimientos</span>
          <button className="button primary compact" type="button" onClick={() => setOperation("TREASURY")}>
            Mover fondos
          </button>
          <button className="button secondary compact" type="button" onClick={() => setOperation("PARTNER")}>
            Movimiento de socio
          </button>
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
            {accountGroups.map((group) => (
              <section className="account-selector-group" key={group.label} aria-label={`Cuentas ${group.label}`}>
                <h3>{group.label}</h3>
                {group.accounts.map((account) => {
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
              </section>
            ))}
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
                      <th aria-sort={ariaSort(movementSort, "createdAt")}>
                        <button className="sort-button" type="button" onClick={() => sortMovement("createdAt")}>
                          Fecha {sortIndicator(movementSort, "createdAt")}
                        </button>
                      </th>
                      <th aria-sort={ariaSort(movementSort, "sourceType")}>
                        <button className="sort-button" type="button" onClick={() => sortMovement("sourceType")}>
                          Tipo {sortIndicator(movementSort, "sourceType")}
                        </button>
                      </th>
                      <th aria-sort={ariaSort(movementSort, "detail")}>
                        <button className="sort-button" type="button" onClick={() => sortMovement("detail")}>
                          Detalle {sortIndicator(movementSort, "detail")}
                        </button>
                      </th>
                      <th aria-sort={ariaSort(movementSort, "user")}>
                        <button className="sort-button" type="button" onClick={() => sortMovement("user")}>
                          Usuario {sortIndicator(movementSort, "user")}
                        </button>
                      </th>
                      <th aria-sort={ariaSort(movementSort, "debit")}>
                        <button className="sort-button" type="button" onClick={() => sortMovement("debit")}>
                          Debito {sortIndicator(movementSort, "debit")}
                        </button>
                      </th>
                      <th aria-sort={ariaSort(movementSort, "credit")}>
                        <button className="sort-button" type="button" onClick={() => sortMovement("credit")}>
                          Credito {sortIndicator(movementSort, "credit")}
                        </button>
                      </th>
                      <th aria-sort={ariaSort(movementSort, "balance")}>
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
                        tabIndex={0}
                        aria-label={`Ver detalle de ${movement.detail || movement.concept || "movimiento"}`}
                        onClick={() => {
                          setSelectedMovementId(movement.id);
                          setShowMovementBalance(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
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
            setAnnulReason("");
            setOperationError("");
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
              {selectedSourceCanBeAnnulled && selectedSourceStatus === "ACTIVO" && (
                <div className="form-grid movement-annul-form">
                  {operationError && <p className="validation error span-2">{operationError}</p>}
                  <label className="span-2">
                    Motivo de anulacion
                    <textarea value={annulReason} onChange={(event) => setAnnulReason(event.target.value)} rows={2} />
                  </label>
                  <div className="form-actions span-2">
                    <div className="button-row end">
                      <button className="button danger compact" type="button" onClick={annulSelectedMovement}>
                        Anular movimiento
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
      {operation === "TREASURY" && (
        <Modal
          title="Mover fondos entre Caja y Principal"
          onClose={() => {
            setOperation(null);
            setOperationError("");
          }}
          wide
        >
          <form className="form-grid" onSubmit={saveTreasuryTransfer}>
            {operationError && <p className="validation error span-2">{operationError}</p>}
            <label>
              Movimiento
              <select name="type" defaultValue="" required>
                <option value="" disabled>Seleccionar</option>
                <option value="RETIRO_CAJA">Caja a Principal</option>
                <option value="APORTE_CAJA">Principal a Caja</option>
              </select>
            </label>
            <label>
              Medio
              <select name="medium" defaultValue="EFECTIVO">
                <option value="EFECTIVO">Efectivo</option>
                <option value="BANCO">Banco</option>
              </select>
            </label>
            <label>
              Monto
              <input name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </label>
            <label>
              Caja asociada
              <input value={activeBalance ? balanceVisibleId(data, activeBalance) : "Sin caja abierta"} disabled readOnly />
            </label>
            <label className="span-2">
              Nota
              <input name="note" placeholder="Detalle opcional" />
            </label>
            <p className="helper span-2">Es un traspaso interno: no modifica el resultado economico.</p>
            <div className="form-actions span-2">
              <div className="button-row end">
                <button className="button muted" type="button" onClick={() => setOperation(null)}>Cancelar</button>
                <button className="button success" type="submit">Registrar traspaso</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {operation === "PARTNER" && (
        <Modal
          title="Aporte o retiro de socio"
          onClose={() => {
            setOperation(null);
            setOperationError("");
          }}
          wide
        >
          <form className="form-grid" onSubmit={savePartnerMovement}>
            {operationError && <p className="validation error span-2">{operationError}</p>}
            <label>
              Socio
              <select name="partner" defaultValue="" required>
                <option value="" disabled>Seleccionar</option>
                <option value="MATHIAS">Mathias</option>
                <option value="RICARDO">Ricardo</option>
              </select>
            </label>
            <label>
              Movimiento patrimonial
              <select name="type" defaultValue="" required>
                <option value="" disabled>Seleccionar</option>
                <option value="APORTE_SOCIO">Aporte de socio</option>
                <option value="RETIRO_SOCIO">Retiro de socio</option>
              </select>
            </label>
            <label>
              Medio
              <select name="medium" defaultValue="EFECTIVO">
                <option value="EFECTIVO">Efectivo</option>
                <option value="BANCO">Banco</option>
              </select>
            </label>
            <label>
              Monto
              <input name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </label>
            <label className="span-2">
              Nota
              <input name="note" placeholder="Motivo o referencia" />
            </label>
            <p className="helper span-2">El movimiento actualiza Principal y la cuenta del socio. No es ganancia ni perdida.</p>
            <div className="form-actions span-2">
              <div className="button-row end">
                <button className="button muted" type="button" onClick={() => setOperation(null)}>Cancelar</button>
                <button className="button success" type="submit">Registrar movimiento</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
