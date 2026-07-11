import { useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui";
import { formatDateTime } from "../../../lib/dates";
import { localName } from "../../../lib/display";
import { nextShortId, shortNumberId, uid } from "../../../lib/ids";
import { machineHistoryEvent } from "../../../lib/machineHistory";
import { counter, formatCounterInput, parseCounter } from "../../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../../lib/sorting";
import type { AppData, Machine, MachineLocalHistory, MachineStatus, User } from "../../../types";
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
  audit,
  setMessage,
  onClose,
}: {
  data: AppData;
  user: User;
  machineId: string | null;
  initialLocalId?: string;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (
    current: AppData,
    action: string,
    entity: string,
    entityId: string,
    previousValue: unknown,
    newValue: unknown,
    reason?: string,
  ) => AppData;
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
    const visibleId = shortNumberId(draft.visibleId);
    if (!visibleId || !draft.name.trim()) {
      setError("ID numerico corto y nombre son obligatorios.");
      return;
    }
    const duplicate = data.machines.some(
      (machine) => machine.id !== existing?.id && shortNumberId(machine.visibleId) === visibleId,
    );
    if (duplicate) {
      setError("Ya existe una maquina con ese ID.");
      return;
    }
    if (draft.status === "DESUSO" && draft.localId !== WORKSHOP_LOCAL_ID) {
      setError("El estado Desuso solo se puede aplicar a maquinas que estan en Taller.");
      return;
    }
    if (!confirmAction(isNew ? "Confirmar creacion de esta maquina." : "Confirmar cambios de esta maquina.")) return;

    const next: Machine = {
      id: existing?.id ?? uid("machine"),
      visibleId,
      name: draft.name.trim(),
      localId: draft.localId,
      location: draft.location.trim() || (draft.localId === WORKSHOP_LOCAL_ID ? WORKSHOP_LABEL : "Salon"),
      status: draft.status as MachineStatus,
      lastIn: isNew ? 0 : parseCounter(draft.lastIn),
      lastOut: isNew ? 0 : parseCounter(draft.lastOut),
      notes: draft.notes.trim(),
    };

    patchData((current) => {
      if (isNew) {
        const history = machineHistoryEvent(next, WORKSHOP_LOCAL_ID, "AGREGADA", "Alta de maquina en taller", user.id);
        return audit(
          { ...current, machines: [...current.machines, next], machineLocalHistory: [history, ...current.machineLocalHistory] },
          "Crear maquina",
          "Maquina",
          next.id,
          "",
          next,
          "Autorizado",
        );
      }

      const machines = current.machines.map((machine) => (machine.id === next.id ? next : machine));
      const history: MachineLocalHistory[] = [];
      if (existing.localId !== next.localId) {
        history.push(
          machineHistoryEvent(next, next.localId, "MOVIDA", `Recibida desde ${localName(current, existing.localId)}`, user.id),
          machineHistoryEvent(existing, existing.localId, "MOVIDA", `Movida a ${localName(current, next.localId)}`, user.id),
        );
      }
      if (existing.lastIn !== next.lastIn || existing.lastOut !== next.lastOut) {
        history.push(
          machineHistoryEvent(
            next,
            next.localId,
            "CONTADORES",
            `Ajuste admin: IN ${counter(existing.lastIn)} -> ${counter(next.lastIn)}, OUT ${counter(existing.lastOut)} -> ${counter(next.lastOut)}`,
            user.id,
          ),
        );
      }
      if (
        !history.length ||
        existing.status !== next.status ||
        existing.name !== next.name ||
        existing.location !== next.location ||
        existing.notes !== next.notes
      ) {
        history.push(machineHistoryEvent(next, next.localId, "MODIFICADA", "Edicion administrativa", user.id));
      }
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Modificar maquina",
        "Maquina",
        next.id,
        existing,
        next,
        "Autorizado",
      );
    });
    setMessage(isNew ? "Maquina creada." : "Maquina modificada.");
    onClose();
  };

  const resetCounters = () => {
    if (!existing) return;
    if (blockingBalance) {
      setMessage(
        `No se puede resetear ${existing.name}: hay una caja abierta del ${blockingBalance.operatingDate}. Primero hay que cerrar esa caja.`,
      );
      return;
    }
    if (!confirmAction(`Confirmar reset de contadores de ${existing.name}.`)) return;
    patchData((current) => {
      const previous = current.machines.find((machine) => machine.id === existing.id);
      const nextMachine = { ...existing, lastIn: 0, lastOut: 0 };
      const machines = current.machines.map((machine) => (machine.id === existing.id ? nextMachine : machine));
      const history = machineHistoryEvent(
        existing,
        existing.localId,
        "RESET",
        `Reset admin: IN ${counter(existing.lastIn)} -> 0, OUT ${counter(existing.lastOut)} -> 0`,
        user.id,
      );
      return audit(
        { ...current, machines, machineLocalHistory: [history, ...current.machineLocalHistory] },
        "Reset contadores",
        "Maquina",
        existing.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Contadores reiniciados.");
    onClose();
  };

  const sendToWorkshop = () => {
    if (!existing || existing.localId === WORKSHOP_LOCAL_ID || !confirmAction(`Confirmar envio de ${existing.name} al Taller.`)) return;
    patchData((current) => {
      const previous = current.machines.find((machine) => machine.id === existing.id);
      const nextMachine = { ...existing, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
      const machines = current.machines.map((machine) => (machine.id === existing.id ? nextMachine : machine));
      const history = [
        machineHistoryEvent(existing, existing.localId, "MOVIDA", `Enviada a ${WORKSHOP_LABEL}`, user.id),
        machineHistoryEvent(
          nextMachine,
          WORKSHOP_LOCAL_ID,
          "MOVIDA",
          `Recibida desde ${localName(current, existing.localId)}`,
          user.id,
        ),
      ];
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Enviar maquina al taller",
        "Maquina",
        existing.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Maquina enviada al taller.");
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    if (!isInWorkshop) {
      setError("Para eliminar una maquina primero hay que enviarla al taller.");
      return;
    }
    if (hasReadings) {
      setError("No se puede eliminar una maquina que tenga recaudaciones.");
      return;
    }
    if (!confirmAction(`Confirmar eliminacion definitiva de la maquina ${existing.name}.`)) return;
    patchData((current) => {
      const machines = current.machines.filter((machine) => machine.id !== existing.id);
      const history = machineHistoryEvent(existing, existing.localId, "QUITADA", "Baja definitiva desde taller", user.id);
      return audit(
        { ...current, machines, machineLocalHistory: [history, ...current.machineLocalHistory] },
        "Eliminar maquina",
        "Maquina",
        existing.id,
        existing,
        "",
        "Autorizado",
      );
    });
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
