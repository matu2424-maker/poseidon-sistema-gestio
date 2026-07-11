import { useState, type FormEvent } from "react";
import type { AppData, Client, ClientDocumentType, ClientStatus, StoredFileMeta } from "../../types";
import {
  clientDocumentKey,
  clientDocumentLabel,
  clientDocumentSearchText,
  hasClientDocumentDuplicate,
  normalizeClientDocument,
  normalizeClientDocumentType,
  sanitizeDigits,
} from "../../lib/clients";
import { nowIso } from "../../lib/dates";
import { localName } from "../../lib/display";
import { fileMetaLabel, readUploadFile } from "../../lib/files";
import { nextShortId, uid } from "../../lib/ids";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { Modal } from "../../components/ui";
import { confirmAction } from "../../lib/confirmations";

const POSEIDON_LOCAL_ID = "1";
const clientStatusClass = (status: ClientStatus) => (status === "ACTIVO" ? "status-active" : status === "PAPELERA" ? "status-disused" : "status-inactive");
const localOptionName = (local: { id: string; name: string }) => `${local.id} - ${local.name}`;
export function AdminClients({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [query, setQuery] = useState("");
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<
    SortState<"visibleId" | "name" | "document" | "category" | "local" | "status" | "phone" | "email" | "photo" | "identityDocument">
  >({ key: "visibleId", direction: "asc" });
  const activeClients = data.clients.filter((client) => client.status !== "PAPELERA");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? activeClients.filter((client) =>
        [
          client.visibleId,
          client.name,
          clientDocumentSearchText(client),
          fileMetaLabel(client.photoFile),
          fileMetaLabel(client.identityDocumentFile),
          client.phone,
          client.email,
          client.category,
          localName(data, client.localId),
          client.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : activeClients;
  const clientValue = (client: Client, key: typeof sort.key): string | number => {
    if (key === "visibleId") return Number(client.visibleId);
    if (key === "document") return clientDocumentKey(normalizeClientDocumentType(client.documentType), client.documentId);
    if (key === "local") return localName(data, client.localId);
    if (key === "photo") return fileMetaLabel(client.photoFile);
    if (key === "identityDocument") return fileMetaLabel(client.identityDocumentFile);
    return client[key];
  };
  const rows = [...filtered].sort((a, b) => {
    const result = compareValues(clientValue(a, sort.key), clientValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const sendToTrash = (client: Client) => {
    if (!confirmAction(`Enviar a papelera a ${client.name}?`)) return;
    patchData((current) => {
      const previous = current.clients.find((item) => item.id === client.id);
      const clients = current.clients.map((item) => (item.id === client.id ? { ...item, status: "PAPELERA" as ClientStatus, deletedAt: nowIso(), updatedAt: nowIso() } : item));
      const next = clients.find((item) => item.id === client.id);
      return audit({ ...current, clients }, "Enviar cliente a papelera", "Cliente", client.id, previous, next);
    });
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">Listado para asociar regalos, transferencias y futuras acciones comerciales.</p>
        </div>
        <div className="admin-header-actions">
          <span>{activeClients.length} clientes</span>
          <button className="button success compact" onClick={() => setEditorId(null)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="toolbar-row">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, documento, telefono..." />
      </div>
      <div className="table-wrap grow">
        <table className="data-table admin-data-table">
          <thead>
            <tr>
              {[
                ["visibleId", "ID"],
                ["name", "Cliente"],
                ["document", "Documento"],
                ["category", "Categoria"],
                ["local", "Local"],
                ["status", "Estado"],
                ["phone", "Telefono"],
                ["email", "Email"],
                ["photo", "Foto"],
                ["identityDocument", "Cedula"],
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
            {rows.map((client) => (
              <tr key={client.id} className={clientStatusClass(client.status)}>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{clientDocumentLabel(client)}</td>
                <td>{client.category}</td>
                <td>{localName(data, client.localId)}</td>
                <td>{client.status}</td>
                <td>{client.phone || "-"}</td>
                <td>{client.email || "-"}</td>
                <td>{fileMetaLabel(client.photoFile)}</td>
                <td>{fileMetaLabel(client.identityDocumentFile)}</td>
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
            {!rows.length && (
              <tr>
                <td colSpan={11}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editorId !== undefined && (
        <ClientEditor data={data} clientId={editorId} onClose={() => setEditorId(undefined)} patchData={patchData} audit={audit} />
      )}
    </section>
  );
}

export function ClientEditor({
  data,
  clientId,
  onClose,
  patchData,
  audit,
}: {
  data: AppData;
  clientId: string | null;
  onClose: () => void;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const existing = clientId ? data.clients.find((client) => client.id === clientId) : undefined;
  const isNew = !existing;
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState<ClientDocumentType>(normalizeClientDocumentType(existing?.documentType));
  const [documentDraft, setDocumentDraft] = useState(normalizeClientDocument(normalizeClientDocumentType(existing?.documentType), existing?.documentId ?? ""));
  const [photoFile, setPhotoFile] = useState<StoredFileMeta | undefined>(existing?.photoFile);
  const [identityDocumentFile, setIdentityDocumentFile] = useState<StoredFileMeta | undefined>(existing?.identityDocumentFile);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const nextDocumentType = normalizeClientDocumentType(form.get("documentType"));
    const documentId = normalizeClientDocument(nextDocumentType, String(form.get("documentId") ?? ""));
    if (!name) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!documentId) {
      setError("El documento es obligatorio.");
      return;
    }
    if (hasClientDocumentDuplicate(data.clients, nextDocumentType, documentId, existing?.id)) {
      setError("Ya existe un cliente activo o inactivo con ese documento.");
      return;
    }
    const next: Client = {
      id: existing?.id ?? uid("client"),
      visibleId: existing?.visibleId ?? nextShortId(data.clients.map((client) => client.visibleId)),
      name,
      documentType: nextDocumentType,
      documentId,
      photoFile,
      identityDocumentFile,
      phone: sanitizeDigits(String(form.get("phone") ?? ""), 20),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      localId: String(form.get("localId") ?? POSEIDON_LOCAL_ID),
      category: String(form.get("category") ?? "GENERAL") as Client["category"],
      notes: String(form.get("notes") ?? ""),
      status: String(form.get("status") ?? "ACTIVO") as ClientStatus,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      deletedAt: existing?.deletedAt,
    };
    patchData((current) => {
      const previous = current.clients.find((client) => client.id === next.id);
      const clients = isNew ? [next, ...current.clients] : current.clients.map((item) => (item.id === next.id ? next : item));
      return audit({ ...current, clients }, isNew ? "Crear cliente" : "Editar cliente", "Cliente", next.id, previous ?? "", next);
    });
    onClose();
  };
  return (
    <Modal title={isNew ? "Agregar cliente" : `Editar ${existing?.name}`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Nombre
          <input name="name" defaultValue={existing?.name} required />
        </label>
        <label>
          Categoria
          <select name="category" defaultValue={existing?.category ?? "GENERAL"}>
            <option value="GENERAL">General</option>
            <option value="FRECUENTE">Frecuente</option>
            <option value="VIP">VIP</option>
          </select>
        </label>
        <label>
          Tipo documento
          <select
            name="documentType"
            value={documentType}
            onChange={(event) => {
              const nextType = normalizeClientDocumentType(event.currentTarget.value);
              setDocumentType(nextType);
              setDocumentDraft((current) => normalizeClientDocument(nextType, current));
              setError("");
            }}
          >
            <option value="CEDULA">Cedula</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </label>
        <label>
          Documento
          <input
            name="documentId"
            value={documentDraft}
            inputMode={documentType === "CEDULA" ? "numeric" : "text"}
            placeholder={documentType === "CEDULA" ? "Numero de cedula" : "Numero de pasaporte"}
            onChange={(event) => {
              setDocumentDraft(normalizeClientDocument(documentType, event.currentTarget.value));
              setError("");
            }}
            required
          />
        </label>
        <label>
          Foto
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) setPhotoFile(readUploadFile(file));
              event.currentTarget.value = "";
            }}
          />
          <span className="helper">{fileMetaLabel(photoFile)}</span>
        </label>
        <label>
          Cedula / pasaporte
          <input
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) setIdentityDocumentFile(readUploadFile(file));
              event.currentTarget.value = "";
            }}
          />
          <span className="helper">{fileMetaLabel(identityDocumentFile)}</span>
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
        <label>
          Local de referencia
          <select name="localId" defaultValue={existing?.localId ?? POSEIDON_LOCAL_ID}>
            {data.locals.map((local) => (
              <option key={local.id} value={local.id}>
                {localOptionName(local)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select name="status" defaultValue={existing?.status ?? "ACTIVO"}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="PAPELERA">Papelera</option>
          </select>
        </label>
        <label className="span-2">
          Direccion
          <input name="address" defaultValue={existing?.address} />
        </label>
        <label className="span-2">
          Notas
          <textarea name="notes" defaultValue={existing?.notes} rows={3} />
        </label>
        {error && <p className="validation error span-2">{error}</p>}
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

