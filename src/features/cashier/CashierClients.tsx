import { useState } from "react";
import { clientDocumentLabel, clientDocumentSearchText } from "../../lib/clients";
import { nowIso } from "../../lib/dates";
import { confirmAction } from "../../lib/confirmations";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import type { AppData, Client, ClientStatus } from "../../types";
import { ClientEditor } from "../admin/Clients";
import { clientSortValue, clientStatusClass, type ClientTableColumn } from "../clients/clientTable";
import { CashierMovementPanel } from "./MovementTable";

export function CashierClients({
  data,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<SortState<ClientTableColumn>>({ key: "visibleId", direction: "asc" });
  const normalizedQuery = query.trim().toLowerCase();
  const clients = data.clients.filter((client) => client.status !== "PAPELERA");
  const filtered = normalizedQuery
    ? clients.filter((client) =>
        [client.visibleId, client.name, clientDocumentSearchText(client), client.phone, client.email, client.category, client.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : clients;
  const sorted = [...filtered].sort((left, right) => {
    const result = compareValues(clientSortValue(left, sort.key), clientSortValue(right, sort.key));
    return sort.direction === "asc" ? result : -result;
  });

  const sendToTrash = (client: Client) => {
    if (!confirmAction(`Enviar a papelera a ${client.name}?`)) return;
    patchData((current) => {
      const previous = current.clients.find((item) => item.id === client.id);
      const clients = current.clients.map((item) =>
        item.id === client.id ? { ...item, status: "PAPELERA" as ClientStatus, deletedAt: nowIso(), updatedAt: nowIso() } : item,
      );
      const next = clients.find((item) => item.id === client.id);
      return audit({ ...current, clients }, "Enviar cliente a papelera cajero", "Cliente", client.id, previous, next);
    });
    setMessage("Cliente enviado a papelera.");
  };

  return (
    <CashierMovementPanel
      title="Clientes"
      detail="Alta y mantenimiento rapido de clientes desde caja."
      totalLabel="clientes"
      total={clients.length}
      onBack={onBack}
      onAdd={() => setEditorId(null)}
    >
      <div className="toolbar-row">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente, documento, telefono..."
        />
      </div>
      <div className="table-wrap grow">
        <table className="data-table movement-data-table">
          <thead>
            <tr>
              {[
                ["visibleId", "ID"],
                ["name", "Cliente"],
                ["document", "Documento"],
                ["category", "Categoria"],
                ["phone", "Telefono"],
                ["email", "Email"],
                ["status", "Estado"],
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
            {sorted.map((client) => (
              <tr key={client.id} className={clientStatusClass(client.status)}>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{clientDocumentLabel(client)}</td>
                <td>{client.category}</td>
                <td>{client.phone || "-"}</td>
                <td>{client.email || "-"}</td>
                <td>{client.status}</td>
                <td>
                  <div className="table-actions">
                    <button className="button primary compact" onClick={() => setEditorId(client.id)}>
                      Editar
                    </button>
                    <button className="button muted compact" onClick={() => sendToTrash(client)}>
                      Papelera
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan={8}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <ClientEditor data={data} clientId={editorId} onClose={() => setEditorId(undefined)} patchData={patchData} audit={audit} />
      )}
    </CashierMovementPanel>
  );
}
