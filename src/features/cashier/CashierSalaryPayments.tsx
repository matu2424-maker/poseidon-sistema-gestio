import type { FormEvent } from "react";
import { commandContext } from "../../application/command";
import { annulSalarySettlementCommand, saveSalarySettlementCommand } from "../../application/salaries/salarySettlementCommands";
import { confirmAction } from "../../lib/confirmations";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, parseMoneyInput } from "../../lib/money";
import { staffFullName } from "../../lib/people";
import {
  cashierSalaryConceptOptions,
  isValidSalaryPeriod,
  normalizeSalaryConcept,
  salaryConceptLabel,
  salarySettlementDisplayAmount,
  suggestedWorkedPeriodFromOperatingDate,
} from "../../lib/salaryRules";
import type { AppData, Balance, User } from "../../types";
import { CashAvailabilityNotice } from "./CashAvailabilityNotice";
import { CashierMovementPanel, MovementTable } from "./MovementTable";

export function CashierSalaryPayments({
  data,
  balance,
  user,
  patchData,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const suggestedPeriod = suggestedWorkedPeriodFromOperatingDate(balance.operatingDate);
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const items = data.salarySettlements.filter((settlement) => settlement.balanceId === balance.id);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const staff = data.staff.find((item) => item.id === String(form.get("staffId")));
    if (!staff) {
      setMessage("Selecciona una persona activa.");
      return;
    }
    const conceptRaw = String(form.get("concept") ?? "");
    if (!conceptRaw) {
      setMessage("Selecciona Salario o Adelanto.");
      return;
    }
    const concept = normalizeSalaryConcept(conceptRaw);
    if (!cashierSalaryConceptOptions.includes(concept)) {
      setMessage("Selecciona Salario o Adelanto.");
      return;
    }
    const period = String(form.get("period") ?? "").trim();
    if (!isValidSalaryPeriod(period)) {
      setMessage("Selecciona un periodo trabajado valido.");
      return;
    }
    const amount = parseMoneyInput(form.get("amount"));
    if (amount <= 0) {
      setMessage("Ingresa un monto.");
      return;
    }
    const result = saveSalarySettlementCommand(
      data,
      {
        staffId: staff.id,
        period,
        concept,
        amount,
        notes: `Pago desde caja ${balance.visibleId ?? balance.id}. Periodo trabajado ${period}.`,
        origin: "CAJA",
        balanceId: balance.id,
      },
      commandContext(user, "CAJERO"),
    );
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Pago de salario registrado.");
    event.currentTarget.reset();
  };

  const deleteSalaryPayment = (id: string) => {
    if (balance.status !== "EN_PROCESO") {
      setMessage("Solo se pueden anular salarios antes de cerrar la caja.");
      return;
    }
    if (!confirmAction("Anular este pago de salario de la caja abierta?")) return;
    const result = annulSalarySettlementCommand(data, id, commandContext(user, "CAJERO"), {
      requireOpenBalance: true,
      reason: "Caja abierta",
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Pago de salario anulado.");
  };

  return (
    <CashierMovementPanel
      title="Pago de salarios"
      detail="El pago sale de la caja actual, pero se imputa al periodo trabajado seleccionado."
      totalLabel="pagos de la caja"
      total={items.length}
      onBack={onBack}
    >
      <CashAvailabilityNotice data={data} balance={balance} detail="Este pago sale de Caja / Efectivo." />
      {!activeStaff.length && <p className="notice">No hay personal activo cargado.</p>}
      <MovementTable
        columns={["Personal", "Concepto", "Periodo trabajado", "Monto", "Estado", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [
            item.staffName,
            salaryConceptLabel(normalizeSalaryConcept(item.concept)),
            item.period,
            money(salarySettlementDisplayAmount(item)),
            item.status,
          ],
          sortValues: [
            item.staffName,
            salaryConceptLabel(normalizeSalaryConcept(item.concept)),
            item.period,
            salarySettlementDisplayAmount(item),
            item.status,
          ],
          status: item.status === "ANULADA" ? "ANULADO" : "ACTIVO",
        }))}
        actionLabel="Anular"
        onAnnul={deleteSalaryPayment}
        createRow={
          <tr className="create-row">
            <td>
              <select form="salary-payment-create-form" name="staffId" defaultValue="" required>
                <option value="" disabled>
                  Seleccionar personal
                </option>
                {activeStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staffFullName(staff)}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select form="salary-payment-create-form" name="concept" defaultValue="" required>
                <option value="" disabled>
                  Concepto
                </option>
                {cashierSalaryConceptOptions.map((concept) => (
                  <option key={concept} value={concept}>
                    {salaryConceptLabel(concept)}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input form="salary-payment-create-form" name="period" type="month" defaultValue={suggestedPeriod} required />
            </td>
            <td>
              <input
                className="compact-money-input"
                form="salary-payment-create-form"
                name="amount"
                inputMode="numeric"
                defaultValue="0"
                onFocus={handleMoneyFocus}
                onChange={handleMoneyInput}
                onBlur={handleMoneyBlur}
                required
              />
            </td>
            <td>Nuevo</td>
            <td>
              <form id="salary-payment-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit" disabled={!activeStaff.length}>
                  Guardar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}
