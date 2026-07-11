import { useEffect, useState } from "react";
import type { AppData, Local, Machine, MachineLocalHistory, User } from "../../types";
import { formatDateTime } from "../../lib/dates";
import { localName } from "../../lib/display";
import { machineHistoryEvent } from "../../lib/machineHistory";
import { counter } from "../../lib/money";
import { readColumnPreference, writeColumnPreference } from "../../lib/storage";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { ColumnChooser, Modal, type TableColumn } from "../../components/ui";
import {
  WORKSHOP_LABEL,
  WORKSHOP_LOCAL_ID,
  confirmAction,
  localStatusClass,
  machineStatusClass,
  mapsHref,
} from "./locationsMachines/shared";
import { AdminMachineEditor } from "./locationsMachines/MachineEditor";
import { AdminLocalEditor } from "./locationsMachines/LocalEditor";
import { LocalHistoryModal, MachineHistoryModal } from "./locationsMachines/HistoryModals";

type MachineModalState = {
  machineId: string | null;
  localId?: string;
};

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

const LOCAL_COLUMNS_STORAGE_KEY = "poseidon-locales-columnas-v2";
const MACHINE_COLUMNS_STORAGE_KEY = "poseidon-maquinas-columnas-v2";

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
  const [machineSort, setMachineSort] = useState<SortState<"visibleId" | "name" | "status" | "location" | "lastIn" | "lastOut">>({
    key: "visibleId",
    direction: "asc",
  });
  const [historySort, setHistorySort] = useState<SortState<"createdAt" | "machineVisibleId" | "machineName" | "action" | "detail">>({
    key: "createdAt",
    direction: "desc",
  });
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
  const sortedMachines = [...machines].sort((a, b) => {
    const value = (machine: Machine): string | number => {
      if (machineSort.key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
      if (machineSort.key === "name") return machine.name;
      if (machineSort.key === "status") return machine.status;
      if (machineSort.key === "location") return machine.location;
      if (machineSort.key === "lastIn") return machine.lastIn;
      return machine.lastOut;
    };
    const result = compareValues(value(a), value(b));
    return machineSort.direction === "asc" ? result : -result;
  });
  const sortedVisibleHistory = [...visibleHistory].sort((a, b) => {
    const value = (event: MachineLocalHistory): string | number => {
      if (historySort.key === "createdAt") return event.createdAt;
      if (historySort.key === "machineVisibleId") return Number(event.machineVisibleId) || event.machineVisibleId;
      if (historySort.key === "machineName") return event.machineName;
      if (historySort.key === "action") return event.action;
      return event.detail;
    };
    const result = compareValues(value(a), value(b));
    return historySort.direction === "asc" ? result : -result;
  });
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
              {[
                ["visibleId", "ID"],
                ["name", "Maquina"],
                ["status", "Estado"],
                ["location", "Ubicacion"],
                ["lastIn", "IN actual"],
                ["lastOut", "OUT actual"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setMachineSort((current) => nextSort(current, key as typeof machineSort.key))}>
                    {label}
                    {sortIndicator(machineSort, key as typeof machineSort.key)}
                  </button>
                </th>
              ))}
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {sortedMachines.map((machine) => (
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
              {[
                ["createdAt", "Fecha"],
                ["machineVisibleId", "ID"],
                ["machineName", "Maquina"],
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
            {sortedVisibleHistory.map((event) => (
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
  const [sort, setSort] = useState<SortState<"visibleId" | "name" | "status" | "lastIn" | "lastOut" | "notes">>({ key: "visibleId", direction: "asc" });
  const workshopMachines = data.machines.filter((machine) => machine.localId === WORKSHOP_LOCAL_ID && machine.status !== "DESUSO");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleMachines = normalizedQuery
    ? workshopMachines.filter((machine) => [machine.visibleId, machine.name, machine.status, machine.notes].join(" ").toLowerCase().includes(normalizedQuery))
    : workshopMachines;
  const sortedVisibleMachines = [...visibleMachines].sort((a, b) => {
    const value = (machine: Machine): string | number => {
      if (sort.key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
      if (sort.key === "name") return machine.name;
      if (sort.key === "status") return machine.status;
      if (sort.key === "lastIn") return machine.lastIn;
      if (sort.key === "lastOut") return machine.lastOut;
      return machine.notes || "";
    };
    const result = compareValues(value(a), value(b));
    return sort.direction === "asc" ? result : -result;
  });

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
              {[
                ["visibleId", "ID"],
                ["name", "Maquina"],
                ["status", "Estado"],
                ["lastIn", "IN"],
                ["lastOut", "OUT"],
                ["notes", "Obs."],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                    {label}
                    {sortIndicator(sort, key as typeof sort.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedVisibleMachines.map((machine) => (
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
