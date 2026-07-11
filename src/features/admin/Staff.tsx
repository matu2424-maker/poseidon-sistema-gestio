import { useState, type FormEvent } from "react";
import type { AppData, Client, ClientStatus, SalaryHistory, SalaryType, StaffMember, StaffSchedule, StaffStatus, User, WeekDay } from "../../types";
import { clientDocumentLabel, hasClientDocumentDuplicate, normalizeClientDocument, normalizeClientDocumentType, sanitizeDigits } from "../../lib/clients";
import { formatDateTime, nowIso, today } from "../../lib/dates";
import { localName } from "../../lib/display";
import { nextShortId, uid } from "../../lib/ids";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, moneyInputValue, parseMoneyInput } from "../../lib/money";
import { salaryHistoryEvent, staffFullName } from "../../lib/people";
import { shiftSalaryPeriod } from "../../lib/salaryRules";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { Modal } from "../../components/ui";
import { clientDeletionReferences, referenceMessage, staffDeletionReferences } from "../../lib/entityReferences";
import { staffAccountId } from "../../lib/currentAccounts";
import { confirmAction } from "../../lib/confirmations";

const POSEIDON_LOCAL_ID = "1";
const weekDays: WeekDay[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const defaultSchedule: StaffSchedule[] = weekDays.map((day) => ({
  day,
  start: day === "DOMINGO" ? "" : "18:00",
  end: day === "DOMINGO" ? "" : "02:00",
  rest: day === "DOMINGO",
}));
const asNumber = (value: FormDataEntryValue | null) => Number(value || 0);
const localOptionName = (local: { id: string; name: string }) => `${local.id} - ${local.name}`;
const staffStatusClass = (status: StaffStatus) => (status === "ACTIVO" ? "status-active" : status === "PAPELERA" ? "status-disused" : "status-inactive");
export function AdminStaff({
  data,
  user,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<
    SortState<"visibleId" | "name" | "position" | "local" | "status" | "salary" | "vacations" | "estimatedAguinaldo" | "estimatedVacationSalary">
  >({ key: "visibleId", direction: "asc" });
  const activeStaff = data.staff.filter((staff) => staff.status !== "PAPELERA");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? activeStaff.filter((staff) =>
        [staff.visibleId, staffFullName(staff), staff.documentId, staff.phone, staff.position, localName(data, staff.localId), staff.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : activeStaff;
  const staffValue = (staff: StaffMember, key: typeof sort.key): string | number => {
    if (key === "visibleId") return Number(staff.visibleId);
    if (key === "name") return staffFullName(staff);
    if (key === "position") return staff.position;
    if (key === "local") return localName(data, staff.localId);
    if (key === "salary") return staff.nominalSalary;
    if (key === "vacations") return staff.vacationDays - staff.usedVacationDays;
    if (key === "estimatedAguinaldo") return staff.estimatedAguinaldo;
    if (key === "estimatedVacationSalary") return staff.estimatedVacationSalary;
    return staff.status;
  };
  const rows = [...filtered].sort((a, b) => {
    const result = compareValues(staffValue(a, sort.key), staffValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const sendToTrash = (staff: StaffMember) => {
    if (!confirmAction(`Enviar a papelera a ${staffFullName(staff)}?`)) return;
    patchData((current) => {
      const previous = current.staff.find((item) => item.id === staff.id);
      const nextStaff = current.staff.map((item) => (item.id === staff.id ? { ...item, status: "PAPELERA" as StaffStatus, deletedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = nextStaff.find((item) => item.id === staff.id);
      return audit({ ...current, staff: nextStaff }, "Enviar personal a papelera", "Personal", staff.id, previous, next);
    });
  };
  const markTerminated = (staff: StaffMember) => {
    if (!confirmAction(`Dar de baja a ${staffFullName(staff)}?`)) return;
    patchData((current) => {
      const previous = current.staff.find((item) => item.id === staff.id);
      const nextStaff = current.staff.map((item) => (item.id === staff.id ? { ...item, status: "BAJA" as StaffStatus, terminatedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = nextStaff.find((item) => item.id === staff.id);
      return audit({ ...current, staff: nextStaff }, "Dar de baja personal", "Personal", staff.id, previous, next);
    });
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">Gestion de empleados, horarios, salario, aguinaldo, salario vacacional y vacaciones.</p>
        </div>
        <div className="admin-header-actions">
          <span>{activeStaff.length} personas</span>
          <button className="button success compact" onClick={() => setEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personal, cargo, documento..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {[
                ["visibleId", "ID"],
                ["name", "Nombre"],
                ["position", "Cargo"],
                ["local", "Local"],
                ["salary", "Salario"],
                ["status", "Estado"],
                ["vacations", "Vacaciones"],
                ["estimatedAguinaldo", "Aguinaldo est."],
                ["estimatedVacationSalary", "Sal. vacacional est."],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                    {label}
                    {sortIndicator(sort, key as typeof sort.key)}
                  </button>
                </th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((staff) => (
              <tr key={staff.id} className={staffStatusClass(staff.status)}>
                <td>{staff.visibleId}</td>
                <td>{staffFullName(staff)}</td>
                <td>{staff.position}</td>
                <td>{localName(data, staff.localId)}</td>
                <td>{money(staff.nominalSalary)}</td>
                <td>{staff.status}</td>
                <td>{staff.usedVacationDays}/{staff.vacationDays}</td>
                <td>{money(staff.estimatedAguinaldo)}</td>
                <td>{money(staff.estimatedVacationSalary)}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => setEditorId(staff.id)}>
                      Editar
                    </button>
                    {staff.status === "ACTIVO" && (
                      <button className="button muted compact" onClick={() => markTerminated(staff)}>
                        Baja
                      </button>
                    )}
                    <button className="button muted compact" onClick={() => sendToTrash(staff)}>
                      Papelera
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10}>No hay personal para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <StaffEditor
          data={data}
          user={user}
          staffId={editorId}
          onClose={() => setEditorId(undefined)}
          patchData={patchData}
          audit={audit}
        />
      )}
    </section>
  );
}

function StaffEditor({
  data,
  user,
  staffId,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  user: User;
  staffId: string | null;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = staffId ? data.staff.find((staff) => staff.id === staffId) : undefined;
  const isNew = !existing;
  const [schedule, setSchedule] = useState<StaffSchedule[]>(existing?.schedule ?? defaultSchedule);
  const [formError, setFormError] = useState("");
  const [salaryHistorySort, setSalaryHistorySort] = useState<
    SortState<"effectiveDate" | "previousSalaryType" | "newSalaryType" | "previousNominalSalary" | "newNominalSalary" | "userName" | "reason">
  >({ key: "effectiveDate", direction: "desc" });
  const defaultSalaryEffectiveDate = isNew ? today() : `${shiftSalaryPeriod(today().slice(0, 7), 1)}-01`;
  const salaryHistory = existing
    ? data.salaryHistories
        .filter((history) => history.staffId === existing.id)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt))
    : [];
  const salaryHistoryValue = (history: SalaryHistory): string | number => {
    if (salaryHistorySort.key === "effectiveDate") return history.effectiveDate;
    if (salaryHistorySort.key === "previousSalaryType") return history.previousSalaryType;
    if (salaryHistorySort.key === "newSalaryType") return history.newSalaryType;
    if (salaryHistorySort.key === "previousNominalSalary") return history.previousNominalSalary;
    if (salaryHistorySort.key === "newNominalSalary") return history.newNominalSalary;
    if (salaryHistorySort.key === "userName") return history.userName;
    return history.reason || "";
  };
  const sortedSalaryHistory = [...salaryHistory].sort((left, right) => {
    const result = compareValues(salaryHistoryValue(left), salaryHistoryValue(right));
    return salaryHistorySort.direction === "asc" ? result : -result;
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nominalSalary = parseMoneyInput(form.get("nominalSalary"));
    const vacationDays = asNumber(form.get("vacationDays")) || 20;
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const position = String(form.get("position") ?? "").trim();
    const localId = String(form.get("localId") ?? "");
    const salaryType = String(form.get("salaryType") ?? "") as SalaryType;
    const status = String(form.get("status") ?? "") as StaffStatus;
    if (!firstName || !lastName || !position || !localId || !salaryType || !status || !nominalSalary) {
      setFormError("Completa los campos obligatorios para guardar personal.");
      return;
    }
    const next: StaffMember = {
      id: existing?.id ?? uid("staff"),
      visibleId: existing?.visibleId ?? nextShortId(data.staff.map((staff) => staff.visibleId)),
      firstName,
      lastName,
      documentId: sanitizeDigits(String(form.get("documentId") ?? ""), 12),
      address: String(form.get("address") ?? ""),
      phone: sanitizeDigits(String(form.get("phone") ?? ""), 20),
      email: String(form.get("email") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      hireDate: String(form.get("hireDate") ?? today()),
      position,
      localId,
      salaryType,
      nominalSalary,
      salaryAdvanceBalance: parseMoneyInput(form.get("salaryAdvanceBalance")),
      vacationDays,
      usedVacationDays: asNumber(form.get("usedVacationDays")),
      estimatedAguinaldo: Math.round(nominalSalary / 12),
      estimatedVacationSalary: Math.round((nominalSalary / 30) * vacationDays),
      emergencyContact: String(form.get("emergencyContact") ?? ""),
      bankAccount: String(form.get("bankAccount") ?? ""),
      schedule,
      notes: String(form.get("notes") ?? ""),
      status,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      terminatedAt: existing?.terminatedAt,
      deletedAt: existing?.deletedAt,
    };
    const salaryChanged = !existing || existing.salaryType !== next.salaryType || Number(existing.nominalSalary ?? 0) !== next.nominalSalary;
    const effectiveDate = String(form.get("salaryEffectiveDate") || defaultSalaryEffectiveDate);
    const salaryReason = String(form.get("salaryReason") ?? "").trim() || (isNew ? "Alta inicial de salario" : "Cambio salarial");
    if (salaryChanged && existing) {
      const closedImpact = data.salaryClosures.find((closure) => closure.status === "CERRADO" && effectiveDate <= closure.endDate);
      if (closedImpact) {
        setFormError(`No se puede cambiar el salario desde ${effectiveDate} porque afectaria el cierre ${closedImpact.visibleId} (${closedImpact.periodLabel}). Usa una fecha efectiva posterior al cierre.`);
        return;
      }
      const firstAffectedPeriod = effectiveDate.slice(0, 7);
      const activeImpactedSettlements = data.salarySettlements.filter(
        (settlement) => settlement.staffId === existing.id && settlement.status !== "ANULADA" && settlement.period >= firstAffectedPeriod,
      );
      if (
        activeImpactedSettlements.length &&
        !confirmAction(
          `Este cambio salarial afecta ${activeImpactedSettlements.length} liquidacion(es) abierta(s) desde ${firstAffectedPeriod}. Confirmar el cambio con fecha efectiva ${effectiveDate}?`,
        )
      ) {
        return;
      }
    }
    setFormError("");
    const salaryHistoryEntry = salaryChanged
      ? salaryHistoryEvent(
          next,
          existing?.salaryType ?? next.salaryType,
          Number(existing?.nominalSalary ?? next.nominalSalary),
          next.salaryType,
          next.nominalSalary,
          effectiveDate,
          salaryReason,
          user.id,
          user.name,
        )
      : null;
    patchData((current) => {
      const previous = current.staff.find((staff) => staff.id === next.id);
      const staff = isNew ? [next, ...current.staff] : current.staff.map((item) => (item.id === next.id ? next : item));
      const salaryHistories = salaryHistoryEntry ? [salaryHistoryEntry, ...current.salaryHistories] : current.salaryHistories;
      return audit({ ...current, staff, salaryHistories }, isNew ? "Crear personal" : "Editar personal", "Personal", next.id, previous ?? "", next, salaryHistoryEntry?.reason);
    });
    onClose();
  };
  const updateSchedule = (day: WeekDay, patch: Partial<StaffSchedule>) => {
    setSchedule((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  };

  return (
    <Modal title={isNew ? "Agregar personal" : `Editar ${staffFullName(existing)}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        {formError && <p className="notice warning span-2">{formError}</p>}
        <p className="required-note span-2">Campos obligatorios marcados con *</p>
        <label>
          Nombre *
          <input name="firstName" defaultValue={existing?.firstName} required />
        </label>
        <label>
          Apellido *
          <input name="lastName" defaultValue={existing?.lastName} required />
        </label>
        <label>
          Documento
          <input name="documentId" defaultValue={existing?.documentId} onChange={(event) => (event.currentTarget.value = sanitizeDigits(event.currentTarget.value, 12))} />
        </label>
        <label>
          Telefono
          <input name="phone" defaultValue={existing?.phone} onChange={(event) => (event.currentTarget.value = sanitizeDigits(event.currentTarget.value, 20))} />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={existing?.email} />
        </label>
        <label>
          Fecha nacimiento
          <input name="birthDate" type="date" defaultValue={existing?.birthDate} />
        </label>
        <label className="span-2">
          Direccion
          <input name="address" defaultValue={existing?.address} />
        </label>
        <label>
          Cargo *
          <select name="position" defaultValue={existing?.position ?? ""} required>
            <option value="" disabled>
              Seleccionar cargo
            </option>
            <option value="Cajera/o">Cajera/o</option>
            <option value="Encargado/a">Encargado/a</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Limpieza">Limpieza</option>
          </select>
        </label>
        <label>
          Local *
          <select name="localId" defaultValue={existing?.localId ?? POSEIDON_LOCAL_ID} required>
            {data.locals.map((local) => (
              <option key={local.id} value={local.id}>
                {localOptionName(local)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha ingreso
          <input name="hireDate" type="date" defaultValue={existing?.hireDate ?? today()} />
        </label>
        <label>
          Estado *
          <select name="status" defaultValue={existing?.status ?? "ACTIVO"} required>
            <option value="ACTIVO">Activo</option>
            <option value="BAJA">Baja</option>
            <option value="PAPELERA">Papelera</option>
          </select>
        </label>
        <label>
          Tipo salario *
          <select name="salaryType" defaultValue={existing?.salaryType ?? "MENSUAL"} required>
            <option value="MENSUAL">Mensual</option>
            <option value="JORNAL">Jornal</option>
            <option value="HORA">Hora</option>
          </select>
        </label>
        <label>
          Salario base *
          <input name="nominalSalary" inputMode="numeric" defaultValue={moneyInputValue(existing?.nominalSalary)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
        </label>
        <label>
          Fecha efectiva salario
          <input name="salaryEffectiveDate" type="date" defaultValue={defaultSalaryEffectiveDate} />
        </label>
        <label className="span-2">
          Motivo cambio salarial
          <input name="salaryReason" placeholder="Recomendado si cambia tipo o salario base" />
        </label>
        <label>
          Adelantos acumulados
          <input name="salaryAdvanceBalance" inputMode="numeric" defaultValue={moneyInputValue(existing?.salaryAdvanceBalance)} onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} />
        </label>
        <label>
          Dias vacaciones
          <input name="vacationDays" type="number" min="0" defaultValue={existing?.vacationDays ?? 20} />
        </label>
        <label>
          Vacaciones usadas
          <input name="usedVacationDays" type="number" min="0" defaultValue={existing?.usedVacationDays ?? 0} />
        </label>
        <label>
          Contacto emergencia
          <input name="emergencyContact" defaultValue={existing?.emergencyContact} />
        </label>
        <label>
          Cuenta bancaria
          <input name="bankAccount" defaultValue={existing?.bankAccount} />
        </label>
        <section className="embedded-panel span-2">
          <div className="admin-header">
            <div>
              <h3>Dias y horarios</h3>
              <p className="helper">Base operativa. Los calculos legales finales se agregan en el modulo de salarios.</p>
            </div>
          </div>
          <div className="schedule-grid">
            {schedule.map((item) => (
              <div key={item.day}>
                <strong>{item.day}</strong>
                <label>
                  Descanso
                  <input type="checkbox" checked={item.rest} onChange={(event) => updateSchedule(item.day, { rest: event.target.checked })} />
                </label>
                <input value={item.start} onChange={(event) => updateSchedule(item.day, { start: event.target.value })} placeholder="Inicio" disabled={item.rest} />
                <input value={item.end} onChange={(event) => updateSchedule(item.day, { end: event.target.value })} placeholder="Fin" disabled={item.rest} />
              </div>
            ))}
          </div>
        </section>
        <section className="embedded-panel span-2">
          <div className="section-toolbar">
            <div>
              <h3>Historial salarial</h3>
              <p>Registro de cambios de tipo y salario base.</p>
            </div>
            <span className="close-status-pill">{salaryHistory.length} cambio(s)</span>
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  {[
                    ["effectiveDate", "Fecha efectiva"],
                    ["previousSalaryType", "Tipo anterior"],
                    ["newSalaryType", "Tipo nuevo"],
                    ["previousNominalSalary", "Salario anterior"],
                    ["newNominalSalary", "Salario nuevo"],
                    ["userName", "Usuario"],
                    ["reason", "Motivo"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button className="sort-button" type="button" onClick={() => setSalaryHistorySort((current) => nextSort(current, key as typeof salaryHistorySort.key))}>
                        {label}
                        {sortIndicator(salaryHistorySort, key as typeof salaryHistorySort.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSalaryHistory.map((history) => (
                  <tr key={history.id}>
                    <td>{history.effectiveDate}</td>
                    <td>{history.previousSalaryType}</td>
                    <td>{history.newSalaryType}</td>
                    <td>{money(history.previousNominalSalary)}</td>
                    <td>{money(history.newNominalSalary)}</td>
                    <td>{history.userName}</td>
                    <td>{history.reason || "-"}</td>
                  </tr>
                ))}
                {!salaryHistory.length && (
                  <tr>
                    <td colSpan={7}>Todavia no hay cambios salariales registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <label className="span-2">
          Notas
          <textarea name="notes" defaultValue={existing?.notes} rows={3} />
        </label>
        <div className="form-actions span-2">
          <div className="button-row end">
            <button className="button muted" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button success" type="submit">
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function AdminTrash({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const trashedStaff = data.staff.filter((staff) => staff.status === "PAPELERA");
  const trashedClients = data.clients.filter((client) => client.status === "PAPELERA");
  const [trashStaffSort, setTrashStaffSort] = useState<SortState<"visibleId" | "name" | "position" | "deletedAt">>({ key: "deletedAt", direction: "desc" });
  const [trashClientSort, setTrashClientSort] = useState<SortState<"visibleId" | "name" | "document" | "category" | "deletedAt">>({
    key: "deletedAt",
    direction: "desc",
  });
  const [error, setError] = useState("");
  const sortedTrashedStaff = [...trashedStaff].sort((left, right) => {
    const value = (staff: StaffMember) => {
      if (trashStaffSort.key === "visibleId") return Number(staff.visibleId);
      if (trashStaffSort.key === "name") return staffFullName(staff);
      if (trashStaffSort.key === "position") return staff.position;
      return staff.deletedAt ?? "";
    };
    const result = compareValues(value(left), value(right));
    return trashStaffSort.direction === "asc" ? result : -result;
  });
  const sortedTrashedClients = [...trashedClients].sort((left, right) => {
    const value = (client: Client) => {
      if (trashClientSort.key === "visibleId") return Number(client.visibleId);
      if (trashClientSort.key === "name") return client.name;
      if (trashClientSort.key === "document") return clientDocumentLabel(client);
      if (trashClientSort.key === "category") return client.category;
      return client.deletedAt ?? "";
    };
    const result = compareValues(value(left), value(right));
    return trashClientSort.direction === "asc" ? result : -result;
  });
  const restoreStaff = (staff: StaffMember) => {
    patchData((current) => {
      const previous = current.staff.find((item) => item.id === staff.id);
      const nextStaff = current.staff.map((item) => (item.id === staff.id ? { ...item, status: "BAJA" as StaffStatus, deletedAt: undefined, updatedAt: nowIso() } : item));
      const next = nextStaff.find((item) => item.id === staff.id);
      return audit({ ...current, staff: nextStaff }, "Restaurar personal", "Personal", staff.id, previous, next);
    });
  };
  const restoreClient = (client: Client) => {
    const documentType = normalizeClientDocumentType(client.documentType);
    const documentId = normalizeClientDocument(documentType, client.documentId);
    if (!documentId) {
      setError("No se puede restaurar: el cliente no tiene documento.");
      return;
    }
    if (hasClientDocumentDuplicate(data.clients, documentType, documentId, client.id)) {
      setError("No se puede restaurar: ya existe otro cliente activo o inactivo con ese documento.");
      return;
    }
    patchData((current) => {
      const previous = current.clients.find((item) => item.id === client.id);
      const clients = current.clients.map((item) => (item.id === client.id ? { ...item, status: "INACTIVO" as ClientStatus, deletedAt: undefined, updatedAt: nowIso() } : item));
      const next = clients.find((item) => item.id === client.id);
      return audit({ ...current, clients }, "Restaurar cliente", "Cliente", client.id, previous, next);
    });
  };
  const deleteStaff = (staff: StaffMember) => {
    const references = staffDeletionReferences(data, staff.id);
    if (references.length) {
      setError(`No se puede eliminar definitivamente: conserva ${referenceMessage(references)}. Mantenelo en la papelera.`);
      return;
    }
    if (!confirmAction(`Eliminar definitivamente a ${staffFullName(staff)}?`)) return;
    patchData((current) => audit({
      ...current,
      staff: current.staff.filter((item) => item.id !== staff.id),
      salaryHistories: current.salaryHistories.filter((item) => item.staffId !== staff.id),
      currentAccounts: current.currentAccounts.filter((item) => item.id !== staffAccountId(staff.id)),
    }, "Eliminar definitivo personal", "Personal", staff.id, staff, ""));
    setError("");
  };
  const deleteClient = (client: Client) => {
    const references = clientDeletionReferences(data, client.id);
    if (references.length) {
      setError(`No se puede eliminar definitivamente: conserva ${referenceMessage(references)}. Mantenelo en la papelera.`);
      return;
    }
    if (!confirmAction(`Eliminar definitivamente a ${client.name}?`)) return;
    patchData((current) => audit({ ...current, clients: current.clients.filter((item) => item.id !== client.id) }, "Eliminar definitivo cliente", "Cliente", client.id, client, ""));
    setError("");
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <h2>Papelera</h2>
          <p className="helper">Todo pasa por aca antes de eliminarse definitivamente.</p>
        </div>
        <span>{trashedStaff.length + trashedClients.length} elementos</span>
      </div>
      {error && <p className="validation error">{error}</p>}
      <section className="embedded-panel">
        <h3>Personal</h3>
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                {[
                  ["visibleId", "ID"],
                  ["name", "Nombre"],
                  ["position", "Cargo"],
                  ["deletedAt", "Eliminado"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button className="sort-button" type="button" onClick={() => setTrashStaffSort((current) => nextSort(current, key as typeof trashStaffSort.key))}>
                      {label}
                      {sortIndicator(trashStaffSort, key as typeof trashStaffSort.key)}
                    </button>
                  </th>
                ))}
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrashedStaff.map((staff) => (
                <tr key={staff.id} className="status-disused">
                  <td>{staff.visibleId}</td>
                  <td>{staffFullName(staff)}</td>
                  <td>{staff.position}</td>
                  <td>{staff.deletedAt ? formatDateTime(staff.deletedAt) : "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="button primary compact" onClick={() => restoreStaff(staff)}>
                        Restaurar
                      </button>
                      <button className="button muted compact" onClick={() => deleteStaff(staff)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!trashedStaff.length && (
                <tr>
                  <td colSpan={5}>No hay personal en papelera.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="embedded-panel">
        <h3>Clientes</h3>
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                {[
                  ["visibleId", "ID"],
                  ["name", "Cliente"],
                  ["document", "Documento"],
                  ["category", "Categoria"],
                  ["deletedAt", "Eliminado"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button className="sort-button" type="button" onClick={() => setTrashClientSort((current) => nextSort(current, key as typeof trashClientSort.key))}>
                      {label}
                      {sortIndicator(trashClientSort, key as typeof trashClientSort.key)}
                    </button>
                  </th>
                ))}
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrashedClients.map((client) => (
                <tr key={client.id} className="status-disused">
                  <td>{client.visibleId}</td>
                  <td>{client.name}</td>
                  <td>{clientDocumentLabel(client)}</td>
                  <td>{client.category}</td>
                  <td>{client.deletedAt ? formatDateTime(client.deletedAt) : "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="button primary compact" onClick={() => restoreClient(client)}>
                        Restaurar
                      </button>
                      <button className="button muted compact" onClick={() => deleteClient(client)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!trashedClients.length && (
                <tr>
                  <td colSpan={6}>No hay clientes en papelera.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

