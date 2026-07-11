import { useState, type FormEvent } from "react";
import { commandContext } from "../../application/command";
import { saveSalarySettlementCommand } from "../../application/salaries/salarySettlementCommands";
import { InfoCard, Modal } from "../../components/ui";
import {
  handleMoneyBlur,
  handleMoneyFocus,
  handleMoneyInput,
  money,
  moneyInputValue,
  parseMoneyInput,
} from "../../lib/money";
import { staffFullName } from "../../lib/people";
import {
  normalizeSalaryConcept,
  salaryConceptLabel,
  salaryConceptOptions,
  salarySettlementDisplayAmount,
} from "../../lib/salaryRules";
import type { AppData, User } from "../../types";

export function SalarySettlementEditor({
  data,
  user,
  settlementId,
  defaultPeriod,
  fixedStaffId,
  onClose,
  patchData,
}: {
  data: AppData;
  user: User;
  settlementId: string | null;
  defaultPeriod: string;
  fixedStaffId?: string;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
}) {
  const existing = settlementId ? data.salarySettlements.find((settlement) => settlement.id === settlementId) : undefined;
  const activeStaff = data.staff.filter((staff) => staff.status === "ACTIVO");
  const [staffId, setStaffId] = useState(existing?.staffId ?? fixedStaffId ?? activeStaff[0]?.id ?? "");
  const selectedStaff = data.staff.find((staff) => staff.id === staffId);
  const defaultConcept = normalizeSalaryConcept(existing?.concept ?? "SALARIO");
  const defaultAmount = existing ? salarySettlementDisplayAmount(existing) : 0;
  const staffLocked = Boolean(fixedStaffId);
  const isNew = !existing;
  const [formError, setFormError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const staff = data.staff.find((item) => item.id === (fixedStaffId ?? String(form.get("staffId"))));
    if (!staff) return;
    const concept = normalizeSalaryConcept(form.get("concept") ?? "SALARIO");
    const amount = parseMoneyInput(form.get("amount"));
    if (!amount) {
      setFormError("Ingresa un monto para guardar la liquidacion.");
      return;
    }
    const period = String(form.get("period") || defaultPeriod);
    patchData((current) => {
      const result = saveSalarySettlementCommand(
        current,
        {
          settlementId: existing?.id,
          staffId: staff.id,
          period,
          concept,
          amount,
          notes: String(form.get("notes") ?? ""),
          origin: existing?.origin ?? "LIQUIDACION",
          balanceId: existing?.balanceId,
        },
        commandContext(user, user.role),
      );
      if (!result.ok) {
        setFormError(result.error);
        return current;
      }
      setFormError("");
      onClose();
      return result.data;
    });
  };

  return (
    <Modal title={isNew ? "Agregar liquidacion" : `Editar liquidacion ${existing?.period}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        {formError && <p className="notice warning span-2">{formError}</p>}
        <label>
          Mes
          <input name="period" type="month" defaultValue={existing?.period ?? defaultPeriod} required />
        </label>
        <label>
          Personal
          {staffLocked ? (
            <>
              <input value={selectedStaff ? `${selectedStaff.visibleId} - ${staffFullName(selectedStaff)}` : "Personal no disponible"} disabled />
              <input name="staffId" type="hidden" value={staffId} />
            </>
          ) : (
            <select name="staffId" value={staffId} onChange={(event) => setStaffId(event.target.value)} required>
              {activeStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.visibleId} - {staffFullName(staff)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          Concepto principal
          <select name="concept" defaultValue={defaultConcept}>
            {salaryConceptOptions.map((concept) => (
              <option key={concept} value={concept}>
                {salaryConceptLabel(concept)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Monto
          <input
            name="amount"
            inputMode="numeric"
            defaultValue={moneyInputValue(defaultAmount)}
            onFocus={handleMoneyFocus}
            onChange={handleMoneyInput}
            onBlur={handleMoneyBlur}
            required
          />
        </label>
        <label className="span-2">
          Notas
          <textarea name="notes" rows={3} defaultValue={existing?.notes} placeholder="Detalle del pago, observaciones o motivo." />
        </label>
        <InfoCard
          tone="blue"
          title="Liquidacion"
          lines={["Salario, adelanto y descuento bajan pendiente.", "Premio / Gratificacion es interno del empleado; Horas extras es trabajo fuera de horario."]}
        />
        <InfoCard
          tone="green"
          title="Empleado"
          lines={[
            selectedStaff ? staffFullName(selectedStaff) : "Sin empleado",
            `Salario nominal: ${money(selectedStaff?.nominalSalary)}`,
            `Adelantos actuales: ${money(selectedStaff?.salaryAdvanceBalance)}`,
          ]}
        />
        <div className="form-actions span-2">
          <div className="button-row end">
            <button className="button muted" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button success" type="submit">
              Guardar liquidacion
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
