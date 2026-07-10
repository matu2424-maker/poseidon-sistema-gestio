import { FormEvent, useState } from "react";
import type {
  AppData,
  Balance,
  BalanceStatus,
  CapitalMovement,
  CapitalMovementMedium,
  CapitalMovementPerson,
  CapitalMovementTiming,
  CapitalMovementType,
  DifferenceStatus,
  MachineLocalHistory,
  MovementStatus,
  Role,
  Screen,
  User,
} from "../../types";
import {
  capitalAccountMovement,
  syncDifferenceAccountMovements,
  syncMachineResultAccountMovement,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { totalsForBalance } from "../../lib/cashTotals";
import { ensureLocalCurrentAccounts, localAccountBalances } from "../../lib/currentAccounts";
import { nowIso } from "../../lib/dates";
import { balanceVisibleId } from "../../lib/display";
import { uid } from "../../lib/ids";
import { machineHistoryEvent } from "../../lib/machineHistory";
import { clearZeroMoneyInput, counter, formatMoneyInput, money, normalizeMoneyInput, parseMoneyInput } from "../../lib/money";

const CAPITAL_PEOPLE: CapitalMovementPerson[] = ["RICARDO", "MATHIAS"];
export function CloseCash({
  data,
  balance,
  user,
  actorRole,
  patchData,
  audit,
  setMessage,
  setScreen,
  afterCloseScreen = "panel",
}: {
  data: AppData;
  balance: Balance;
  user: User;
  actorRole: Role;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  setScreen: (screen: Screen) => void;
  afterCloseScreen?: Screen;
}) {
  const totals = totalsForBalance(data, balance.id);
  const [declaredCashDraft, setDeclaredCashDraft] = useState("0");
  const [declaredBankDraft, setDeclaredBankDraft] = useState("0");
  const [finalWithdrawalCashDraft, setFinalWithdrawalCashDraft] = useState("0");
  const [finalWithdrawalBankDraft, setFinalWithdrawalBankDraft] = useState("0");
  const [finalWithdrawalCashPerson, setFinalWithdrawalCashPerson] = useState<CapitalMovementPerson>("MATHIAS");
  const [finalWithdrawalBankPerson, setFinalWithdrawalBankPerson] = useState<CapitalMovementPerson>("MATHIAS");
  const [closeError, setCloseError] = useState("");
  const localBalances = localAccountBalances(data, balance.localId);
  const balanceReadings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const loadedReadings = balanceReadings.filter((reading) => reading.status === "CARGADA");
  const pendingReadings = balanceReadings.filter((reading) => reading.status === "PENDIENTE");
  const pendingInvalid = data.readings.filter(
    (reading) => reading.balanceId === balance.id && reading.status === "PENDIENTE" && !reading.observation.trim(),
  );
  const finalEconomicResult = totals.commercialResult;
  const declaredCashPreview = parseMoneyInput(declaredCashDraft);
  const declaredBankPreview = parseMoneyInput(declaredBankDraft);
  const finalWithdrawalCashPreview = parseMoneyInput(finalWithdrawalCashDraft);
  const finalWithdrawalBankPreview = parseMoneyInput(finalWithdrawalBankDraft);
  const cashWithdrawalPersonDisabled = finalWithdrawalCashPreview <= 0;
  const bankWithdrawalPersonDisabled = finalWithdrawalBankPreview <= 0;
  const totalCashOutflows = totals.totalExpenses + totals.totalSalaries + totals.giftCash;
  const hasDeclaredCash = declaredCashDraft.trim() !== "";
  const hasDeclaredBank = declaredBankDraft.trim() !== "";
  const expectedCashAfterFinalWithdrawal = totals.expectedCash - finalWithdrawalCashPreview;
  const expectedBankAfterFinalWithdrawal = localBalances.bank - finalWithdrawalBankPreview;
  const nextBankPreview = declaredBankPreview;
  const differencePreview = declaredCashPreview - expectedCashAfterFinalWithdrawal;
  const bankDifferencePreview = declaredBankPreview - expectedBankAfterFinalWithdrawal;
  const differenceClass = !hasDeclaredCash ? "neutral" : differencePreview === 0 ? "positive" : "negative";
  const bankDifferenceClass = !hasDeclaredBank ? "neutral" : bankDifferencePreview === 0 ? "positive" : "negative";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCloseError("");
    if (pendingInvalid.length > 0) {
      setCloseError("No se puede cerrar: hay maquinas activas pendientes sin observacion.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const declaredCash = parseMoneyInput(form.get("declaredCash"));
    const declaredBank = parseMoneyInput(form.get("declaredBank"));
    const finalWithdrawalCash = parseMoneyInput(form.get("finalWithdrawalCash"));
    const finalWithdrawalBank = parseMoneyInput(form.get("finalWithdrawalBank"));
    const withdrawalCashPerson = String(form.get("finalWithdrawalCashPerson") ?? "MATHIAS") as CapitalMovementPerson;
    const withdrawalBankPerson = String(form.get("finalWithdrawalBankPerson") ?? "MATHIAS") as CapitalMovementPerson;
    if (finalWithdrawalCash < 0 || finalWithdrawalBank < 0) {
      setCloseError("Los retiros finales no pueden ser negativos.");
      return;
    }
    if (finalWithdrawalCash > totals.expectedCash) {
      setCloseError("El retiro final en efectivo no puede superar el efectivo esperado antes del retiro.");
      return;
    }
    if (finalWithdrawalBank > localBalances.bank) {
      setCloseError("El retiro final por transferencia no puede superar el saldo banco del local.");
      return;
    }
    const nextBase = declaredCash;
    const expectedBankAfterWithdrawal = localBalances.bank - finalWithdrawalBank;
    const nextBankBase = declaredBank;
    const withdrawal = finalWithdrawalCash;
    const difference = declaredCash - (totals.expectedCash - finalWithdrawalCash);
    const bankDifference = declaredBank - expectedBankAfterWithdrawal;
    const differenceNote = String(form.get("differenceNote") ?? "").trim();
    if ((difference !== 0 || bankDifference !== 0) && !differenceNote.trim()) {
      setCloseError("Toda diferencia requiere observacion.");
      return;
    }

    patchData((current) => {
      const previous = current.balances.find((item) => item.id === balance.id);
      const closingCapitalMovements: CapitalMovement[] = [
        finalWithdrawalCash > 0
          ? {
              id: uid("capital-close-cash"),
              balanceId: balance.id,
              localId: balance.localId,
              type: "RETIRO" as CapitalMovementType,
              medium: "EFECTIVO" as CapitalMovementMedium,
              timing: "CIERRE" as CapitalMovementTiming,
              person: withdrawalCashPerson,
              amount: finalWithdrawalCash,
              note: `Retiro final caja ${balanceVisibleId(current, balance)}`,
              status: "ACTIVO" as MovementStatus,
              userId: user.id,
              createdAt: nowIso(),
            }
          : null,
        finalWithdrawalBank > 0
          ? {
              id: uid("capital-close-bank"),
              balanceId: balance.id,
              localId: balance.localId,
              type: "RETIRO" as CapitalMovementType,
              medium: "TRANSFERENCIA" as CapitalMovementMedium,
              timing: "CIERRE" as CapitalMovementTiming,
              person: withdrawalBankPerson,
              amount: finalWithdrawalBank,
              note: `Retiro final banco caja ${balanceVisibleId(current, balance)}`,
              status: "ACTIVO" as MovementStatus,
              userId: user.id,
              createdAt: nowIso(),
            }
          : null,
      ].filter((movement): movement is CapitalMovement => Boolean(movement));
      const accountMovements = closingCapitalMovements.reduce(
        (movements, movement) => upsertAccountMovement(movements, capitalAccountMovement(movement)),
        current.accountMovements,
      );
      const balances = current.balances.map((item) =>
        item.id === balance.id
          ? {
              ...item,
              status: "CERRADO" as BalanceStatus,
              closedBy: user.id,
              closedByRole: actorRole,
              closedAt: nowIso(),
              declaredCash,
              declaredBank,
              nextBase,
              nextBankBase,
              withdrawal,
              finalWithdrawalCash,
              finalWithdrawalBank,
              cashDifference: difference,
              bankDifference,
              differenceNote,
              differenceStatus: difference === 0 && bankDifference === 0 ? undefined : ("PENDIENTE" as DifferenceStatus),
            }
          : item,
      );
      const machines = current.machines.map((machine) => {
        const reading = current.readings.find((item) => item.balanceId === balance.id && item.machineId === machine.id && item.status === "CARGADA");
        return reading ? { ...machine, lastIn: reading.inActual ?? machine.lastIn, lastOut: reading.outActual ?? machine.lastOut } : machine;
      });
      const machineLocalHistory = [
        ...current.readings
          .filter((item) => item.balanceId === balance.id && item.status === "CARGADA")
          .map((reading) => {
            const machine = current.machines.find((item) => item.id === reading.machineId);
            return machine
              ? machineHistoryEvent(
                  machine,
                  machine.localId,
                  "CONTADORES",
                  `Cierre ${balance.operatingDate}: IN ${counter(reading.inPrevious)} -> ${counter(reading.inActual)}, OUT ${counter(reading.outPrevious)} -> ${counter(reading.outActual)}`,
                  user.id,
                )
              : null;
          })
          .filter((event): event is MachineLocalHistory => Boolean(event)),
        ...current.machineLocalHistory,
      ];
      const next = balances.find((item) => item.id === balance.id);
      let synced = syncMachineResultAccountMovement(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, balance.localId),
          accountMovements,
          capitalMovements: [...closingCapitalMovements, ...current.capitalMovements],
          balances,
          machines,
          machineLocalHistory,
        },
        balance.id,
        user.id,
      );
      if (next) {
        synced = {
          ...synced,
          accountMovements: syncDifferenceAccountMovements(synced.accountMovements, next, user.id),
        };
      }
      return audit(synced, "Cerrar caja", "BalanceDiario", balance.id, previous, next, differenceNote);
    });
    setMessage("Caja cerrada correctamente.");
    setScreen(afterCloseScreen);
  };

  return (
    <section className="close-cash-page">
      <div className="section-toolbar close-cash-toolbar">
        <div>
          <h2>Control de cierre</h2>
          <p>Control final de caja, maquinas, movimientos, salarios y salidas del dia.</p>
        </div>
        <span className="close-status-pill">
          {loadedReadings.length}/{balanceReadings.length} maquinas recaudadas
        </span>
      </div>

      <section className="close-workspace">
        <div className="close-breakdown">
          <h3>Balance de control</h3>
          <dl>
            <div>
              <dt>Efectivo inicial</dt>
              <dd>{money(balance.initialFund)}</dd>
            </div>
            <div>
              <dt>Banco inicial</dt>
              <dd>{money(balance.initialBankFund)}</dd>
            </div>
            <div>
              <dt>Resultado maquinas</dt>
              <dd>{money(totals.resultMachines)}</dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd>- {money(totals.totalExpenses)}</dd>
            </div>
            <div>
              <dt>Salarios</dt>
              <dd>- {money(totals.totalSalaries)}</dd>
            </div>
            <div>
              <dt>Regalos</dt>
              <dd>- {money(totals.giftCash)}</dd>
            </div>
            <div>
              <dt>Transferencias</dt>
              <dd>- {money(totals.totalTransfers)}</dd>
            </div>
            <div>
              <dt>Aportes efectivo</dt>
              <dd>+ {money(totals.capitalContributionsCash)}</dd>
            </div>
            <div>
              <dt>Retiros efectivo</dt>
              <dd>- {money(totals.withdrawalsCash)}</dd>
            </div>
            <div>
              <dt>Retiros transferencia</dt>
              <dd>- {money(totals.withdrawalsBank)}</dd>
            </div>
            <div>
              <dt>Resultado final</dt>
              <dd>{money(finalEconomicResult)}</dd>
            </div>
            <div className="total total-danger">
              <dt>Salida total</dt>
              <dd>- {money(totalCashOutflows)}</dd>
            </div>
            <div className="total">
              <dt>Efectivo esperado</dt>
              <dd>{money(expectedCashAfterFinalWithdrawal)}</dd>
            </div>
            <div className="total">
              <dt>Dinero en banco esperado</dt>
              <dd>{money(expectedBankAfterFinalWithdrawal)}</dd>
            </div>
            <div className="total">
              <dt>Efectivo</dt>
              <dd>{hasDeclaredCash ? money(declaredCashPreview) : "Se calcula al declarar"}</dd>
            </div>
            <div className="total">
              <dt>Dinero en banco</dt>
              <dd>{hasDeclaredBank ? money(declaredBankPreview) : "Se calcula al declarar"}</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={submit} className="close-form">
          <h3>Declaracion final</h3>
          <div className="close-form-grid">
            <label>
              Retiro final efectivo
              <input
                name="finalWithdrawalCash"
                inputMode="numeric"
                value={finalWithdrawalCashDraft}
                onFocus={() => setFinalWithdrawalCashDraft(clearZeroMoneyInput(finalWithdrawalCashDraft))}
                onChange={(event) => setFinalWithdrawalCashDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setFinalWithdrawalCashDraft(normalizeMoneyInput(event.target.value))}
              />
            </label>
            <label>
              Retiro final banco
              <input
                name="finalWithdrawalBank"
                inputMode="numeric"
                value={finalWithdrawalBankDraft}
                onFocus={() => setFinalWithdrawalBankDraft(clearZeroMoneyInput(finalWithdrawalBankDraft))}
                onChange={(event) => setFinalWithdrawalBankDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setFinalWithdrawalBankDraft(normalizeMoneyInput(event.target.value))}
              />
            </label>
            <label>
              Quien retira efectivo
              <select
                name="finalWithdrawalCashPerson"
                value={cashWithdrawalPersonDisabled ? "SIN_RETIROS" : finalWithdrawalCashPerson}
                onChange={(event) => setFinalWithdrawalCashPerson(event.target.value as CapitalMovementPerson)}
                disabled={cashWithdrawalPersonDisabled}
              >
                {cashWithdrawalPersonDisabled ? (
                  <option value="SIN_RETIROS">Sin retiros finales</option>
                ) : (
                  CAPITAL_PEOPLE.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Quien retira banco
              <select
                name="finalWithdrawalBankPerson"
                value={bankWithdrawalPersonDisabled ? "SIN_RETIROS" : finalWithdrawalBankPerson}
                onChange={(event) => setFinalWithdrawalBankPerson(event.target.value as CapitalMovementPerson)}
                disabled={bankWithdrawalPersonDisabled}
              >
                {bankWithdrawalPersonDisabled ? (
                  <option value="SIN_RETIROS">Sin retiros finales</option>
                ) : (
                  CAPITAL_PEOPLE.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Efectivo declarado final
              <input
                name="declaredCash"
                inputMode="numeric"
                value={declaredCashDraft}
                onFocus={() => setDeclaredCashDraft(clearZeroMoneyInput(declaredCashDraft))}
                onChange={(event) => setDeclaredCashDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setDeclaredCashDraft(normalizeMoneyInput(event.target.value))}
                required
              />
            </label>
            <label>
              Dinero banco declarado final
              <input
                name="declaredBank"
                inputMode="numeric"
                value={declaredBankDraft}
                onFocus={() => setDeclaredBankDraft(clearZeroMoneyInput(declaredBankDraft))}
                onChange={(event) => setDeclaredBankDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setDeclaredBankDraft(normalizeMoneyInput(event.target.value))}
                required
              />
            </label>
            <label>
              Efectivo proxima caja
              <input value={hasDeclaredCash ? money(declaredCashPreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Banco proxima caja
              <input value={hasDeclaredBank ? money(nextBankPreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Efectivo esperado final
              <input value={money(expectedCashAfterFinalWithdrawal)} disabled readOnly />
            </label>
            <label>
              Dinero en banco esperado final
              <input value={money(expectedBankAfterFinalWithdrawal)} disabled readOnly />
            </label>
            <label>
              Diferencia efectivo
              <input className={`close-difference-input ${differenceClass}`} value={hasDeclaredCash ? money(differencePreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label>
              Diferencia banco
              <input className={`close-difference-input ${bankDifferenceClass}`} value={hasDeclaredBank ? money(bankDifferencePreview) : "Se calcula al declarar"} disabled readOnly />
            </label>
            <label className="span-2">
              Observacion por diferencia
              <textarea name="differenceNote" placeholder={differencePreview !== 0 || bankDifferencePreview !== 0 ? "Obligatoria si hay diferencia" : "Opcional"} />
            </label>
          </div>
          {closeError ? <div className="close-alert danger">{closeError}</div> : null}

          {pendingInvalid.length > 0 ? (
            <div className="close-alert danger">
              Hay {pendingInvalid.length} maquinas pendientes sin observacion. Para cerrar, cargalas o deja una observacion.
            </div>
          ) : pendingReadings.length > 0 ? (
            <div className="close-alert warning">
              Hay {pendingReadings.length} maquinas pendientes con observacion. El cierre puede continuar y queda registrado.
            </div>
          ) : (
            <div className="close-alert ok">Todas las maquinas de la caja fueron recaudadas.</div>
          )}

          <div className="close-actions">
            <button className="button success" type="submit">
              Cerrar caja
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

