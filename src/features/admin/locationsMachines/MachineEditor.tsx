import { useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui";
import { formatDateTime } from "../../../lib/dates";
import { localName } from "../../../lib/display";
import { nextShortId } from "../../../lib/ids";
import { counter, formatCounterInput, parseCounter } from "../../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../../lib/sorting";
import type { AppData, MachineLocalHistory, MachineStatus, User } from "../../../types";
import { commandContext } from "../../../application/command";
import {
  deleteMachineCommand,
  moveMachineToWorkshopCommand,
  resetMachineCountersCommand,
  saveMachineCommand,
} from "../../../application/machines/machineCommands";
import {
  WORKSHOP_LABEL,
  WORKSHOP_LOCAL_ID,
  confirmAction,
  localOptionName,
  sanitizeNumberId,
} from "./shared";

export function AdminMachineEditor({
  data,
  user,
  machineId,
  initialLocalId,
  patchData,
  setMessage,
  onClose,
}: {
  data: AppData;
  user: User;
  machineId: string | null;
  initialLocalId?: string;
  patchData: (updater: (current: AppData) => AppData) => void;
  setMessage: (message: string) => void;
  onClose: () => void;
}) {
  const existing = machineId ? data.machines.find((machine) => machine.id === machineId) : undefined;
  const nextVisibleId = nextShortId(data.machines.map((machine) => machine.visibleId));
  const [draft, setDraft] = useState({
    visibleId: existing?.visibleId ?? nextVisibleId,
    name: existing?.name ?? "",
    localId: existing?.localId ?? initialLocalId ?? WORKSHOP_LOCAL_ID,
    location: existing?.location ?? WORKSHOP_LABEL,
    status: existing?.status ?? "ACTIVA",
    lastIn: counter(existing?.lastIn ?? 0),
    lastOut: counter(existing?.lastOut ?? 0),
    notes: existing?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [machineHistorySort, setMachineHistorySort] = useState<SortState<"createdAt" | "local" | "action" | "detail">>({
    key: "createdAt",
    direction: "desc",
  });
  const isNew = !existing;
  const hasReadings = Boolean(existing && data.readings.some((reading) => reading.machineId === existing.id));
  const isInWorkshop = existing?.localId === WORKSHOP_LOCAL_ID;
  const blockingBalance = existing
    ? data.balances.find((balance) => balance.localId === existing.localId && balance.status === "EN_PROCESO")
    : undefined;
  const machineHistory = existing
    ? data.machineLocalHistory
        .filter((event) => event.machineId === existing.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const machineHistoryValue = (event: MachineLocalHistory): string | number => {
    if (machineHistorySort.key === "createdAt") return event.createdAt;
    if (machineHistorySort.key === "local") return localName(data, event.localId);
    if (machineHistorySort.key === "action") return event.action;
    return event.detail;
  };
  const sortedMachineHistory = [...machineHistory].sort((a, b) => {
    const result = compareValues(machineHistoryValue(a), machineHistoryValue(b));
    return machineHistorySort.direction === "asc" ? result : -result;
  });

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmAction(isNew ? "Confirmar creacion de esta maquina." : "Confirmar cambios de esta maquina.")) return;
    const result = saveMachineCommand(
      data,
      {
        machineId: existing?.id,
        visibleId: draft.visibleId,
        name: draft.name,
        localId: draft.localId,
        location: draft.location,
        status: draft.status as MachineStatus,
        lastIn: parseCounter(draft.lastIn),
        lastOut: parseCounter(draft.lastOut),
        notes: draft.notes,
      },
      commandContext(user, "ADMINISTRADOR"),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage(isNew ? "Maquina creada." : "Maquina modificada.");
    onClose();
  };

  const resetCounters = () => {
    if (!existing || !confirmAction(`Confirmar reset de contadores de ${existing.name}.`)) return;
    const result = resetMachineCountersCommand(data, existing.id, commandContext(user, "ADMINISTRADOR"));
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Contadores reiniciados.");
    onClose();
  };

  const sendToWorkshop = () => {
    if (!existing || existing.localId === WORKSHOP_LOCAL_ID || !confirmAction(`Confirmar envio de ${existing.name} al Taller.`)) return;
    const result = moveMachineToWorkshopCommand(data, existing.id, commandContext(user, "ADMINISTRADOR"));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Maquina enviada al taller.");
    onClose();
  };

  const remove = () => {
    if (!existing || !confirmAction(`Confirmar eliminacion definitiva de la maquina ${existing.name}.`)) return;
    const result = deleteMachineCommand(data, existing.id, commandContext(user, "ADMINISTRADOR"));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Maquina eliminada.");
    onClose();
  };

  return (
    <Modal title={isNew ? "Agregar maquina" : `Editar maquina ${existing.visibleId}`} onClose={onClose} wide>
      <p className="helper">Antes de aplicar una accion se pide reconfirmacion.</p>
      <form className="form-grid" onSubmit={save}>
        <label>
          ID
          <input
            value={draft.visibleId}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setDraft((current) => ({ ...current, visibleId: sanitizeNumberId(event.target.value) }))}
          />
        </label>
        <label>
          Maquina
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Local
          <select
            value={draft.localId}
            disabled={isNew}
            onChange={(event) => setDraft((current) => ({ ...current, localId: event.target.value }))}
          >
            <option value={WORKSHOP_LOCAL_ID}>{WORKSHOP_LABEL}</option>
            {data.locals.map((local) => (
              <option key={local.id} value={local.id}>
                {localOptionName(local)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as MachineStatus }))}
          >
            <option value="ACTIVA">Activa</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="INACTIVA">Inactiva</option>
            {draft.localId === WORKSHOP_LOCAL_ID && <option value="DESUSO">Desuso</option>}
          </select>
        </label>
        <label>
          Ubicacion
          <input
            value={draft.location}
            disabled={isNew}
            onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
          />
        </label>
        <label>
          IN actual
          <input
            value={draft.lastIn}
            disabled={isNew}
            onChange={(event) => setDraft((current) => ({ ...current, lastIn: formatCounterInput(event.target.value) }))}
            inputMode="numeric"
          />
        </label>
        <label>
          OUT actual
          <input
            value={draft.lastOut}
            disabled={isNew}
            onChange={(event) => setDraft((current) => ({ ...current, lastOut: formatCounterInput(event.target.value) }))}
            inputMode="numeric"
          />
        </label>
        <label>
          Observacion
          <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        {!isNew && (
          <section className="embedded-panel span-2">
            <h3>Historial de maquina</h3>
            <div className="table-wrap compact-table">
              <table className="data-table compact-data-table">
                <thead>
                  <tr>
                    {[
                      ["createdAt", "Fecha"],
                      ["local", "Local"],
                      ["action", "Movimiento"],
                      ["detail", "Detalle"],
                    ].map(([key, label]) => (
                      <th key={key}>
                        <button
                          className="sort-button"
                          type="button"
                          onClick={() => setMachineHistorySort((current) => nextSort(current, key as typeof machineHistorySort.key))}
                        >
                          {label}
                          {sortIndicator(machineHistorySort, key as typeof machineHistorySort.key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMachineHistory.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDateTime(event.createdAt)}</td>
                      <td>{localName(data, event.localId)}</td>
                      <td>{event.action}</td>
                      <td>{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {blockingBalance && (
          <p className="notice span-2">
            Hay una caja abierta del {blockingBalance.operatingDate}. Para resetear contadores de esta maquina primero hay que cerrar esa caja.
          </p>
        )}
        {error && <p className="validation error span-2">{error}</p>}
        <div className="form-actions span-2">
          <div className="button-row end">
            {!isNew && (
              <>
                <button className="button muted" type="button" disabled={Boolean(blockingBalance)} onClick={resetCounters}>
                  Reset
                </button>
                {!isInWorkshop && (
                  <button className="button muted" type="button" onClick={sendToWorkshop}>
                    Enviar al taller
                  </button>
                )}
                {isInWorkshop && (
                  <button className="button danger" type="button" disabled={hasReadings} onClick={remove}>
                    Eliminar maquina
                  </button>
                )}
              </>
            )}
            <button className="button success" type="submit">
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
