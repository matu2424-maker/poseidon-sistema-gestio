import { FormEvent, useEffect, useState } from "react";
import type { AppData, Balance, CapitalMovementPerson, Local, Screen, User } from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { localAccountBalances } from "../../lib/currentAccounts";
import { today, formatTime } from "../../lib/dates";
import { balanceVisibleId } from "../../lib/display";
import { bankDifferenceForBalance, cashDifferenceForBalance, differenceIsPending } from "../../lib/differences";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, moneyInputValue, parseMoneyInput } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { ClosedBalanceSummary } from "./ClosedBalanceSummary";

const CAPITAL_PEOPLE: CapitalMovementPerson[] = ["RICARDO", "MATHIAS"];

type RecentCashColumn = "id" | "operatingDate" | "schedule" | "commercialResult" | "declaredCash" | "cashDifference" | "bankDifference" | "differenceStatus" | "machines";

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function OpenCash({
  data,
  user,
  local,
  openBalance,
  setScreen,
  save,
  summaryOnly = false,
  hideHeading = false,
}: {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  setScreen: (screen: Screen) => void;
  summaryOnly?: boolean;
  hideHeading?: boolean;
  save: (
    date: string,
    initialFund: number,
    initialBankFund: number,
    note: string,
    openingCapitalPerson: CapitalMovementPerson,
    firstOpening: boolean,
  ) => void;
}) {
  const localBalances = localAccountBalances(data, local.id);
  const showSummaryOnly = summaryOnly || Boolean(openBalance);
  const firstOpening = !data.balances.some((balance) => balance.localId === local.id);
  const [recentSort, setRecentSort] = useState<SortState<RecentCashColumn>>({ key: "operatingDate", direction: "desc" });
  const recentClosedSource = data.balances
    .filter((balance) => balance.localId === local.id && balance.status === "CERRADO")
    .sort((a, b) => String(b.closedAt ?? b.operatingDate).localeCompare(String(a.closedAt ?? a.operatingDate)))
    .slice(0, 10);
  const recentSortValue = (balance: Balance, key: RecentCashColumn): string | number => {
    if (key === "id") return balanceVisibleId(data, balance);
    if (key === "operatingDate") return balance.closedAt ?? balance.operatingDate;
    if (key === "schedule") return `${balance.openedAt ?? ""} ${balance.closedAt ?? ""}`;
    if (key === "commercialResult") return totalsForBalance(data, balance.id).commercialResult;
    if (key === "declaredCash") return balance.declaredCash ?? 0;
    if (key === "cashDifference") return cashDifferenceForBalance(data, balance);
    if (key === "bankDifference") return bankDifferenceForBalance(balance);
    if (key === "differenceStatus") {
      const hasDifference =
        cashDifferenceForBalance(data, balance) !== 0 ||
        bankDifferenceForBalance(balance) !== 0 ||
        Boolean(balance.differenceStatus || balance.differenceNote || balance.differenceReviewNote || balance.differenceReviewedAt);
      return hasDifference ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIF.";
    }
    const loaded = data.readings.filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA").length;
    const totalReadings = data.readings.filter((reading) => reading.balanceId === balance.id).length;
    return totalReadings ? loaded / totalReadings : 0;
  };
  const recentClosedBalances = [...recentClosedSource].sort((a, b) => {
    const result = compareValues(recentSortValue(a, recentSort.key), recentSortValue(b, recentSort.key));
    return recentSort.direction === "asc" ? result : -result;
  });
  const recentClosedIds = recentClosedBalances.map((balance) => balance.id).join("|");
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(recentClosedBalances[0]?.id ?? null);
  const selectedBalance = recentClosedBalances.find((balance) => balance.id === selectedBalanceId) ?? recentClosedBalances[0];
  useEffect(() => {
    const ids = recentClosedIds ? recentClosedIds.split("|") : [];
    if (!ids.length) {
      if (selectedBalanceId !== null) setSelectedBalanceId(null);
      return;
    }
    if (!selectedBalanceId || !ids.includes(selectedBalanceId)) {
      setSelectedBalanceId(ids[0]);
    }
  }, [recentClosedIds, selectedBalanceId]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const initialFund = firstOpening ? parseMoneyInput(form.get("initialFund")) : localBalances.cash;
    const initialBankFund = firstOpening ? parseMoneyInput(form.get("initialBankFund")) : localBalances.bank;
    save(
      String(form.get("operatingDate")),
      initialFund,
      initialBankFund,
      String(form.get("initialNote") ?? ""),
      String(form.get("openingCapitalPerson") ?? "MATHIAS") as CapitalMovementPerson,
      firstOpening,
    );
  };
  const recentCashesPanel = (
    <aside className="recent-cashes-panel recent-cashes-wide">
      <div>
        <h3>Ultimas cajas cerradas</h3>
        <p>Selecciona una caja para ver el resumen en pantalla.</p>
      </div>
      {recentClosedBalances.length ? (
        <div className="table-wrap">
          <table className="data-table recent-cash-table">
            <thead>
              <tr>
                <th aria-sort={ariaSort(recentSort, "id")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "id"))}>ID{sortIndicator(recentSort, "id")}</button></th>
                <th aria-sort={ariaSort(recentSort, "operatingDate")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "operatingDate"))}>Fecha{sortIndicator(recentSort, "operatingDate")}</button></th>
                <th aria-sort={ariaSort(recentSort, "schedule")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "schedule"))}>Horario{sortIndicator(recentSort, "schedule")}</button></th>
                <th aria-sort={ariaSort(recentSort, "commercialResult")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "commercialResult"))}>Resultado final{sortIndicator(recentSort, "commercialResult")}</button></th>
                <th aria-sort={ariaSort(recentSort, "declaredCash")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "declaredCash"))}>Declarado{sortIndicator(recentSort, "declaredCash")}</button></th>
                <th aria-sort={ariaSort(recentSort, "cashDifference")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "cashDifference"))}>Dif. efectivo{sortIndicator(recentSort, "cashDifference")}</button></th>
                <th aria-sort={ariaSort(recentSort, "bankDifference")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "bankDifference"))}>Dif. banco{sortIndicator(recentSort, "bankDifference")}</button></th>
                <th aria-sort={ariaSort(recentSort, "differenceStatus")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "differenceStatus"))}>Estado dif.{sortIndicator(recentSort, "differenceStatus")}</button></th>
                <th aria-sort={ariaSort(recentSort, "machines")}><button className="sort-button" type="button" onClick={() => setRecentSort((current) => nextSort(current, "machines"))}>Maquinas{sortIndicator(recentSort, "machines")}</button></th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {recentClosedBalances.map((balance) => {
                const totals = totalsForBalance(data, balance.id);
                const recalculatedDifference = cashDifferenceForBalance(data, balance);
                const bankDifference = bankDifferenceForBalance(balance);
                const hasDifference = recalculatedDifference !== 0 || bankDifference !== 0;
                const hasDifferenceControl =
                  hasDifference || Boolean(balance.differenceStatus || balance.differenceNote || balance.differenceReviewNote || balance.differenceReviewedAt);
                const loaded = data.readings.filter((reading) => reading.balanceId === balance.id && reading.status === "CARGADA").length;
                const totalReadings = data.readings.filter((reading) => reading.balanceId === balance.id).length;
                const selected = balance.id === selectedBalance?.id;
                return (
                  <tr key={balance.id} className={selected ? "status-selected" : undefined}>
                    <td>{balanceVisibleId(data, balance)}</td>
                    <td>{balance.operatingDate}</td>
                    <td>
                      {formatTime(balance.openedAt)} - {formatTime(balance.closedAt)}
                    </td>
                    <td className={totals.commercialResult >= 0 ? "money-positive" : "money-negative"}>{money(totals.commercialResult)}</td>
                    <td>{money(balance.declaredCash)}</td>
                    <td className={recalculatedDifference === 0 ? "money-positive" : "money-negative"}>{money(recalculatedDifference)}</td>
                    <td className={bankDifference === 0 ? "money-positive" : "money-negative"}>{money(bankDifference)}</td>
                    <td>
                      <span className={`status-pill ${hasDifferenceControl && differenceIsPending(balance) ? "danger" : hasDifferenceControl ? "warning" : "ok"}`}>
                        {hasDifferenceControl ? balance.differenceStatus ?? "PENDIENTE" : "SIN DIF."}
                      </span>
                    </td>
                    <td>
                      {loaded}/{totalReadings}
                    </td>
                    <td>
                      <button className="button primary tiny" type="button" onClick={() => setSelectedBalanceId(balance.id)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-recent-cash">Todavia no hay cajas cerradas para mostrar.</div>
      )}
    </aside>
  );

  return (
    <section className="admin-focus open-cash-page">
      <div className="admin-header">
        <div>
          {!hideHeading ? <h2>{showSummaryOnly ? "Resumen de cajas" : "Caja diaria"}</h2> : null}
          <p className="helper">{showSummaryOnly ? "Revision rapida de ultimas cajas cerradas del local activo." : "Apertura de caja y revision rapida de los ultimos cierres del local activo."}</p>
        </div>
        <div className="admin-header-actions">
          <span>Local: {local.name}</span>
          {showSummaryOnly && (
            <button className="button muted compact" type="button" onClick={() => setScreen("panel")}>
              Volver al panel
            </button>
          )}
        </div>
      </div>

      {showSummaryOnly ? (
        <>
          {recentCashesPanel}
          {selectedBalance ? (
            <ClosedBalanceSummary data={data} balance={selectedBalance} />
          ) : (
            <EmptyState title="Sin cajas cerradas" text="Todavia no hay cajas cerradas para mostrar." />
          )}
        </>
      ) : (
        <>
          <section className="form-card compact-open-cash open-cash-card open-cash-main-card">
            <div className="open-cash-title">
              <div>
                <h2>Nueva caja diaria</h2>
                <p>La apertura toma una foto de las maquinas activas del local.</p>
              </div>
              <span>{firstOpening ? "Primer aporte de capital" : `Saldo heredado ${money(localBalances.cash)}`}</span>
            </div>
            <form onSubmit={submit} className="open-cash-form">
              <label>
                Local
                <input value={local.name} disabled />
              </label>
              <label>
                Fecha operativa
                <input name="operatingDate" type="date" defaultValue={today()} required />
              </label>
              <label>
                {firstOpening ? "Aporte inicial efectivo" : "Saldo inicial efectivo"}
                {firstOpening ? (
                  <input name="initialFund" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
                ) : (
                  <input name="initialFund" value={moneyInputValue(localBalances.cash)} disabled readOnly />
                )}
              </label>
              <label>
                {firstOpening ? "Aporte inicial banco" : "Saldo inicial banco"}
                {firstOpening ? (
                  <input name="initialBankFund" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
                ) : (
                  <input name="initialBankFund" value={moneyInputValue(localBalances.bank)} disabled readOnly />
                )}
              </label>
              {firstOpening && (
                <label>
                  Responsable aporte inicial
                  <select name="openingCapitalPerson" defaultValue="MATHIAS">
                    {CAPITAL_PEOPLE.map((person) => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!firstOpening && (
                <div className="open-cash-rule">
                  <strong>Saldos heredados</strong>
                  <span>
                    Efectivo {money(localBalances.cash)} / Banco {money(localBalances.bank)}. Estos saldos vienen de la cuenta corriente del local.
                  </span>
                </div>
              )}
              <label className={firstOpening ? undefined : "span-2"}>
                Observacion inicial
                <input name="initialNote" placeholder="Opcional" />
              </label>
              <div className="open-cash-rule">
                <strong>Regla clave</strong>
                <span>{firstOpening ? "El primer aporte abre las cuentas del local." : "La caja abre con el saldo que quedo del cierre anterior."} Apertura: {user.name}</span>
              </div>
              <div className="form-actions open-cash-actions">
                <button className="button success compact" type="submit">
                  Abrir caja
                </button>
              </div>
            </form>
          </section>
          {recentCashesPanel}
          {selectedBalance && <ClosedBalanceSummary data={data} balance={selectedBalance} />}
        </>
      )}
    </section>
  );
}

