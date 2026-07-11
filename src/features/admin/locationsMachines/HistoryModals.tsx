import { useState } from "react";
import { InfoCard, Modal } from "../../../components/ui";
import { totalsForBalance } from "../../../lib/cashTotals";
import { formatDateTime } from "../../../lib/dates";
import { localName } from "../../../lib/display";
import { counter, money } from "../../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../../lib/sorting";
import type { AppData, AuditEvent, Local, Machine, MachineLocalHistory } from "../../../types";
import {
  WORKSHOP_LOCAL_ID,
  auditUserName,
  machineStatusClass,
  mapsHref,
  parseAuditValue,
} from "./shared";

type LocalHistoryTab = "resumen" | "datos" | "maquinas" | "estados" | "recaudaciones" | "auditoria";
type MachineHistoryTab = "resumen" | "locales" | "contadores" | "auditoria";

export function MachineHistoryModal({ data, machine, onClose }: { data: AppData; machine: Machine; onClose: () => void }) {
  const [tab, setTab] = useState<MachineHistoryTab>("resumen");
  const [historySort, setHistorySort] = useState<SortState<"createdAt" | "local" | "action" | "detail">>({
    key: "createdAt",
    direction: "desc",
  });
  const [readingSort, setReadingSort] = useState<
    SortState<"operatingDate" | "status" | "inPrevious" | "inActual" | "outPrevious" | "outActual" | "result" | "observation">
  >({
    key: "operatingDate",
    direction: "desc",
  });
  const [auditSort, setAuditSort] = useState<SortState<"createdAt" | "action" | "user" | "reason">>({
    key: "createdAt",
    direction: "desc",
  });
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
                    <button
                      className="sort-button"
                      type="button"
                      onClick={() => setHistorySort((current) => nextSort(current, key as typeof historySort.key))}
                    >
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
                      <button
                        className="sort-button"
                        type="button"
                        onClick={() => setReadingSort((current) => nextSort(current, key as typeof readingSort.key))}
                      >
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
                    <button
                      className="sort-button"
                      type="button"
                      onClick={() => setAuditSort((current) => nextSort(current, key as typeof auditSort.key))}
                    >
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

export function LocalHistoryModal({ data, local, onClose }: { data: AppData; local: Local; onClose: () => void }) {
  const [tab, setTab] = useState<LocalHistoryTab>("resumen");
  const [dataAuditSort, setDataAuditSort] = useState<SortState<"createdAt" | "action" | "reason">>({
    key: "createdAt",
    direction: "desc",
  });
  const [localMachineSort, setLocalMachineSort] = useState<
    SortState<"visibleId" | "name" | "status" | "location" | "lastIn" | "lastOut" | "revenue">
  >({
    key: "visibleId",
    direction: "asc",
  });
  const [statusSort, setStatusSort] = useState<SortState<"createdAt" | "previous" | "next" | "action">>({
    key: "createdAt",
    direction: "desc",
  });
  const [revenueSort, setRevenueSort] = useState<
    SortState<"operatingDate" | "status" | "resultMachines" | "expenses" | "transfers" | "difference" | "accumulated">
  >({
    key: "operatingDate",
    direction: "asc",
  });
  const [localAuditSort, setLocalAuditSort] = useState<SortState<"createdAt" | "user" | "action" | "reason" | "newValue">>({
    key: "createdAt",
    direction: "desc",
  });
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
  const sortedDataAudits = [...localAudits].sort((a, b) => {
    const value = (event: AuditEvent): string | number => {
      if (dataAuditSort.key === "createdAt") return event.createdAt;
      if (dataAuditSort.key === "action") return event.action;
      return event.reason || "";
    };
    const result = compareValues(value(a), value(b));
    return dataAuditSort.direction === "asc" ? result : -result;
  });
  const machineRevenueFor = (machine: Machine) =>
    data.readings
      .filter((reading) => reading.machineId === machine.id && reading.status === "CARGADA")
      .reduce((total, reading) => total + reading.result, 0);
  const sortedLocalMachines = [...localMachines].sort((a, b) => {
    const value = (machine: Machine): string | number => {
      if (localMachineSort.key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
      if (localMachineSort.key === "name") return machine.name;
      if (localMachineSort.key === "status") return machine.status;
      if (localMachineSort.key === "location") return machine.location;
      if (localMachineSort.key === "lastIn") return machine.lastIn;
      if (localMachineSort.key === "lastOut") return machine.lastOut;
      return machineRevenueFor(machine);
    };
    const result = compareValues(value(a), value(b));
    return localMachineSort.direction === "asc" ? result : -result;
  });
  const sortedStatusAudits = [...statusAudits].sort((a, b) => {
    const value = (row: (typeof statusAudits)[number]): string | number => {
      if (statusSort.key === "createdAt") return row.event.createdAt;
      if (statusSort.key === "previous") return String(row.previous.status ?? "");
      if (statusSort.key === "next") return String(row.next.status ?? "");
      return row.event.action;
    };
    const result = compareValues(value(a), value(b));
    return statusSort.direction === "asc" ? result : -result;
  });
  const sortedRevenueRows = [...revenueRows].sort((a, b) => {
    const value = (row: (typeof revenueRows)[number]): string | number => {
      if (revenueSort.key === "operatingDate") return row.balance.operatingDate;
      if (revenueSort.key === "status") return row.balance.status;
      if (revenueSort.key === "resultMachines") return row.totals.resultMachines;
      if (revenueSort.key === "expenses") return row.totals.totalExpenses;
      if (revenueSort.key === "transfers") return row.totals.totalTransfers;
      if (revenueSort.key === "difference") return row.balance.cashDifference ?? 0;
      return row.accumulated;
    };
    const result = compareValues(value(a), value(b));
    return revenueSort.direction === "asc" ? result : -result;
  });
  const sortedLocalAudits = [...localAudits].sort((a, b) => {
    const value = (event: AuditEvent): string | number => {
      if (localAuditSort.key === "createdAt") return event.createdAt;
      if (localAuditSort.key === "user") return auditUserName(data, event);
      if (localAuditSort.key === "action") return event.action;
      if (localAuditSort.key === "reason") return event.reason || "";
      return event.newValue;
    };
    const result = compareValues(value(a), value(b));
    return localAuditSort.direction === "asc" ? result : -result;
  });

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
            <InfoCard
              tone="blue"
              title="Maquinas"
              lines={[`${localMachines.length} asociadas`, `${activeMachines} activas`, `${maintenanceMachines} mantenimiento`]}
            />
            <InfoCard
              tone="green"
              title="Recaudaciones"
              lines={[money(totalRevenue), `${balances.length} caja(s)`, `Gastos: ${money(totalExpenses)}`]}
            />
            <InfoCard
              tone="orange"
              title="Control"
              lines={[`Transferencias: ${money(totalTransfers)}`, `Diferencias: ${money(totalDifferences)}`, `${localAudits.length} evento(s)`]}
            />
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
                  {[
                    ["createdAt", "Fecha"],
                    ["action", "Accion"],
                    ["reason", "Motivo"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button
                        className="sort-button"
                        type="button"
                        onClick={() => setDataAuditSort((current) => nextSort(current, key as typeof dataAuditSort.key))}
                      >
                        {label}
                        {sortIndicator(dataAuditSort, key as typeof dataAuditSort.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDataAudits.map((event) => (
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
                {[
                  ["visibleId", "ID"],
                  ["name", "Maquina"],
                  ["status", "Estado"],
                  ["location", "Ubicacion"],
                  ["lastIn", "IN actual"],
                  ["lastOut", "OUT actual"],
                  ["revenue", "Recaudaciones"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button
                      className="sort-button"
                      type="button"
                      onClick={() => setLocalMachineSort((current) => nextSort(current, key as typeof localMachineSort.key))}
                    >
                      {label}
                      {sortIndicator(localMachineSort, key as typeof localMachineSort.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedLocalMachines.map((machine) => {
                const machineRevenue = machineRevenueFor(machine);
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
                {[
                  ["createdAt", "Fecha"],
                  ["previous", "Anterior"],
                  ["next", "Nuevo"],
                  ["action", "Accion"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button
                      className="sort-button"
                      type="button"
                      onClick={() => setStatusSort((current) => nextSort(current, key as typeof statusSort.key))}
                    >
                      {label}
                      {sortIndicator(statusSort, key as typeof statusSort.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStatusAudits.map(({ event, previous, next }) => (
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
                  {[
                    ["operatingDate", "Fecha"],
                    ["status", "Estado"],
                    ["resultMachines", "Recaudacion"],
                    ["expenses", "Gastos"],
                    ["transfers", "Transferencias"],
                    ["difference", "Diferencia"],
                    ["accumulated", "Acumulado"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button
                        className="sort-button"
                        type="button"
                        onClick={() => setRevenueSort((current) => nextSort(current, key as typeof revenueSort.key))}
                      >
                        {label}
                        {sortIndicator(revenueSort, key as typeof revenueSort.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRevenueRows.map(({ balance, totals, accumulated: rowAccumulated }) => (
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
                {[
                  ["createdAt", "Fecha"],
                  ["user", "Usuario"],
                  ["action", "Accion"],
                  ["reason", "Motivo"],
                  ["newValue", "Nuevo valor"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button
                      className="sort-button"
                      type="button"
                      onClick={() => setLocalAuditSort((current) => nextSort(current, key as typeof localAuditSort.key))}
                    >
                      {label}
                      {sortIndicator(localAuditSort, key as typeof localAuditSort.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedLocalAudits.map((event) => (
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
