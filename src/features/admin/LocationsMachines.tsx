import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { AppData, AuditEvent, Balance, Local, LocalImage, Machine, MachineLocalHistory, MachineStatus, User } from "../../types";
import { totalsForBalance } from "../../lib/cashTotals";
import { sanitizeDigits } from "../../lib/clients";
import {
  createLocalBankCurrentAccount,
  createLocalCashCurrentAccount,
  ensureLocalCurrentAccounts,
  localBankAccountId,
  localCashAccountId,
} from "../../lib/currentAccounts";
import { formatDateTime } from "../../lib/dates";
import { balanceVisibleId, localName } from "../../lib/display";
import { nextShortId, shortNumberId, uid } from "../../lib/ids";
import { machineHistoryEvent } from "../../lib/machineHistory";
import { counter, formatCounterInput, money, parseCounter } from "../../lib/money";
import { readColumnPreference, writeColumnPreference } from "../../lib/storage";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { ColumnChooser, InfoCard, Modal, type TableColumn } from "../../components/ui";

const POSEIDON_LOCAL_ID = "1";
const WORKSHOP_LOCAL_ID = "taller";
const WORKSHOP_LABEL = "Taller";
const sanitizeNumberId = (value: string) => value.replace(/\D/g, "").slice(0, 4);
const localStatusClass = (status: Local["status"]) => (status === "ACTIVO" ? "status-active" : status === "CERRADO" ? "status-closed" : "status-inactive");
const machineStatusClass = (status: MachineStatus) =>
  status === "ACTIVA" ? "status-active" : status === "MANTENIMIENTO" ? "status-maintenance" : status === "DESUSO" ? "status-disused" : "status-inactive";
const localOptionName = (local: Local) => `${local.id} - ${local.name}`;
const mapsHref = (local: Local) =>
  local.googleMapsUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.address || local.name)}`;
const confirmAction = (message: string) => window.confirm(message);
const auditUserName = (data: AppData, event: AuditEvent) => event.userName || data.users.find((user) => user.id === event.userId)?.name || "Sistema";
const parseAuditValue = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

function readLocalImages(files: FileList): Promise<LocalImage[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<LocalImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: uid("local-image"),
              name: file.name,
              dataUrl: String(reader.result ?? ""),
              createdAt: new Date().toISOString(),
            });
          reader.onerror = () => resolve({ id: uid("local-image"), name: file.name, dataUrl: "", createdAt: new Date().toISOString() });
          reader.readAsDataURL(file);
        }),
    ),
  );
}

type MachineModalState = {
  machineId: string | null;
  localId?: string;
};

type LocalHistoryTab = "resumen" | "datos" | "maquinas" | "estados" | "recaudaciones" | "auditoria";
type MachineHistoryTab = "resumen" | "locales" | "contadores" | "auditoria";
type LocalColumnKey =
  | "id"
  | "name"
  | "tenantName"
  | "phone"
  | "email"
  | "address"
  | "google"
  | "status"
  | "machines"
  | "images"
  | "balances"
  | "actions";
type MachineColumnKey = "visibleId" | "name" | "local" | "location" | "status" | "lastIn" | "lastOut" | "notes" | "actions";
type BalanceColumnKey =
  | "operatingDate"
  | "local"
  | "status"
  | "initialFund"
  | "declaredCash"
  | "nextBase"
  | "withdrawal"
  | "cashDifference"
  | "openedBy"
  | "closedBy"
  | "actions";

const LOCAL_COLUMNS_STORAGE_KEY = "poseidon-locales-columnas-v2";
const MACHINE_COLUMNS_STORAGE_KEY = "poseidon-maquinas-columnas-v2";
const BALANCE_COLUMNS_STORAGE_KEY = "poseidon-caja-diaria-columnas-v1";

const localColumns: TableColumn<LocalColumnKey>[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Local", sortable: true },
  { key: "tenantName", label: "Locatario", sortable: true },
  { key: "phone", label: "Telefono", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "address", label: "Direccion", sortable: true },
  { key: "google", label: "Google" },
  { key: "status", label: "Estado", sortable: true },
  { key: "machines", label: "Maquinas", sortable: true },
  { key: "images", label: "Imagenes", sortable: true },
  { key: "balances", label: "Recaudaciones", sortable: true },
  { key: "actions", label: "Acciones" },
];

const machineColumns: TableColumn<MachineColumnKey>[] = [
  { key: "visibleId", label: "ID", sortable: true },
  { key: "name", label: "Maquina", sortable: true },
  { key: "local", label: "Local", sortable: true },
  { key: "location", label: "Ubicacion", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "lastIn", label: "IN actual", sortable: true },
  { key: "lastOut", label: "OUT actual", sortable: true },
  { key: "notes", label: "Obs.", sortable: true },
  { key: "actions", label: "Acciones" },
];
const fixedLocalColumns: LocalColumnKey[] = ["id", "name", "status", "machines", "balances", "actions"];
const fixedMachineColumns: MachineColumnKey[] = ["visibleId", "name", "local", "status", "lastIn", "lastOut", "actions"];
const fixedBalanceColumns: BalanceColumnKey[] = ["operatingDate", "status", "initialFund", "declaredCash", "cashDifference", "actions"];

export function AdminMachines({
  data,
  user,
  patchData,
  audit,
  setMessage,
  onlyWorkshop = false,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onlyWorkshop?: boolean;
}) {
  const [editor, setEditor] = useState<MachineModalState | null>(null);
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<MachineColumnKey[]>(() =>
    readColumnPreference(MACHINE_COLUMNS_STORAGE_KEY, machineColumns, fixedMachineColumns),
  );
  const [sort, setSort] = useState<SortState<MachineColumnKey>>({ key: "visibleId", direction: "asc" });
  const [disusedSort, setDisusedSort] = useState<SortState<"visibleId" | "name" | "lastIn" | "lastOut">>({ key: "visibleId", direction: "asc" });
  useEffect(() => {
    writeColumnPreference(MACHINE_COLUMNS_STORAGE_KEY, visibleColumns);
  }, [visibleColumns]);
  const toggleColumn = (key: MachineColumnKey) => {
    setVisibleColumns((current) => {
      if (fixedMachineColumns.includes(key)) return current;
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  };
  const machineSortValue = (machine: Machine, key: MachineColumnKey): string | number => {
    if (key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
    if (key === "local") return localName(data, machine.localId);
    if (key === "lastIn") return machine.lastIn;
    if (key === "lastOut") return machine.lastOut;
    if (key === "actions") return "";
    return machine[key] ?? "";
  };
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID);
  const disusedWorkshopMachines = workshopMachines.filter((machine) => machine.status === "DESUSO");
  const disusedSortValue = (machine: Machine): string | number => {
    if (disusedSort.key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
    if (disusedSort.key === "name") return machine.name;
    if (disusedSort.key === "lastIn") return machine.lastIn;
    return machine.lastOut;
  };
  const sortedDisusedWorkshopMachines = [...disusedWorkshopMachines].sort((a, b) => {
    const result = compareValues(disusedSortValue(a), disusedSortValue(b));
    return disusedSort.direction === "asc" ? result : -result;
  });
  const machinesSource = onlyWorkshop ? workshopMachines.filter((machine) => machine.status !== "DESUSO") : data.machines.filter((machine) => machine.status !== "DESUSO");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMachines = normalizedQuery
    ? machinesSource.filter((machine) =>
        [machine.visibleId, machine.name, localName(data, machine.localId), machine.location, machine.status, machine.notes]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : machinesSource;
  const sortedMachines = [...filteredMachines].sort((a, b) => {
    const result = compareValues(machineSortValue(a, sort.key), machineSortValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const visibleMachineColumns = machineColumns.filter((column) => visibleColumns.includes(column.key));
  const historyMachine = historyMachineId ? data.machines.find((machine) => machine.id === historyMachineId) : undefined;

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">
            {onlyWorkshop
              ? "Maquinas disponibles antes de asignarlas a locales. Las de estado Desuso quedan en su apartado."
              : "La grilla muestra el estado actual. Para modificar, usar la ventana flotante."}
          </p>
        </div>
        <div className="admin-header-actions">
          {onlyWorkshop && <span>{disusedWorkshopMachines.length} en desuso</span>}
          <span>{machinesSource.length} maquinas</span>
          <button className="button success compact" onClick={() => setEditor({ machineId: null })}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar maquina, local, estado..." />
        <ColumnChooser label="Columnas" columns={machineColumns} visible={visibleColumns} fixed={fixedMachineColumns} onToggle={toggleColumn} />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {visibleMachineColumns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                      {column.label}
                      {sortIndicator(sort, column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMachines.map((machine) => (
              <tr key={machine.id} className={machineStatusClass(machine.status)}>
                {visibleColumns.includes("visibleId") && <td>{machine.visibleId}</td>}
                {visibleColumns.includes("name") && (
                  <td>
                    <button className="link-button" onClick={() => setHistoryMachineId(machine.id)}>
                      {machine.name}
                    </button>
                  </td>
                )}
                {visibleColumns.includes("local") && <td>{localName(data, machine.localId)}</td>}
                {visibleColumns.includes("location") && <td>{machine.location}</td>}
                {visibleColumns.includes("status") && <td>{machine.status}</td>}
                {visibleColumns.includes("lastIn") && <td>{counter(machine.lastIn)}</td>}
                {visibleColumns.includes("lastOut") && <td>{counter(machine.lastOut)}</td>}
                {visibleColumns.includes("notes") && <td>{machine.notes || "-"}</td>}
                {visibleColumns.includes("actions") && (
                  <td>
                    <div className="table-actions">
                      <button className="button primary compact" onClick={() => setEditor({ machineId: machine.id })}>
                        Editar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onlyWorkshop && (
        <section className="embedded-panel">
          <div className="admin-header">
            <div>
              <h3>Maquinas en desuso</h3>
              <p className="helper">Maquinas con estado Desuso dentro del taller. Desde aca se pueden revisar, editar o eliminar si nunca tuvieron recaudaciones.</p>
            </div>
            <span>{disusedWorkshopMachines.length} maquinas</span>
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  {[
                    ["visibleId", "ID"],
                    ["name", "Maquina"],
                    ["lastIn", "IN actual"],
                    ["lastOut", "OUT actual"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button className="sort-button" type="button" onClick={() => setDisusedSort((current) => nextSort(current, key as typeof disusedSort.key))}>
                        {label}
                        {sortIndicator(disusedSort, key as typeof disusedSort.key)}
                      </button>
                    </th>
                  ))}
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {sortedDisusedWorkshopMachines.map((machine) => (
                  <tr key={machine.id} className={machineStatusClass(machine.status)}>
                    <td>{machine.visibleId}</td>
                    <td>
                      <button className="link-button" onClick={() => setHistoryMachineId(machine.id)}>
                        {machine.name}
                      </button>
                    </td>
                    <td>{counter(machine.lastIn)}</td>
                    <td>{counter(machine.lastOut)}</td>
                    <td>
                      <button className="button primary compact" onClick={() => setEditor({ machineId: machine.id })}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {!disusedWorkshopMachines.length && (
                  <tr>
                    <td colSpan={5}>No hay maquinas en desuso.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {historyMachine && <MachineHistoryModal data={data} machine={historyMachine} onClose={() => setHistoryMachineId(null)} />}
      {editor && (
        <AdminMachineEditor
          data={data}
          user={user}
          machineId={editor.machineId}
          initialLocalId={editor.localId}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

function AdminMachineEditor({
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
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
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
  const blockingBalance = existing ? data.balances.find((balance) => balance.localId === existing.localId && balance.status === "EN_PROCESO") : undefined;
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
    const duplicate = data.machines.some((machine) => machine.id !== existing?.id && shortNumberId(machine.visibleId) === visibleId);
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
      if (!history.length || existing.status !== next.status || existing.name !== next.name || existing.location !== next.location || existing.notes !== next.notes) {
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
      setMessage(`No se puede resetear ${existing.name}: hay una caja abierta del ${blockingBalance.operatingDate}. Primero hay que cerrar esa caja.`);
      return;
    }
    if (!confirmAction(`Confirmar reset de contadores de ${existing.name}.`)) return;
    patchData((current) => {
      const previous = current.machines.find((machine) => machine.id === existing.id);
      const nextMachine = { ...existing, lastIn: 0, lastOut: 0 };
      const machines = current.machines.map((machine) => (machine.id === existing.id ? nextMachine : machine));
      const history = machineHistoryEvent(existing, existing.localId, "RESET", `Reset admin: IN ${counter(existing.lastIn)} -> 0, OUT ${counter(existing.lastOut)} -> 0`, user.id);
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
        machineHistoryEvent(nextMachine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde ${localName(current, existing.localId)}`, user.id),
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
          <input value={draft.visibleId} inputMode="numeric" maxLength={4} onChange={(event) => setDraft((current) => ({ ...current, visibleId: sanitizeNumberId(event.target.value) }))} />
        </label>
        <label>
          Maquina
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Local
          <select value={draft.localId} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, localId: event.target.value }))}>
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
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as MachineStatus }))}>
            <option value="ACTIVA">Activa</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="INACTIVA">Inactiva</option>
            {draft.localId === WORKSHOP_LOCAL_ID && <option value="DESUSO">Desuso</option>}
          </select>
        </label>
        <label>
          Ubicacion
          <input value={draft.location} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} />
        </label>
        <label>
          IN actual
          <input value={draft.lastIn} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, lastIn: formatCounterInput(event.target.value) }))} inputMode="numeric" />
        </label>
        <label>
          OUT actual
          <input value={draft.lastOut} disabled={isNew} onChange={(event) => setDraft((current) => ({ ...current, lastOut: formatCounterInput(event.target.value) }))} inputMode="numeric" />
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
                        <button className="sort-button" type="button" onClick={() => setMachineHistorySort((current) => nextSort(current, key as typeof machineHistorySort.key))}>
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

export function AdminLocals({
  data,
  user,
  patchData,
  audit,
  setMessage,
}: {
  data: AppData;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
}) {
  const [localEditorId, setLocalEditorId] = useState<string | null | undefined>(undefined);
  const [machinesLocalId, setMachinesLocalId] = useState<string | null>(null);
  const [machineEditor, setMachineEditor] = useState<MachineModalState | null>(null);
  const [machinePickerLocalId, setMachinePickerLocalId] = useState<string | null>(null);
  const [historyLocalId, setHistoryLocalId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const machinesLocal = machinesLocalId ? data.locals.find((local) => local.id === machinesLocalId) : undefined;
  const historyLocal = historyLocalId ? data.locals.find((local) => local.id === historyLocalId) : undefined;
  const pickerLocal = machinePickerLocalId ? data.locals.find((local) => local.id === machinePickerLocalId) : undefined;
  const workshopCount = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID).length;
  const [visibleColumns, setVisibleColumns] = useState<LocalColumnKey[]>(() =>
    readColumnPreference(LOCAL_COLUMNS_STORAGE_KEY, localColumns, fixedLocalColumns),
  );
  const [sort, setSort] = useState<SortState<LocalColumnKey>>({ key: "id", direction: "asc" });
  useEffect(() => {
    writeColumnPreference(LOCAL_COLUMNS_STORAGE_KEY, visibleColumns);
  }, [visibleColumns]);
  const toggleColumn = (key: LocalColumnKey) => {
    setVisibleColumns((current) => {
      if (fixedLocalColumns.includes(key)) return current;
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  };
  const machinesCountFor = (localId: string) => data.machines.filter((machine) => machine.localId === localId).length;
  const balancesCountFor = (localId: string) => data.balances.filter((balance) => balance.localId === localId).length;
  const localSortValue = (local: Local, key: LocalColumnKey): string | number => {
    if (key === "id") return Number(local.id) || local.id;
    if (key === "machines") return machinesCountFor(local.id);
    if (key === "images") return local.images.length;
    if (key === "balances") return balancesCountFor(local.id);
    if (key === "google") return mapsHref(local);
    if (key === "actions") return "";
    return local[key] ?? "";
  };
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLocals = normalizedQuery
    ? data.locals.filter((local) =>
        [local.id, local.name, local.tenantName, local.phone, local.email, local.address, local.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : data.locals;
  const sortedLocals = [...filteredLocals].sort((a, b) => {
    const result = compareValues(localSortValue(a, sort.key), localSortValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const visibleLocalColumns = localColumns.filter((column) => visibleColumns.includes(column.key));

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">La tabla es la vista principal. El estado cambia el color de la fila.</p>
        </div>
        <div className="admin-header-actions">
          <span>{workshopCount} en taller</span>
          <span>{data.locals.length} locales</span>
          <button className="button success compact" onClick={() => setLocalEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar local, locatario, telefono..." />
        <ColumnChooser label="Columnas" columns={localColumns} visible={visibleColumns} fixed={fixedLocalColumns} onToggle={toggleColumn} />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {visibleLocalColumns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                      {column.label}
                      {sortIndicator(sort, column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedLocals.map((local) => {
              const machinesCount = machinesCountFor(local.id);
              const balancesCount = balancesCountFor(local.id);
              return (
                <tr key={local.id} className={localStatusClass(local.status)}>
                  {visibleColumns.includes("id") && <td>{local.id}</td>}
                  {visibleColumns.includes("name") && (
                    <td>
                      <button className="link-button" onClick={() => setHistoryLocalId(local.id)}>
                        {local.name}
                      </button>
                    </td>
                  )}
                  {visibleColumns.includes("tenantName") && <td>{local.tenantName || "-"}</td>}
                  {visibleColumns.includes("phone") && <td>{local.phone || "-"}</td>}
                  {visibleColumns.includes("email") && <td>{local.email || "-"}</td>}
                  {visibleColumns.includes("address") && <td>{local.address}</td>}
                  {visibleColumns.includes("google") && (
                    <td>
                      <a className="link-button" href={mapsHref(local)} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    </td>
                  )}
                  {visibleColumns.includes("status") && <td>{local.status}</td>}
                  {visibleColumns.includes("machines") && (
                    <td>
                      <button className="link-button count-button" onClick={() => setMachinesLocalId(local.id)}>
                        {machinesCount}
                      </button>
                    </td>
                  )}
                  {visibleColumns.includes("images") && <td>{local.images.length}</td>}
                  {visibleColumns.includes("balances") && <td>{balancesCount}</td>}
                  {visibleColumns.includes("actions") && (
                    <td>
                      <div className="table-actions">
                        <button className="button primary compact" onClick={() => setLocalEditorId(local.id)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {localEditorId !== undefined && (
        <AdminLocalEditor
          data={data}
          user={user}
          localId={localEditorId}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setLocalEditorId(undefined)}
          onAddMachine={(localId) => setMachinePickerLocalId(localId)}
        />
      )}
      {machinesLocal && (
        <LocalMachinesModal
          data={data}
          user={user}
          local={machinesLocal}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setMachinesLocalId(null)}
          onAddMachine={() => setMachinePickerLocalId(machinesLocal.id)}
          onEditMachine={(machineId) => setMachineEditor({ machineId })}
        />
      )}
      {historyLocal && <LocalHistoryModal data={data} local={historyLocal} onClose={() => setHistoryLocalId(null)} />}
      {pickerLocal && (
        <WorkshopMachinePicker
          data={data}
          user={user}
          local={pickerLocal}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setMachinePickerLocalId(null)}
        />
      )}
      {machineEditor && (
        <AdminMachineEditor
          data={data}
          user={user}
          machineId={machineEditor.machineId}
          initialLocalId={machineEditor.localId}
          patchData={patchData}
          audit={audit}
          setMessage={setMessage}
          onClose={() => setMachineEditor(null)}
        />
      )}
    </section>
  );
}

function LocalMachinesModal({
  data,
  user,
  local,
  patchData,
  audit,
  setMessage,
  onClose,
  onAddMachine,
  onEditMachine,
}: {
  data: AppData;
  user: User;
  local: Local;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
  onAddMachine: () => void;
  onEditMachine: (machineId: string) => void;
}) {
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const machines = data.machines.filter((machine) => machine.localId === local.id);
  const historyMachine = historyMachineId ? data.machines.find((machine) => machine.id === historyMachineId) : undefined;
  const history = data.machineLocalHistory
    .filter((event) => event.localId === local.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const normalizedQuery = historyQuery.trim().toLowerCase();
  const visibleHistory = normalizedQuery
    ? history.filter((event) =>
        [formatDateTime(event.createdAt), event.machineVisibleId, event.machineName, event.action, event.detail]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : history;
  const sendToWorkshop = (machine: Machine) => {
    if (!confirmAction(`Confirmar envio de ${machine.name} al Taller.`)) return;
    patchData((current) => {
      const previous = current.machines.find((item) => item.id === machine.id);
      const nextMachine = { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
      const machinesNext = current.machines.map((item) => (item.id === machine.id ? nextMachine : item));
      const historyNext = [
        machineHistoryEvent(machine, local.id, "MOVIDA", `Enviada a ${WORKSHOP_LABEL}`, user.id),
        machineHistoryEvent(nextMachine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde ${local.name}`, user.id),
      ];
      return audit(
        { ...current, machines: machinesNext, machineLocalHistory: [...historyNext, ...current.machineLocalHistory] },
        "Enviar maquina al taller",
        "Maquina",
        machine.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Maquina enviada al taller.");
  };

  return (
    <Modal title={`Maquinas de ${local.name}`} onClose={onClose} wide>
      <div className="modal-toolbar">
        <span>Local ID {local.id}</span>
        <button className="button success compact" onClick={onAddMachine}>
          Agregar maquina
        </button>
      </div>
      <div className="table-wrap compact-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Maquina</th>
              <th>Estado</th>
              <th>Ubicacion</th>
              <th>IN actual</th>
              <th>OUT actual</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => (
              <tr key={machine.id} className={machineStatusClass(machine.status)}>
                <td>{machine.visibleId}</td>
                <td>
                  <button className="link-button" onClick={() => setHistoryMachineId(machine.id)}>
                    {machine.name}
                  </button>
                </td>
                <td>{machine.status}</td>
                <td>{machine.location}</td>
                <td>{counter(machine.lastIn)}</td>
                <td>{counter(machine.lastOut)}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => onEditMachine(machine.id)}>
                      Editar
                    </button>
                    <button className="button muted compact" onClick={() => sendToWorkshop(machine)}>
                      Enviar al taller
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!machines.length && (
              <tr>
                <td colSpan={7}>No hay maquinas asociadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3 className="modal-section-title">Historial de maquinas</h3>
      <input
        className="search-input"
        value={historyQuery}
        onChange={(event) => setHistoryQuery(event.target.value)}
        placeholder="Buscar por fecha, maquina, movimiento o detalle"
      />
      <div className="table-wrap compact-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>ID</th>
              <th>Maquina</th>
              <th>Movimiento</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {visibleHistory.map((event) => (
              <tr key={event.id}>
                <td>{formatDateTime(event.createdAt)}</td>
                <td>{event.machineVisibleId}</td>
                <td>{event.machineName}</td>
                <td>{event.action}</td>
                <td>{event.detail}</td>
              </tr>
            ))}
            {!visibleHistory.length && (
              <tr>
                <td colSpan={5}>Sin resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {historyMachine && <MachineHistoryModal data={data} machine={historyMachine} onClose={() => setHistoryMachineId(null)} />}
    </Modal>
  );
}

function WorkshopMachinePicker({
  data,
  user,
  local,
  patchData,
  audit,
  setMessage,
  onClose,
}: {
  data: AppData;
  user: User;
  local: Local;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID && machine.status !== "DESUSO");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleMachines = normalizedQuery
    ? workshopMachines.filter((machine) => [machine.visibleId, machine.name, machine.status, machine.notes].join(" ").toLowerCase().includes(normalizedQuery))
    : workshopMachines;

  const assign = () => {
    if (!selectedIds.length) {
      setError("Seleccione al menos una maquina del taller.");
      return;
    }
    if (!confirmAction(`Confirmar asignacion de ${selectedIds.length} maquina(s) a ${local.name}.`)) return;

    patchData((current) => {
      const selectedMachines = current.machines.filter((machine) => selectedIds.includes(machine.id));
      const machines = current.machines.map((machine) =>
        selectedIds.includes(machine.id) ? { ...machine, localId: local.id, location: local.name } : machine,
      );
      const history = selectedMachines.flatMap((machine) => [
        machineHistoryEvent(machine, local.id, "MOVIDA", `Asignada desde ${WORKSHOP_LABEL}`, user.id),
        machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Movida al local ${local.name}`, user.id),
      ]);
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Asignar maquinas a local",
        "Local",
        local.id,
        "",
        { localId: local.id, machineIds: selectedIds },
        "Autorizado",
      );
    });
    setMessage(`${selectedIds.length} maquina(s) asignada(s) a ${local.name}.`);
    onClose();
  };

  return (
    <Modal title={`Asignar maquinas a ${local.name}`} onClose={onClose} wide>
      <div className="modal-toolbar">
        <span>{workshopMachines.length} disponibles en Taller</span>
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar maquina" />
      </div>
      <div className="table-wrap compact-table">
        <table className="data-table compact-data-table">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Maquina</th>
              <th>Estado</th>
              <th>IN</th>
              <th>OUT</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {visibleMachines.map((machine) => (
              <tr key={machine.id} className={machineStatusClass(machine.status)}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(machine.id)}
                    onChange={(event) =>
                      setSelectedIds((current) => (event.target.checked ? [...current, machine.id] : current.filter((id) => id !== machine.id)))
                    }
                  />
                </td>
                <td>{machine.visibleId}</td>
                <td>{machine.name}</td>
                <td>{machine.status}</td>
                <td>{counter(machine.lastIn)}</td>
                <td>{counter(machine.lastOut)}</td>
                <td>{machine.notes || "-"}</td>
              </tr>
            ))}
            {!visibleMachines.length && (
              <tr>
                <td colSpan={7}>No hay maquinas disponibles.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <p className="validation error">{error}</p>}
      <div className="button-row end">
        <button className="button success" type="button" onClick={assign}>
          Asignar seleccionadas
        </button>
      </div>
    </Modal>
  );
}

function MachineHistoryModal({ data, machine, onClose }: { data: AppData; machine: Machine; onClose: () => void }) {
  const [tab, setTab] = useState<MachineHistoryTab>("resumen");
  const [historySort, setHistorySort] = useState<SortState<"createdAt" | "local" | "action" | "detail">>({ key: "createdAt", direction: "desc" });
  const [readingSort, setReadingSort] = useState<SortState<"operatingDate" | "status" | "inPrevious" | "inActual" | "outPrevious" | "outActual" | "result" | "observation">>({
    key: "operatingDate",
    direction: "desc",
  });
  const [auditSort, setAuditSort] = useState<SortState<"createdAt" | "action" | "user" | "reason">>({ key: "createdAt", direction: "desc" });
  const history = data.machineLocalHistory
    .filter((event) => event.machineId === machine.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const readings = data.readings
    .filter((reading) => reading.machineId === machine.id)
    .map((reading) => ({
      reading,
      balance: data.balances.find((balance) => balance.id === reading.balanceId),
    }))
    .filter((item) => item.balance)
    .sort((a, b) => String(b.balance?.operatingDate).localeCompare(String(a.balance?.operatingDate)));
  const machineAudits = data.audit
    .filter((event) => event.entity === "Maquina" && event.entityId === machine.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const historyValue = (event: MachineLocalHistory): string | number => {
    if (historySort.key === "createdAt") return event.createdAt;
    if (historySort.key === "local") return localName(data, event.localId);
    if (historySort.key === "action") return event.action;
    return event.detail;
  };
  const sortedHistory = [...history].sort((a, b) => {
    const result = compareValues(historyValue(a), historyValue(b));
    return historySort.direction === "asc" ? result : -result;
  });
  const readingValue = (row: (typeof readings)[number]): string | number => {
    if (readingSort.key === "operatingDate") return row.balance?.operatingDate ?? "";
    if (readingSort.key === "status") return row.reading.status;
    if (readingSort.key === "inPrevious") return row.reading.inPrevious;
    if (readingSort.key === "inActual") return row.reading.inActual ?? 0;
    if (readingSort.key === "outPrevious") return row.reading.outPrevious;
    if (readingSort.key === "outActual") return row.reading.outActual ?? 0;
    if (readingSort.key === "result") return row.reading.result;
    return row.reading.observation || "";
  };
  const sortedReadings = [...readings].sort((a, b) => {
    const result = compareValues(readingValue(a), readingValue(b));
    return readingSort.direction === "asc" ? result : -result;
  });
  const auditValue = (event: AuditEvent): string | number => {
    if (auditSort.key === "createdAt") return event.createdAt;
    if (auditSort.key === "action") return event.action;
    if (auditSort.key === "user") return auditUserName(data, event);
    return event.reason || "";
  };
  const sortedMachineAudits = [...machineAudits].sort((a, b) => {
    const result = compareValues(auditValue(a), auditValue(b));
    return auditSort.direction === "asc" ? result : -result;
  });
  const loadedReadings = readings.filter(({ reading }) => reading.status === "CARGADA");
  const totalResult = loadedReadings.reduce((total, { reading }) => total + reading.result, 0);
  const lastReading = readings[0];

  return (
    <Modal title={`Historial de maquina ${machine.visibleId}`} onClose={onClose} wide>
      <div className="tabs">
        <button className={tab === "resumen" ? "tab active" : "tab"} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={tab === "locales" ? "tab active" : "tab"} onClick={() => setTab("locales")}>
          Locales
        </button>
        <button className={tab === "contadores" ? "tab active" : "tab"} onClick={() => setTab("contadores")}>
          Contadores
        </button>
        <button className={tab === "auditoria" ? "tab active" : "tab"} onClick={() => setTab("auditoria")}>
          Auditoria
        </button>
      </div>
      {tab === "resumen" && (
        <section className="history-panel">
          <div className="detail-grid">
            <div>
              <strong>ID</strong>
              <span>{machine.visibleId}</span>
            </div>
            <div>
              <strong>Maquina</strong>
              <span>{machine.name}</span>
            </div>
            <div>
              <strong>Local actual</strong>
              <span>{localName(data, machine.localId)}</span>
            </div>
            <div>
              <strong>Estado</strong>
              <span>{machine.status}</span>
            </div>
            <div>
              <strong>IN actual</strong>
              <span>{counter(machine.lastIn)}</span>
            </div>
            <div>
              <strong>OUT actual</strong>
              <span>{counter(machine.lastOut)}</span>
            </div>
            <div>
              <strong>Total recaudado</strong>
              <span>{money(totalResult)}</span>
            </div>
            <div>
              <strong>Ultima lectura</strong>
              <span>{lastReading?.balance?.operatingDate ?? "-"}</span>
            </div>
          </div>
          <InfoCard
            tone={machine.localId === WORKSHOP_LOCAL_ID ? "orange" : "blue"}
            title={machine.localId === WORKSHOP_LOCAL_ID ? "Ubicada en taller" : "Asignada a local"}
            lines={[`Ubicacion: ${machine.location || "-"}`, `Observacion: ${machine.notes || "-"}`]}
          />
        </section>
      )}
      {tab === "locales" && (
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
                    <button className="sort-button" type="button" onClick={() => setHistorySort((current) => nextSort(current, key as typeof historySort.key))}>
                      {label}
                      {sortIndicator(historySort, key as typeof historySort.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{localName(data, event.localId)}</td>
                  <td>{event.action}</td>
                  <td>{event.detail}</td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan={4}>Sin historial de locales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "contadores" && (
        <section className="history-panel">
          <InfoCard tone="green" title="Total por contadores" lines={[money(totalResult), `${loadedReadings.length} lectura(s) cargadas`]} />
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  {[
                    ["operatingDate", "Fecha"],
                    ["status", "Estado"],
                    ["inPrevious", "IN ant."],
                    ["inActual", "IN act."],
                    ["outPrevious", "OUT ant."],
                    ["outActual", "OUT act."],
                    ["result", "Resultado"],
                    ["observation", "Obs."],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button className="sort-button" type="button" onClick={() => setReadingSort((current) => nextSort(current, key as typeof readingSort.key))}>
                        {label}
                        {sortIndicator(readingSort, key as typeof readingSort.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedReadings.map(({ reading, balance }) => (
                  <tr key={reading.id}>
                    <td>{balance?.operatingDate}</td>
                    <td>{reading.status}</td>
                    <td>{counter(reading.inPrevious)}</td>
                    <td>{counter(reading.inActual)}</td>
                    <td>{counter(reading.outPrevious)}</td>
                    <td>{counter(reading.outActual)}</td>
                    <td>{money(reading.result)}</td>
                    <td>{reading.observation || "-"}</td>
                  </tr>
                ))}
                {!readings.length && (
                  <tr>
                    <td colSpan={8}>Sin lecturas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "auditoria" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                {[
                  ["createdAt", "Fecha"],
                  ["action", "Accion"],
                  ["user", "Usuario"],
                  ["reason", "Motivo"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button className="sort-button" type="button" onClick={() => setAuditSort((current) => nextSort(current, key as typeof auditSort.key))}>
                      {label}
                      {sortIndicator(auditSort, key as typeof auditSort.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMachineAudits.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{event.action}</td>
                  <td>{auditUserName(data, event)}</td>
                  <td>{event.reason || "-"}</td>
                </tr>
              ))}
              {!machineAudits.length && (
                <tr>
                  <td colSpan={4}>Sin auditoria de esta maquina.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function LocalHistoryModal({ data, local, onClose }: { data: AppData; local: Local; onClose: () => void }) {
  const [tab, setTab] = useState<LocalHistoryTab>("resumen");
  const localAudits = data.audit.filter((event) => event.entity === "Local" && event.entityId === local.id);
  const statusAudits = localAudits
    .map((event) => ({
      event,
      previous: parseAuditValue(event.previousValue),
      next: parseAuditValue(event.newValue),
    }))
    .filter((item) => item.previous.status !== item.next.status && item.next.status);
  const balances = data.balances
    .filter((balance) => balance.localId === local.id)
    .slice()
    .sort((a, b) => a.operatingDate.localeCompare(b.operatingDate));
  const localMachines = data.machines.filter((machine) => machine.localId === local.id);
  const activeMachines = localMachines.filter((machine) => machine.status === "ACTIVA").length;
  const maintenanceMachines = localMachines.filter((machine) => machine.status === "MANTENIMIENTO").length;
  const inactiveMachines = localMachines.filter((machine) => machine.status === "INACTIVA").length;
  let accumulated = 0;
  const revenueRows = balances.map((balance) => {
    const totals = totalsForBalance(data, balance.id);
    accumulated += totals.resultMachines;
    return { balance, totals, accumulated };
  });
  const totalRevenue = revenueRows.reduce((total, row) => total + row.totals.resultMachines, 0);
  const totalExpenses = revenueRows.reduce((total, row) => total + row.totals.totalExpenses, 0);
  const totalTransfers = revenueRows.reduce((total, row) => total + row.totals.totalTransfers, 0);
  const totalDifferences = balances.reduce((total, balance) => total + (balance.cashDifference ?? 0), 0);

  return (
    <Modal title={`Historial de ${local.name}`} onClose={onClose} wide>
      <div className="tabs">
        <button className={tab === "resumen" ? "tab active" : "tab"} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={tab === "datos" ? "tab active" : "tab"} onClick={() => setTab("datos")}>
          Datos
        </button>
        <button className={tab === "maquinas" ? "tab active" : "tab"} onClick={() => setTab("maquinas")}>
          Maquinas
        </button>
        <button className={tab === "estados" ? "tab active" : "tab"} onClick={() => setTab("estados")}>
          Estados
        </button>
        <button className={tab === "recaudaciones" ? "tab active" : "tab"} onClick={() => setTab("recaudaciones")}>
          Recaudaciones
        </button>
        <button className={tab === "auditoria" ? "tab active" : "tab"} onClick={() => setTab("auditoria")}>
          Auditoria
        </button>
      </div>
      {tab === "resumen" && (
        <section className="history-panel">
          <div className="card-grid three history-cards">
            <InfoCard tone="blue" title="Maquinas" lines={[`${localMachines.length} asociadas`, `${activeMachines} activas`, `${maintenanceMachines} mantenimiento`]} />
            <InfoCard tone="green" title="Recaudaciones" lines={[money(totalRevenue), `${balances.length} caja(s)`, `Gastos: ${money(totalExpenses)}`]} />
            <InfoCard tone="orange" title="Control" lines={[`Transferencias: ${money(totalTransfers)}`, `Diferencias: ${money(totalDifferences)}`, `${localAudits.length} evento(s)`]} />
          </div>
          <div className="detail-grid">
            <div>
              <strong>ID</strong>
              <span>{local.id}</span>
            </div>
            <div>
              <strong>Local</strong>
              <span>{local.name}</span>
            </div>
            <div>
              <strong>Estado</strong>
              <span>{local.status}</span>
            </div>
            <div>
              <strong>Inactivas</strong>
              <span>{inactiveMachines}</span>
            </div>
            <div>
              <strong>Locatario</strong>
              <span>{local.tenantName || "-"}</span>
            </div>
            <div>
              <strong>Contacto</strong>
              <span>{[local.phone, local.email].filter(Boolean).join(" / ") || "-"}</span>
            </div>
          </div>
        </section>
      )}
      {tab === "datos" && (
        <section className="history-panel">
          <div className="detail-grid">
            <div>
              <strong>ID</strong>
              <span>{local.id}</span>
            </div>
            <div>
              <strong>Locatario</strong>
              <span>{local.tenantName || "-"}</span>
            </div>
            <div>
              <strong>Telefono</strong>
              <span>{local.phone || "-"}</span>
            </div>
            <div>
              <strong>Email</strong>
              <span>{local.email || "-"}</span>
            </div>
            <div>
              <strong>Direccion</strong>
              <span>{local.address}</span>
            </div>
            <div>
              <strong>Google</strong>
              <a href={mapsHref(local)} target="_blank" rel="noreferrer">
                Abrir ubicacion
              </a>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <strong>Maquinas actuales</strong>
              <span>{localMachines.length}</span>
            </div>
            <div>
              <strong>Cajas registradas</strong>
              <span>{balances.length}</span>
            </div>
            <div>
              <strong>Total recaudado</strong>
              <span>{money(totalRevenue)}</span>
            </div>
            <div>
              <strong>Imagenes</strong>
              <span>{local.images.length}</span>
            </div>
          </div>
          <div className="image-strip">
            {local.images.map((image) => (
              <figure key={image.id}>
                <img src={image.dataUrl} alt={image.name} />
                <figcaption>{image.name}</figcaption>
              </figure>
            ))}
            {!local.images.length && <p className="helper">Sin imagenes cargadas.</p>}
          </div>
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Accion</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {localAudits.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.createdAt)}</td>
                    <td>{event.action}</td>
                    <td>{event.reason || "-"}</td>
                  </tr>
                ))}
                {!localAudits.length && (
                  <tr>
                    <td colSpan={3}>Sin movimientos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "maquinas" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Maquina</th>
                <th>Estado</th>
                <th>Ubicacion</th>
                <th>IN actual</th>
                <th>OUT actual</th>
                <th>Recaudaciones</th>
              </tr>
            </thead>
            <tbody>
              {localMachines.map((machine) => {
                const machineReadings = data.readings.filter((reading) => reading.machineId === machine.id && reading.status === "CARGADA");
                const machineRevenue = machineReadings.reduce((total, reading) => total + reading.result, 0);
                return (
                  <tr key={machine.id} className={machineStatusClass(machine.status)}>
                    <td>{machine.visibleId}</td>
                    <td>{machine.name}</td>
                    <td>{machine.status}</td>
                    <td>{machine.location}</td>
                    <td>{counter(machine.lastIn)}</td>
                    <td>{counter(machine.lastOut)}</td>
                    <td>{money(machineRevenue)}</td>
                  </tr>
                );
              })}
              {!localMachines.length && (
                <tr>
                  <td colSpan={7}>Sin maquinas asociadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "estados" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Anterior</th>
                <th>Nuevo</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {statusAudits.map(({ event, previous, next }) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{String(previous.status ?? "-")}</td>
                  <td>{String(next.status ?? "-")}</td>
                  <td>{event.action}</td>
                </tr>
              ))}
              {!statusAudits.length && (
                <tr>
                  <td colSpan={4}>Sin cambios de estado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "recaudaciones" && (
        <section className="history-panel">
          <InfoCard tone="green" title="Total recaudado" lines={[money(totalRevenue), `${revenueRows.length} caja(s) registradas`]} />
          <div className="table-wrap compact-table">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Recaudacion</th>
                  <th>Gastos</th>
                  <th>Transferencias</th>
                  <th>Diferencia</th>
                  <th>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {revenueRows.map(({ balance, totals, accumulated: rowAccumulated }) => (
                  <tr key={balance.id}>
                    <td>{balance.operatingDate}</td>
                    <td>{balance.status}</td>
                    <td>{money(totals.resultMachines)}</td>
                    <td>{money(totals.totalExpenses)}</td>
                    <td>{money(totals.totalTransfers)}</td>
                    <td>{money(balance.cashDifference)}</td>
                    <td>{money(rowAccumulated)}</td>
                  </tr>
                ))}
                {!revenueRows.length && (
                  <tr>
                    <td colSpan={7}>Sin recaudaciones registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "auditoria" && (
        <div className="table-wrap compact-table">
          <table className="data-table compact-data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Motivo</th>
                <th>Nuevo valor</th>
              </tr>
            </thead>
            <tbody>
              {localAudits.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{auditUserName(data, event)}</td>
                  <td>{event.action}</td>
                  <td>{event.reason || "-"}</td>
                  <td>{event.newValue.slice(0, 120)}</td>
                </tr>
              ))}
              {!localAudits.length && (
                <tr>
                  <td colSpan={5}>Sin auditoria del local.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function AdminLocalEditor({
  data,
  user,
  localId,
  patchData,
  audit,
  setMessage,
  onClose,
  onAddMachine,
}: {
  data: AppData;
  user: User;
  localId: string | null;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onClose: () => void;
  onAddMachine: (localId: string) => void;
}) {
  const existing = localId ? data.locals.find((local) => local.id === localId) : undefined;
  const [draft, setDraft] = useState({
    id: existing?.id ?? nextShortId(data.locals.map((local) => local.id)),
    name: existing?.name ?? "",
    tenantName: existing?.tenantName ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    address: existing?.address ?? "",
    googleMapsUrl: existing?.googleMapsUrl ?? "",
    images: existing?.images ?? [],
    status: existing?.status ?? "ACTIVO",
  });
  const [selectedWorkshopMachineIds, setSelectedWorkshopMachineIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const isNew = !existing;
  const balancesCount = existing ? data.balances.filter((balance) => balance.localId === existing.id).length : 0;
  const protectedLocal = Boolean(existing && (existing.id === POSEIDON_LOCAL_ID || balancesCount > 0));
  const localMachines = existing ? data.machines.filter((machine) => machine.localId === existing.id) : [];
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID && machine.status !== "DESUSO");

  const updateImageFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      const images = await readLocalImages(files);
      setDraft((current) => ({ ...current, images: [...current.images, ...images] }));
      event.target.value = "";
    } catch {
      setError("No se pudieron cargar las imagenes.");
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const localNumericId = shortNumberId(draft.id);
    if (!localNumericId || !draft.name.trim()) {
      setError("ID numerico corto y nombre son obligatorios.");
      return;
    }
    const duplicate = data.locals.some((local) => local.id !== existing?.id && local.id === localNumericId);
    if (duplicate) {
      setError("Ya existe un local con ese ID.");
      return;
    }
    const closesLocal = existing?.status !== "CERRADO" && draft.status === "CERRADO";
    const machinesToWorkshop = existing ? data.machines.filter((machine) => machine.localId === existing.id) : [];
    const confirmMessage = closesLocal
      ? `El local ${draft.name.trim()} se marcara como CERRADO y ${machinesToWorkshop.length} maquina(s) pasaran automaticamente al Taller. Confirmar accion.`
      : isNew
        ? "Confirmar creacion de este local."
        : "Confirmar cambios de este local.";
    if (!confirmAction(confirmMessage)) return;

    const next: Local = {
      id: existing?.id ?? localNumericId,
      name: draft.name.trim(),
      tenantName: draft.tenantName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim() || "Sin direccion",
      googleMapsUrl: draft.googleMapsUrl.trim(),
      images: draft.images,
      status: draft.status as Local["status"],
    };

    patchData((current) => {
      if (isNew) {
        const selectedMachines = current.machines.filter((machine) => selectedWorkshopMachineIds.includes(machine.id));
        const machines = current.machines.map((machine) =>
          selectedWorkshopMachineIds.includes(machine.id) ? { ...machine, localId: next.id, location: next.name } : machine,
        );
        const history = selectedMachines.flatMap((machine) => [
          machineHistoryEvent(machine, next.id, "MOVIDA", `Asignada desde ${WORKSHOP_LABEL}`, user.id),
          machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Movida al local ${next.name}`, user.id),
        ]);
        return audit(
          {
            ...current,
            currentAccounts: ensureLocalCurrentAccounts({ ...current, locals: [...current.locals, next] }, next.id),
            locals: [...current.locals, next],
            machines,
            machineLocalHistory: [...history, ...current.machineLocalHistory],
          },
          "Crear local",
          "Local",
          next.id,
          "",
          { local: next, machines: selectedMachines.map((machine) => machine.id) },
          "Autorizado",
        );
      }
      const closingMachines = closesLocal ? current.machines.filter((machine) => machine.localId === next.id) : [];
      const machines = closesLocal
        ? current.machines.map((machine) => (machine.localId === next.id ? { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL } : machine))
        : current.machines;
      const history = closingMachines.flatMap((machine) => [
        machineHistoryEvent(machine, next.id, "MOVIDA", `Enviada a ${WORKSHOP_LABEL} por cierre de local`, user.id),
        machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida por cierre de ${next.name}`, user.id),
      ]);
      const locals = current.locals.map((local) => (local.id === next.id ? next : local));
      const currentAccounts = ensureLocalCurrentAccounts({ ...current, locals }, next.id).map((account) => {
        if (account.id === localCashAccountId(next.id)) return createLocalCashCurrentAccount(next, account);
        if (account.id === localBankAccountId(next.id)) return createLocalBankCurrentAccount(next, account);
        return account;
      });
      return audit(
        { ...current, currentAccounts, locals, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        closesLocal ? "Cerrar local" : "Modificar local",
        "Local",
        next.id,
        existing,
        { local: next, machinesMovedToWorkshop: closingMachines.map((machine) => machine.id) },
        "Autorizado",
      );
    });
    setMessage(closesLocal ? "Local cerrado y maquinas enviadas al taller." : isNew ? "Local creado." : "Local modificado.");
    onClose();
  };

  const remove = () => {
    if (!existing || protectedLocal || !confirmAction(`Confirmar baja del local ${existing.name}. Las maquinas volveran al Taller.`)) return;

    patchData((current) => {
      const removedMachines = current.machines.filter((machine) => machine.localId === existing.id);
      const locals = current.locals.filter((local) => local.id !== existing.id);
      const machines = current.machines.map((machine) =>
        machine.localId === existing.id ? { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL } : machine,
      );
      const history = removedMachines.flatMap((machine) => [
        machineHistoryEvent(machine, existing.id, "MOVIDA", `Devuelta a ${WORKSHOP_LABEL} por baja de local`, user.id),
        machineHistoryEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde local ${existing.name}`, user.id),
      ]);
      return audit(
        { ...current, locals, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Quitar local",
        "Local",
        existing.id,
        existing,
        "",
        "Autorizado",
      );
    });
    setMessage("Local quitado.");
    onClose();
  };

  const sendMachineToWorkshop = (machine: Machine) => {
    if (!existing || !confirmAction(`Confirmar envio de ${machine.name} al Taller.`)) return;
    patchData((current) => {
      const previous = current.machines.find((item) => item.id === machine.id);
      const nextMachine = { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
      const machines = current.machines.map((item) => (item.id === machine.id ? nextMachine : item));
      const history = [
        machineHistoryEvent(machine, existing.id, "MOVIDA", `Enviada a ${WORKSHOP_LABEL} desde edicion de local`, user.id),
        machineHistoryEvent(nextMachine, WORKSHOP_LOCAL_ID, "MOVIDA", `Recibida desde local ${existing.name}`, user.id),
      ];
      return audit(
        { ...current, machines, machineLocalHistory: [...history, ...current.machineLocalHistory] },
        "Enviar maquina al taller",
        "Maquina",
        machine.id,
        previous,
        nextMachine,
        "Autorizado",
      );
    });
    setMessage("Maquina enviada al taller.");
  };

  return (
    <Modal title={isNew ? "Agregar local" : `Editar local ${existing.name}`} onClose={onClose} wide>
      <p className="helper">Antes de aplicar una accion se pide reconfirmacion.</p>
      <form className="form-grid" onSubmit={save}>
        <label>
          ID
          <input value={draft.id} disabled={!isNew} inputMode="numeric" maxLength={4} onChange={(event) => setDraft((current) => ({ ...current, id: sanitizeNumberId(event.target.value) }))} />
        </label>
        <label>
          Local
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Locatario
          <input value={draft.tenantName} onChange={(event) => setDraft((current) => ({ ...current, tenantName: event.target.value }))} />
        </label>
        <label>
          Telefono
          <input value={draft.phone} inputMode="numeric" onChange={(event) => setDraft((current) => ({ ...current, phone: sanitizeDigits(event.target.value) }))} />
        </label>
        <label>
          Email
          <input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <label>
          Direccion
          <input value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} />
        </label>
        <label>
          Ubicacion Google
          <input value={draft.googleMapsUrl} onChange={(event) => setDraft((current) => ({ ...current, googleMapsUrl: event.target.value }))} placeholder="Link de Google Maps" />
        </label>
        <label>
          Estado
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Local["status"] }))}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </label>
        <section className="embedded-panel span-2">
          <div className="admin-header">
            <div>
              <h3>Imagenes del local</h3>
              <p className="helper">En prueba se guarda el nombre del archivo; el archivo real no se persiste en localStorage.</p>
            </div>
            <label className="file-button">
              Subir imagenes
              <input type="file" accept="image/*" multiple onChange={updateImageFiles} />
            </label>
          </div>
          <div className="image-strip">
            {draft.images.map((image) => (
              <figure key={image.id}>
                {image.dataUrl ? <img src={image.dataUrl} alt={image.name} /> : <div className="image-placeholder">Archivo</div>}
                <figcaption>{image.name}</figcaption>
                <button className="link-button" type="button" onClick={() => setDraft((current) => ({ ...current, images: current.images.filter((item) => item.id !== image.id) }))}>
                  Quitar
                </button>
              </figure>
            ))}
            {!draft.images.length && <p className="helper">Sin imagenes cargadas.</p>}
          </div>
        </section>
        <section className="embedded-panel span-2">
          <div className="admin-header">
            <div>
              <h3>Maquinas del local</h3>
              <p className="helper">{isNew ? "Selecciona maquinas disponibles en Taller." : "Podes sumar maquinas del Taller sin salir de esta ventana."}</p>
            </div>
            {isNew ? (
              <span>{workshopMachines.length} disponibles</span>
            ) : (
              <button className="button primary compact" type="button" onClick={() => onAddMachine(existing.id)}>
                Agregar maquina
              </button>
            )}
          </div>
          {isNew ? (
            <div className="table-wrap compact-table">
              <table className="data-table compact-data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>ID</th>
                    <th>Maquina</th>
                    <th>Estado</th>
                    <th>IN</th>
                    <th>OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {workshopMachines.map((machine) => (
                    <tr key={machine.id} className={machineStatusClass(machine.status)}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedWorkshopMachineIds.includes(machine.id)}
                          onChange={(event) =>
                            setSelectedWorkshopMachineIds((current) =>
                              event.target.checked ? [...current, machine.id] : current.filter((id) => id !== machine.id),
                            )
                          }
                        />
                      </td>
                      <td>{machine.visibleId}</td>
                      <td>{machine.name}</td>
                      <td>{machine.status}</td>
                      <td>{counter(machine.lastIn)}</td>
                      <td>{counter(machine.lastOut)}</td>
                    </tr>
                  ))}
                  {!workshopMachines.length && (
                    <tr>
                      <td colSpan={6}>No hay maquinas disponibles en Taller.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mini-list">
              {localMachines.map((machine) => (
                <div key={machine.id}>
                  <span>
                    {machine.visibleId} - {machine.name}
                  </span>
                  <em>{machine.status}</em>
                  <em>{machine.location}</em>
                  <button className="button muted compact" type="button" onClick={() => sendMachineToWorkshop(machine)}>
                    Enviar al taller
                  </button>
                </div>
              ))}
              {!localMachines.length && <p className="helper">No hay maquinas asociadas.</p>}
            </div>
          )}
        </section>
        {error && <p className="validation error span-2">{error}</p>}
        <div className="form-actions span-2">
          <div className="button-row end">
            {!isNew && (
              <button className="button danger" type="button" disabled={protectedLocal} onClick={remove}>
                Quitar local
              </button>
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

