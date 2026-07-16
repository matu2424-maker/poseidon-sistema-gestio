import { useState } from "react";
import { Modal } from "../../components/ui";
import { auditEventLocalIds, auditEventVisibleToUser } from "../../lib/audit";
import { formatDateTime } from "../../lib/dates";
import { roleLabels } from "../../lib/display";
import { money } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import type { AppData, AuditEvent, User } from "../../types";

type AuditSortKey = "createdAt" | "user" | "action" | "entity" | "actorRole" | "reason";
type AuditRecord = Record<string, unknown>;

const parseAuditValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const asRecord = (value: unknown): AuditRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as AuditRecord) : null;

const readableValue = (value: unknown) => {
  if (value === "" || value === undefined || value === null) return "Sin datos";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const accountSnapshotEntries = (value: unknown) => {
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).filter(([, amount]) => typeof amount === "number" && Number.isFinite(amount));
};

export function Audit({ data, user }: { data: AppData; user: User }) {
  const [sort, setSort] = useState<SortState<AuditSortKey>>({ key: "createdAt", direction: "desc" });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const rows = data.audit.filter((event) => auditEventVisibleToUser(data, event, user));
  const auditValue = (event: AuditEvent, key: AuditSortKey): string | number => {
    if (key === "createdAt") return new Date(event.createdAt).getTime();
    if (key === "user") return auditUserName(data, event);
    if (key === "action") return event.action;
    if (key === "entity") return event.entity;
    if (key === "actorRole") return event.actorRole ? roleLabels[event.actorRole] : "";
    return event.reason || "";
  };
  const sortedRows = [...rows].sort((a, b) => {
    const result = compareValues(auditValue(a, sort.key), auditValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const selectedEvent = selectedEventId ? rows.find((event) => event.id === selectedEventId) : undefined;

  return (
    <section className="admin-focus audit-page detail-card-surface">
      <div className="admin-header">
        <p className="helper">
          Registro inmutable de acciones. {user.role === "ENCARGADO" ? "Se muestran solamente los locales asignados." : "Se muestran todos los eventos del sistema."}
        </p>
        <div className="admin-header-actions"><span>{rows.length} evento(s)</span></div>
      </div>
      <div className="table-wrap">
        <table className="data-table audit-table">
          <thead>
            <tr>
              {(["createdAt", "user", "action", "entity", "actorRole", "reason"] as AuditSortKey[]).map((key) => (
                <th key={key} aria-sort={ariaSort(sort, key)}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key))}>
                    {key === "createdAt"
                      ? "Fecha/hora"
                      : key === "user"
                        ? "Usuario"
                        : key === "action"
                          ? "Accion"
                          : key === "entity"
                            ? "Entidad"
                            : key === "actorRole"
                              ? "Funcion"
                              : "Motivo"}
                    {sortIndicator(sort, key)}
                  </button>
                </th>
              ))}
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((event) => (
              <tr key={event.id}>
                <td>{formatDateTime(event.createdAt)}</td>
                <td>{auditUserName(data, event)}</td>
                <td>{event.action}</td>
                <td>{event.entity}</td>
                <td>{event.actorRole ? roleLabels[event.actorRole] : "-"}</td>
                <td className="long-cell">{event.reason || "-"}</td>
                <td>
                  <button className="button primary compact" type="button" onClick={() => setSelectedEventId(event.id)}>Ver</button>
                </td>
              </tr>
            ))}
            {!sortedRows.length ? (
              <tr><td colSpan={7}>No hay eventos de auditoria visibles para este usuario.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {selectedEvent ? (
        <AuditDetail data={data} event={selectedEvent} onClose={() => setSelectedEventId(null)} />
      ) : null}
    </section>
  );
}

function AuditDetail({ data, event, onClose }: { data: AppData; event: AuditEvent; onClose: () => void }) {
  const previousValue = parseAuditValue(event.previousValue);
  const newValue = parseAuditValue(event.newValue);
  const newRecord = asRecord(newValue);
  const localIds = auditEventLocalIds(data, event);
  const localNames = localIds.map((localId) => data.locals.find((local) => local.id === localId)?.name ?? localId);
  const beforeBalances = accountSnapshotEntries(newRecord?.accountBalancesBefore);
  const afterBalances = accountSnapshotEntries(newRecord?.accountBalancesAfter);
  const movements = Array.isArray(newRecord?.newAccountMovements)
    ? newRecord.newAccountMovements
    : Array.isArray(newRecord?.movements)
      ? newRecord.movements
      : [];

  return (
    <Modal title={`Evento ${event.id}`} onClose={onClose} wide>
      <div className="audit-detail">
        <div className="audit-detail-grid">
          <div><span>Fecha y hora</span><strong>{formatDateTime(event.createdAt)}</strong></div>
          <div><span>Usuario</span><strong>{auditUserName(data, event)}</strong></div>
          <div><span>Funcion</span><strong>{event.actorRole ? roleLabels[event.actorRole] : "-"}</strong></div>
          <div><span>Accion</span><strong>{event.action}</strong></div>
          <div><span>Entidad</span><strong>{event.entity} / {event.entityId}</strong></div>
          <div><span>Local</span><strong>{localNames.join(", ") || "Sin contexto local"}</strong></div>
        </div>
        <div className="audit-detail-reason"><span>Motivo u observacion</span><p>{event.reason || "Sin observacion"}</p></div>
        {beforeBalances.length || afterBalances.length ? (
          <section className="audit-account-control">
            <h3>Saldos de cuentas</h3>
            <div className="audit-account-grid">
              {[...new Set([...beforeBalances.map(([key]) => key), ...afterBalances.map(([key]) => key)])].map((key) => {
                const before = beforeBalances.find(([itemKey]) => itemKey === key)?.[1] as number | undefined;
                const after = afterBalances.find(([itemKey]) => itemKey === key)?.[1] as number | undefined;
                const label = key === "cash" ? "Efectivo" : key === "bank" ? "Banco" : key;
                return <div key={key}><span>{label}</span><strong>{money(before)} a {money(after)}</strong></div>;
              })}
            </div>
          </section>
        ) : null}
        {movements.length ? (
          <section className="audit-movements">
            <h3>Movimientos contables generados</h3>
            {movements.map((movement, index) => {
              const item = asRecord(movement) ?? {};
              return (
                <article key={String(item.id ?? index)}>
                  <div><span>ID</span><strong>{String(item.id ?? "-")}</strong></div>
                  <div><span>Cuenta</span><strong>{String(item.accountId ?? "-")}</strong></div>
                  <div><span>Movimiento</span><strong>{String(item.direction ?? "-")} {money(typeof item.amount === "number" ? item.amount : 0)}</strong></div>
                  <div><span>Detalle</span><strong>{String(item.detail ?? item.concept ?? "-")}</strong></div>
                  <div><span>Ajuste anterior</span><strong>{String(item.previousAdjustmentId ?? "-")}</strong></div>
                </article>
              );
            })}
          </section>
        ) : null}
        <div className="audit-values-grid">
          <section><h3>Valor anterior</h3><pre>{readableValue(previousValue)}</pre></section>
          <section><h3>Valor nuevo</h3><pre>{readableValue(newValue)}</pre></section>
        </div>
      </div>
    </Modal>
  );
}

function auditUserName(data: AppData, event: AuditEvent) {
  return event.userName || data.users.find((user) => user.id === event.userId)?.name || "Sistema";
}
