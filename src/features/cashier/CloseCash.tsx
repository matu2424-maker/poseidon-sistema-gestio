import { FormEvent, useState } from "react";
import type {
  AppData,
  Balance,
  CapitalMovementPerson,
  Role,
  Screen,
  User,
} from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { balanceCashReconciliation } from "../../lib/cashAvailability";
import { localAccountBalances } from "../../lib/currentAccounts";
import { clearZeroMoneyInput, formatMoneyInput, money, normalizeMoneyInput, parseMoneyInput } from "../../lib/money";
import { commandContext } from "../../application/command";
import { closeCashCommand } from "../../application/cash/closeCash";
import { ManagerCashActivity } from "./ManagerCashActivity";

const CAPITAL_PEOPLE: CapitalMovementPerson[] = ["RICARDO", "MATHIAS"];
export function CloseCash({
  data,
  balance,
  user,
  actorRole,
  patchData,
  setMessage,
  setScreen,
  afterCloseScreen = "panel",
}: {
  data: AppData;
  balance: Balance;
  user: User;
  actorRole: Role;
  patchData: (updater: (current: AppData) => AppData) => void;
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
  const hasNegativeExpectedCash = totals.expectedCash < 0;
  const cashReconciliation = balanceCashReconciliation(data, balance.id);
  const hasCashReconciliationError = !cashReconciliation?.isConsistent;
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
    const form = new FormData(event.currentTarget);
    patchData((current) => {
      const result = closeCashCommand(
        current,
        {
          balanceId: balance.id,
          declaredCash: parseMoneyInput(form.get("declaredCash")),
          declaredBank: parseMoneyInput(form.get("declaredBank")),
          finalWithdrawalCash: parseMoneyInput(form.get("finalWithdrawalCash")),
          finalWithdrawalBank: parseMoneyInput(form.get("finalWithdrawalBank")),
          withdrawalCashPerson: String(form.get("finalWithdrawalCashPerson") ?? "MATHIAS") as CapitalMovementPerson,
          withdrawalBankPerson: String(form.get("finalWithdrawalBankPerson") ?? "MATHIAS") as CapitalMovementPerson,
          differenceNote: String(form.get("differenceNote") ?? ""),
        },
        commandContext(user, actorRole),
      );
      if (!result.ok) {
        setCloseError(result.error);
        return current;
      }
      setMessage("Caja cerrada correctamente.");
      setScreen(afterCloseScreen);
      return result.data;
    });
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

      {hasCashReconciliationError ? (
        <div className="close-alert danger" role="alert">
          La caja no esta conciliada: el efectivo calculado es {money(cashReconciliation?.expectedCash)} y Local / Efectivo muestra {money(cashReconciliation?.accountCash)}. Diferencia tecnica: {money(cashReconciliation?.delta)}. El cierre queda bloqueado hasta aplicar una reconciliacion auditada; un aporte comun no corrige este desacople.
        </div>
      ) : hasNegativeExpectedCash ? (
        <div className="close-alert danger" role="alert">
          No se puede cerrar: el efectivo esperado es {money(totals.expectedCash)}. Registra un aporte real en efectivo que cubra el faltante y vuelve a esta pantalla.{" "}
          <button className="link-button" type="button" onClick={() => setScreen("capital-movements")}>
            Registrar aporte
          </button>
        </div>
      ) : null}

      <ManagerCashActivity data={data} balanceId={balance.id} />

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
            <button className="button success" type="submit" disabled={hasNegativeExpectedCash || hasCashReconciliationError}>
              Cerrar caja
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

