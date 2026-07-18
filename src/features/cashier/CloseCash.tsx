import { FormEvent, useState } from "react";
import type {
  AppData,
  Balance,
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
  const [transferToPrincipalCashDraft, setTransferToPrincipalCashDraft] = useState("0");
  const [transferToPrincipalBankDraft, setTransferToPrincipalBankDraft] = useState("0");
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
  const transferToPrincipalCashPreview = parseMoneyInput(transferToPrincipalCashDraft);
  const transferToPrincipalBankPreview = parseMoneyInput(transferToPrincipalBankDraft);
  const totalCashOutflows = totals.totalExpenses + totals.totalSalaries + totals.giftCash;
  const hasDeclaredCash = declaredCashDraft.trim() !== "";
  const hasDeclaredBank = declaredBankDraft.trim() !== "";
  const hasNegativeExpectedCash = totals.expectedCash < 0;
  const cashReconciliation = balanceCashReconciliation(data, balance.id);
  const hasCashReconciliationError = !cashReconciliation?.isConsistent;
  const expectedCashAfterTransfer = totals.expectedCash - transferToPrincipalCashPreview;
  const expectedBankAfterTransfer = localBalances.bank - transferToPrincipalBankPreview;
  const nextBankPreview = declaredBankPreview;
  const differencePreview = declaredCashPreview - expectedCashAfterTransfer;
  const bankDifferencePreview = declaredBankPreview - expectedBankAfterTransfer;
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
          transferToPrincipalCash: parseMoneyInput(form.get("transferToPrincipalCash")),
          transferToPrincipalBank: parseMoneyInput(form.get("transferToPrincipalBank")),
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
          La caja no esta conciliada: el efectivo calculado es {money(cashReconciliation?.expectedCash)} y Caja / Efectivo muestra {money(cashReconciliation?.accountCash)}. Diferencia tecnica: {money(cashReconciliation?.delta)}. El cierre queda bloqueado hasta aplicar una reconciliacion auditada; un traspaso comun no corrige este desacople.
        </div>
      ) : hasNegativeExpectedCash ? (
        <div className="close-alert danger" role="alert">
          No se puede cerrar: el efectivo esperado es {money(totals.expectedCash)}. Ingresa fondos reales en Principal y traspasalos a Caja antes de volver a esta pantalla.{" "}
          <button className="link-button" type="button" onClick={() => setScreen("capital-movements")}>
            Mover fondos
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
              <dt>Principal a Caja / Efectivo</dt>
              <dd>+ {money(totals.capitalContributionsCash)}</dd>
            </div>
            <div>
              <dt>Principal a Caja / Banco</dt>
              <dd>+ {money(totals.capitalContributionsBank)}</dd>
            </div>
            <div>
              <dt>Caja a Principal / Efectivo</dt>
              <dd>- {money(totals.withdrawalsCash)}</dd>
            </div>
            <div>
              <dt>Caja a Principal / Banco</dt>
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
              <dd>{money(expectedCashAfterTransfer)}</dd>
            </div>
            <div className="total">
              <dt>Dinero en banco esperado</dt>
              <dd>{money(expectedBankAfterTransfer)}</dd>
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
              Traspaso a Principal / Efectivo
              <input
                name="transferToPrincipalCash"
                inputMode="numeric"
                value={transferToPrincipalCashDraft}
                onFocus={() => setTransferToPrincipalCashDraft(clearZeroMoneyInput(transferToPrincipalCashDraft))}
                onChange={(event) => setTransferToPrincipalCashDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setTransferToPrincipalCashDraft(normalizeMoneyInput(event.target.value))}
              />
            </label>
            <label>
              Traspaso a Principal / Banco
              <input
                name="transferToPrincipalBank"
                inputMode="numeric"
                value={transferToPrincipalBankDraft}
                onFocus={() => setTransferToPrincipalBankDraft(clearZeroMoneyInput(transferToPrincipalBankDraft))}
                onChange={(event) => setTransferToPrincipalBankDraft(formatMoneyInput(event.target.value))}
                onBlur={(event) => setTransferToPrincipalBankDraft(normalizeMoneyInput(event.target.value))}
              />
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
              <input value={money(expectedCashAfterTransfer)} disabled readOnly />
            </label>
            <label>
              Dinero en banco esperado final
              <input value={money(expectedBankAfterTransfer)} disabled readOnly />
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

