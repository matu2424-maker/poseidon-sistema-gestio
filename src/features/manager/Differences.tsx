import { ReactNode, useState } from "react";
import type { AppData, Balance, DifferenceStatus, User } from "../../types";
import { formatDateTime, monthRange } from "../../lib/dates";
import { balanceHasDifference, bankDifferenceForBalance, cashDifferenceForBalance, differenceActionImpact, differenceIsPending } from "../../lib/differences";
import { formatMoneyInput, money, moneyInputValue, normalizeMoneyInput, parseMoneyInput } from "../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { historicalYearOptions, periodForMode, periodRange, type MonthlyPeriodMode } from "../../lib/periods";
import { MonthlyPeriodSelector } from "../../components/MonthlyPeriodSelector";
import { commandContext } from "../../application/command";
import { manageDifferenceCommand } from "../../application/differences/manageDifference";
import { confirmAction } from "../../lib/confirmations";

type DifferenceDraft = { status: DifferenceStatus | ""; note: string; correctedCash?: string; correctedBank?: string };
type DifferenceStatusFilter = DifferenceStatus | "TODAS" | "GESTIONADAS";
type DifferenceSortKey = "id" | "operatingDate" | "local" | "cashDifference" | "bankDifference" | "status" | "lastReview";

type DifferencesProps = {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  setMessage: (message: string) => void;
};

const localName = (data: AppData, localId: string) =>
  data.locals.find((local) => local.id === localId)?.name ?? (localId === "taller" ? "Taller" : localId);

const localCode = (name: string) => (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "CAJA");

const balanceVisibleId = (data: AppData, balance: Balance) => balance.visibleId ?? `${localCode(localName(data, balance.localId))}-${balance.id.slice(-4)}`;

const userDisplayName = (data: AppData, userId: string | undefined) => (userId ? data.users.find((item) => item.id === userId)?.name ?? userId : "-");

const parseAuditValue = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

function InfoCard({
  title,
  lines,
  tone,
}: {
  title: string;
  lines: string[];
  tone: "blue" | "green" | "orange" | "red";
}) {
  return (
    <article className={`info-card ${tone}`}>
      <h3>{title}</h3>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function Modal({
  title,
  children,
  onClose,
  closeLabel = "Cerrar",
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={wide ? "modal-card wide" : "modal-card"} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="button muted compact" type="button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Differences({ data, user, patchData, setMessage }: DifferencesProps) {
  const [drafts, setDrafts] = useState<Record<string, DifferenceDraft>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DifferenceStatusFilter>("TODAS");
  const [sort, setSort] = useState<SortState<DifferenceSortKey>>({ key: "operatingDate", direction: "desc" });
  const currentRange = monthRange(0);
  const previousRange = monthRange(-1);
  const currentPeriod = currentRange.start.slice(0, 7);
  const previousPeriod = previousRange.start.slice(0, 7);
  const [periodMode, setPeriodMode] = useState<MonthlyPeriodMode>("current");
  const [customMonth, setCustomMonth] = useState(currentPeriod.slice(5, 7));
  const [customYear, setCustomYear] = useState(currentPeriod.slice(0, 4));
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const canManage = user.role === "ADMINISTRADOR" || user.role === "ENCARGADO";
  const visibleLocalIds = user.role === "ADMINISTRADOR" ? null : new Set(user.localIds);
  const selectedPeriod = periodForMode(periodMode, currentPeriod, previousPeriod, customMonth, customYear);
  const activeRange = periodRange(selectedPeriod);
  const availableYears = historicalYearOptions(
    currentPeriod,
    previousPeriod,
    ...data.balances.map((balance) => String(balance.closedAt ?? balance.operatingDate)),
  );
  const balanceDate = (balance: Balance) => String(balance.closedAt ?? balance.operatingDate).slice(0, 10);
  const balanceInRange = (balance: Balance) => (!activeRange.start || balanceDate(balance) >= activeRange.start) && (!activeRange.end || balanceDate(balance) <= activeRange.end);
  const balanceHasDifferenceHistory = (balance: Balance) =>
    balanceHasDifference(data, balance) || Boolean(balance.differenceStatus || balance.differenceNote || balance.differenceReviewNote || balance.differenceReviewedAt);
  const allBalances = data.balances
    .filter(
      (balance) =>
        balance.status === "CERRADO" &&
        balanceInRange(balance) &&
        balanceHasDifferenceHistory(balance) &&
        (!visibleLocalIds || visibleLocalIds.has(balance.localId)),
    )
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)));
  const normalizedQuery = query.trim().toLocaleLowerCase("es-UY");
  const differenceSortValue = (balance: Balance, key: DifferenceSortKey): string | number => {
    if (key === "id") return balanceVisibleId(data, balance);
    if (key === "operatingDate") return balance.closedAt ?? balance.operatingDate;
    if (key === "local") return localName(data, balance.localId);
    if (key === "cashDifference") return cashDifferenceForBalance(data, balance);
    if (key === "bankDifference") return bankDifferenceForBalance(balance);
    if (key === "status") return balance.differenceStatus ?? "PENDIENTE";
    return `${balance.differenceReviewedAt ?? ""} ${balance.differenceReviewNote ?? ""}`;
  };
  const balances = allBalances
    .filter((balance) => {
      const status = balance.differenceStatus ?? "PENDIENTE";
      const matchesStatus =
        statusFilter === "TODAS" ||
        (statusFilter === "GESTIONADAS" ? status !== "PENDIENTE" : status === statusFilter);
      const searchable = [
        balanceVisibleId(data, balance),
        balance.operatingDate,
        localName(data, balance.localId),
        status,
        balance.differenceNote ?? "",
        balance.differenceReviewNote ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("es-UY");
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    })
    .sort((a, b) => {
      const result = compareValues(differenceSortValue(a, sort.key), differenceSortValue(b, sort.key));
      return sort.direction === "asc" ? result : -result;
    });
  const selectedBalance = selectedBalanceId ? allBalances.find((balance) => balance.id === selectedBalanceId) : undefined;
  const emptyDraft: DifferenceDraft = { status: "", note: "" };
  const selectedDraft: DifferenceDraft = selectedBalance ? drafts[selectedBalance.id] ?? emptyDraft : emptyDraft;
  const pending = allBalances.filter(differenceIsPending).length;
  const managed = allBalances.length - pending;
  const totalCashDifference = allBalances.reduce((total, balance) => total + cashDifferenceForBalance(data, balance), 0);
  const totalBankDifference = allBalances.reduce((total, balance) => total + bankDifferenceForBalance(balance), 0);
  const totalDifference = totalCashDifference + totalBankDifference;
  const selectedHistory = selectedBalance
    ? data.audit
        .filter(
          (event) =>
            event.entityId === selectedBalance.id &&
            ["DiferenciaCaja", "BalanceDiario", "Caja"].includes(event.entity),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const openDifference = (id: string) => {
    setError("");
    setSelectedBalanceId(id);
  };
  const closeDifference = () => {
    setError("");
    setSelectedBalanceId(null);
  };
  const updateDraft = (id: string, patch: Partial<DifferenceDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        status: current[id]?.status ?? "",
        note: current[id]?.note ?? "",
        correctedCash: current[id]?.correctedCash,
        correctedBank: current[id]?.correctedBank,
        ...patch,
      },
    }));
    setError("");
  };
  const changeDraftStatus = (balance: Balance, status: DifferenceStatus | "") => {
    updateDraft(balance.id, {
      status,
      ...(status === "CORREGIDA"
        ? {
            correctedCash: moneyInputValue(balance.declaredCash ?? 0),
            correctedBank: moneyInputValue(balance.declaredBank ?? balance.nextBankBase ?? 0),
          }
        : {}),
    });
  };
  const update = (id: string) => {
    const draft = drafts[id] ?? { status: "", note: "" };
    const status = draft.status;
    const reviewNote = draft.note.trim();
    if (!status || status === "PENDIENTE") {
      setError("Selecciona una accion de gestion para la diferencia.");
      return;
    }
    if (!reviewNote) {
      setError("La observacion del encargado/admin es obligatoria.");
      return;
    }
    const confirmation =
      status === "VERIFICADA"
        ? "Confirmar que la diferencia es real? El saldo declarado se mantiene y la accion queda auditada."
        : status === "CORREGIDA"
          ? "Confirmar la correccion? Se actualizaran los importes declarados y las cuentas del local."
          : "Confirmar la anulacion? Se revertira el impacto de la diferencia en las cuentas del local.";
    if (!confirmAction(confirmation)) return;
    patchData((current) => {
      const result = manageDifferenceCommand(
        current,
        {
          balanceId: id,
          status,
          reviewNote,
          correctedCash: status === "CORREGIDA" ? parseMoneyInput(draft.correctedCash ?? "") : undefined,
          correctedBank: status === "CORREGIDA" ? parseMoneyInput(draft.correctedBank ?? "") : undefined,
        },
        commandContext(user, user.role),
      );
      if (!result.ok) {
        setError(result.error);
        return current;
      }
      setDrafts((draftsCurrent) => ({ ...draftsCurrent, [id]: { status: "", note: "" } }));
      setMessage("Diferencia gestionada y auditada.");
      setSelectedBalanceId(null);
      setError("");
      return result.data;
    });
  };
  const rowClass = (balance: Balance) => {
    const status = balance.differenceStatus ?? "PENDIENTE";
    if (status === "PENDIENTE") return "status-error";
    if (status === "CORREGIDA") return "status-maintenance";
    if (status === "ANULADA") return "status-inactive";
    return "status-active";
  };

  return (
    <section className="admin-focus differences-page detail-card-surface">
      <div className="admin-header">
        <div>
          <p className="helper">Las diferencias no modifican el resultado economico. Se revisan y quedan auditadas por encargado o administrador.</p>
        </div>
        <div className="admin-header-actions">
          <span>{balances.length} control(es)</span>
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
        className="differences-period-bar"
        rangeClassName="differences-date-range"
      />
      <div className="card-grid four difference-summary-grid">
        <InfoCard tone={pending > 0 ? "red" : "green"} title="Pendientes" lines={[`${pending}`, "Requieren gestion"]} />
        <InfoCard tone={totalCashDifference === 0 ? "green" : "red"} title="Diferencia efectivo" lines={[money(totalCashDifference), "Cuenta efectivo"]} />
        <InfoCard tone={totalBankDifference === 0 ? "green" : "red"} title="Diferencia banco" lines={[money(totalBankDifference), "Cuenta banco"]} />
        <InfoCard tone={managed > 0 ? "blue" : "orange"} title="Gestionadas" lines={[`${managed}`, `Total ${money(totalDifference)}`]} />
      </div>
      <p className="helper difference-impact-helper">Las diferencias mueven efectivo/banco del local para que la proxima caja abra con saldo real. No cambian el resultado economico.</p>
      <div className="difference-toolbar">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ID, local, fecha u observacion..." />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DifferenceStatusFilter)}>
          <option value="PENDIENTE">Pendientes</option>
          <option value="GESTIONADAS">Gestionadas</option>
          <option value="TODAS">Todas</option>
          <option value="VERIFICADA">Verificadas</option>
          <option value="CORREGIDA">Corregidas</option>
          <option value="ANULADA">Anuladas</option>
        </select>
        <span>{activeRange.start} al {activeRange.end}</span>
      </div>
      {error && !selectedBalance ? <p className="validation error">{error}</p> : null}
      <div className="table-wrap">
        <table className="data-table difference-table">
          <thead>
            <tr>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "id"))}>Caja{sortIndicator(sort, "id")}</button></th>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "operatingDate"))}>Fecha{sortIndicator(sort, "operatingDate")}</button></th>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "local"))}>Local{sortIndicator(sort, "local")}</button></th>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "cashDifference"))}>Efectivo{sortIndicator(sort, "cashDifference")}</button></th>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "bankDifference"))}>Banco{sortIndicator(sort, "bankDifference")}</button></th>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "status"))}>Estado{sortIndicator(sort, "status")}</button></th>
              <th><button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, "lastReview"))}>Ultima gestion{sortIndicator(sort, "lastReview")}</button></th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => {
              const cashDifference = cashDifferenceForBalance(data, balance);
              const bankDifference = bankDifferenceForBalance(balance);
              const declaredCash = balance.declaredCash ?? 0;
              const expectedCash = declaredCash - cashDifference;
              const declaredBank = balance.declaredBank ?? balance.nextBankBase ?? 0;
              const expectedBank = declaredBank - bankDifference;
              return (
                <tr key={balance.id} className={`${rowClass(balance)} clickable-row`} onClick={() => openDifference(balance.id)}>
                  <td>{balanceVisibleId(data, balance)}</td>
                  <td>{balance.operatingDate}</td>
                  <td>{localName(data, balance.localId)}</td>
                  <td className="difference-money-cell">
                    <strong className={cashDifference === 0 ? "money-positive" : "money-negative"}>{money(cashDifference)}</strong>
                    <span>Esp. {money(expectedCash)} / Dec. {money(declaredCash)}</span>
                  </td>
                  <td className="difference-money-cell">
                    <strong className={bankDifference === 0 ? "money-positive" : "money-negative"}>{money(bankDifference)}</strong>
                    <span>Esp. {money(expectedBank)} / Dec. {money(declaredBank)}</span>
                  </td>
                  <td><span className={`status-pill ${rowClass(balance)}`}>{balance.differenceStatus ?? "PENDIENTE"}</span></td>
                  <td className="long-cell">
                    {balance.differenceReviewNote ? (
                      <>
                        <strong>{userDisplayName(data, balance.differenceReviewedBy)}</strong>
                        <span>{balance.differenceReviewedAt ? ` - ${formatDateTime(balance.differenceReviewedAt)}` : ""}</span>
                        <p>{balance.differenceReviewNote}</p>
                      </>
                    ) : (
                      "Sin gestion"
                    )}
                  </td>
                  <td>
                    <button className="button primary compact" type="button" onClick={(event) => { event.stopPropagation(); openDifference(balance.id); }}>
                      Gestionar
                    </button>
                  </td>
                </tr>
              );
            })}
            {!balances.length && (
              <tr>
                <td colSpan={8}>No hay historial de diferencias o controles para el periodo seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedBalance && (
        <Modal title={`Diferencia ${balanceVisibleId(data, selectedBalance)}`} onClose={closeDifference} wide>
          {(() => {
            const cashDifference = cashDifferenceForBalance(data, selectedBalance);
            const bankDifference = bankDifferenceForBalance(selectedBalance);
            const declaredCash = selectedBalance.declaredCash ?? 0;
            const expectedCash = declaredCash - cashDifference;
            const declaredBank = selectedBalance.declaredBank ?? selectedBalance.nextBankBase ?? 0;
            const expectedBank = declaredBank - bankDifference;
            const correctedCashDraft = selectedDraft.correctedCash ?? moneyInputValue(declaredCash);
            const correctedBankDraft = selectedDraft.correctedBank ?? moneyInputValue(declaredBank);
            const correctedCash = parseMoneyInput(correctedCashDraft);
            const correctedBank = parseMoneyInput(correctedBankDraft);
            const correctedCashDifference = correctedCash - expectedCash;
            const correctedBankDifference = correctedBank - expectedBank;
            return (
              <div className="difference-detail-modal">
                <div className="difference-detail-compact">
                  <div className="difference-detail-context">
                    <div><span>Local</span><strong>{localName(data, selectedBalance.localId)}</strong></div>
                    <div><span>Fecha</span><strong>{selectedBalance.operatingDate}</strong></div>
                    <div><span>Estado</span><strong>{selectedBalance.differenceStatus ?? "PENDIENTE"}</strong></div>
                    <div><span>Gestion</span><strong>{selectedBalance.differenceReviewedAt ? formatDateTime(selectedBalance.differenceReviewedAt) : "Sin gestion"}</strong></div>
                  </div>
                  <div className="difference-detail-metrics">
                    <div><span>Efectivo esperado</span><strong>{money(expectedCash)}</strong></div>
                    <div><span>Efectivo declarado</span><strong>{money(selectedBalance.declaredCash)}</strong></div>
                    <div><span>Diferencia efectivo</span><strong className={cashDifference === 0 ? "money-positive" : "money-negative"}>{money(cashDifference)}</strong></div>
                    <div><span>Banco esperado</span><strong>{money(expectedBank)}</strong></div>
                    <div><span>Banco declarado</span><strong>{money(declaredBank)}</strong></div>
                    <div><span>Diferencia banco</span><strong className={bankDifference === 0 ? "money-positive" : "money-negative"}>{money(bankDifference)}</strong></div>
                  </div>
                  <div className="difference-detail-notes">
                    <div><span>Observacion cierre</span><p>{selectedBalance.differenceNote || "-"}</p></div>
                    <div><span>Ultima gestion</span><p>{selectedBalance.differenceReviewNote ? `${userDisplayName(data, selectedBalance.differenceReviewedBy)} - ${selectedBalance.differenceReviewNote}` : "Sin gestion"}</p></div>
                  </div>
                </div>
                <section className="embedded-panel difference-modal-panel">
                  <div className="section-toolbar">
                    <div>
                      <h3>Gestion de diferencia</h3>
                      <p>La accion queda auditada. Verificar o corregir mantiene el saldo real declarado; anular revierte los movimientos de diferencia.</p>
                    </div>
                  </div>
                  {error ? <p className="validation error">{error}</p> : null}
                  <div className="difference-review-form modal-form">
                    <select value={selectedDraft.status} onChange={(event) => changeDraftStatus(selectedBalance, event.target.value as DifferenceStatus | "")} disabled={!canManage}>
                      <option value="">Elegir accion</option>
                      <option value="VERIFICADA">Verificar diferencia</option>
                      <option value="CORREGIDA">Marcar como corregida</option>
                      <option value="ANULADA">Anular diferencia</option>
                    </select>
                    <p className="difference-impact-note">{differenceActionImpact(selectedDraft.status)}</p>
                    {selectedDraft.status === "CORREGIDA" ? (
                      <div className="difference-correction-grid">
                        <label>
                          Efectivo declarado corregido
                          <input
                            inputMode="numeric"
                            value={correctedCashDraft}
                            onFocus={(event) => {
                              if (parseMoneyInput(event.currentTarget.value) === 0) updateDraft(selectedBalance.id, { correctedCash: "" });
                            }}
                            onChange={(event) => updateDraft(selectedBalance.id, { correctedCash: formatMoneyInput(event.target.value) })}
                            onBlur={(event) => updateDraft(selectedBalance.id, { correctedCash: normalizeMoneyInput(event.currentTarget.value) })}
                            disabled={!canManage}
                          />
                          <span>Nueva diferencia: {money(correctedCashDifference)}</span>
                        </label>
                        <label>
                          Dinero en banco declarado corregido
                          <input
                            inputMode="numeric"
                            value={correctedBankDraft}
                            onFocus={(event) => {
                              if (parseMoneyInput(event.currentTarget.value) === 0) updateDraft(selectedBalance.id, { correctedBank: "" });
                            }}
                            onChange={(event) => updateDraft(selectedBalance.id, { correctedBank: formatMoneyInput(event.target.value) })}
                            onBlur={(event) => updateDraft(selectedBalance.id, { correctedBank: normalizeMoneyInput(event.currentTarget.value) })}
                            disabled={!canManage}
                          />
                          <span>Nueva diferencia: {money(correctedBankDifference)}</span>
                        </label>
                      </div>
                    ) : null}
                    <textarea value={selectedDraft.note} onChange={(event) => updateDraft(selectedBalance.id, { note: event.target.value })} placeholder="Observacion obligatoria" disabled={!canManage} />
                    <div className="button-row end">
                      <button className="button muted compact" type="button" onClick={closeDifference}>Cerrar</button>
                      <button className="button primary compact" type="button" onClick={() => update(selectedBalance.id)} disabled={!canManage}>Guardar gestion</button>
                    </div>
                  </div>
                </section>
                <section className="embedded-panel difference-history-panel">
                  <div className="section-toolbar">
                    <div>
                      <h3>Historial completo</h3>
                      <p>Eventos auditados de cierre, revision, correccion o anulacion de esta recaudacion.</p>
                    </div>
                  </div>
                  <div className="difference-history-list">
                    {selectedHistory.map((event) => {
                      const parsedValue = parseAuditValue(event.newValue);
                      const statusValue = typeof parsedValue.status === "string" ? parsedValue.status : "";
                      const cashBefore = typeof parsedValue.cashDifferenceBefore === "number" ? parsedValue.cashDifferenceBefore : undefined;
                      const cashAfter = typeof parsedValue.cashDifferenceAfter === "number" ? parsedValue.cashDifferenceAfter : undefined;
                      const bankBefore = typeof parsedValue.bankDifferenceBefore === "number" ? parsedValue.bankDifferenceBefore : undefined;
                      const bankAfter = typeof parsedValue.bankDifferenceAfter === "number" ? parsedValue.bankDifferenceAfter : undefined;
                      return (
                        <article className="difference-history-item" key={event.id}>
                          <div>
                            <strong>{event.action}</strong>
                            <span>{formatDateTime(event.createdAt)} - {event.userName ?? userDisplayName(data, event.userId)}</span>
                          </div>
                          <p>{event.reason || statusValue || "Sin observacion"}</p>
                          {cashBefore !== undefined || bankBefore !== undefined ? (
                            <p>
                              Efectivo: {money(cashBefore ?? 0)} a {money(cashAfter ?? 0)} - Banco: {money(bankBefore ?? 0)} a {money(bankAfter ?? 0)}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                    {!selectedHistory.length ? <p className="helper">Sin eventos auditados para esta recaudacion.</p> : null}
                  </div>
                </section>
              </div>
            );
          })()}
        </Modal>
      )}
    </section>
  );
}
