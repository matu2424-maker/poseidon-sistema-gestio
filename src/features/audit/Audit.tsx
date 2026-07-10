import { useState } from "react";
import type { AppData, AuditEvent } from "../../types";
import { formatDateTime, nowIso } from "../../lib/dates";
import { roleLabels } from "../../lib/display";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";

type AuditSortKey = "createdAt" | "user" | "action" | "entity" | "actorRole" | "reason";

export function Audit({ data }: { data: AppData }) {
  const [sort, setSort] = useState<SortState<AuditSortKey>>({ key: "createdAt", direction: "desc" });
  const userLogs: AuditEvent[] = data.users.map((user) => ({
    id: `user-log-${user.id}`,
    userId: user.id,
    userName: user.name,
    actualRole: user.role,
    actorRole: user.role,
    action: "Usuario registrado",
    entity: "Usuario",
    entityId: user.id,
    previousValue: "",
    newValue: JSON.stringify({ username: user.username, role: user.role, status: user.status }),
    reason: "Log de usuario",
    createdAt: data.audit.find((event) => event.entity === "Usuario" && event.entityId === user.id)?.createdAt ?? nowIso(),
  }));
  const rows = [...data.audit, ...userLogs];
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

  return (
    <>
      <h2>Bitacora de auditoria</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {(["createdAt", "user", "action", "entity", "actorRole", "reason"] as AuditSortKey[]).map((key) => (
                <th key={key}>
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
                <td>{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function auditUserName(data: AppData, event: AuditEvent) {
  return event.userName || data.users.find((user) => user.id === event.userId)?.name || "Sistema";
}
