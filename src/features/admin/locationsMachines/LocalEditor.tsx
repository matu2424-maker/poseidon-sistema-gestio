import { useState, type ChangeEvent, type FormEvent } from "react";
import { Modal } from "../../../components/ui";
import { sanitizeDigits } from "../../../lib/clients";
import { nextShortId } from "../../../lib/ids";
import { counter } from "../../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../../lib/sorting";
import type { AppData, Local, Machine, User } from "../../../types";
import { commandContext } from "../../../application/command";
import { deleteLocalCommand, saveLocalCommand } from "../../../application/locations/localCommands";
import { moveMachineToWorkshopCommand } from "../../../application/machines/machineCommands";
import {
  POSEIDON_LOCAL_ID,
  WORKSHOP_LABEL,
  WORKSHOP_LOCAL_ID,
  confirmAction,
  machineStatusClass,
  readLocalImages,
  sanitizeNumberId,
} from "./shared";

export function AdminLocalEditor({
  data,
  user,
  localId,
  patchData,
  setMessage,
  onClose,
  onAddMachine,
}: {
  data: AppData;
  user: User;
  localId: string | null;
  patchData: (updater: (current: AppData) => AppData) => void;
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
  const [workshopSort, setWorkshopSort] = useState<SortState<"visibleId" | "name" | "status" | "lastIn" | "lastOut">>({
    key: "visibleId",
    direction: "asc",
  });
  const isNew = !existing;
  const balancesCount = existing ? data.balances.filter((balance) => balance.localId === existing.id).length : 0;
  const protectedLocal = Boolean(existing && (existing.id === POSEIDON_LOCAL_ID || balancesCount > 0));
  const localMachines = existing ? data.machines.filter((machine) => machine.localId === existing.id) : [];
  const workshopMachines = data.machines.filter(
    (machine) => machine.localId === WORKSHOP_LOCAL_ID && machine.status !== "DESUSO",
  );
  const sortedWorkshopMachines = [...workshopMachines].sort((a, b) => {
    const value = (machine: Machine): string | number => {
      if (workshopSort.key === "visibleId") return Number(machine.visibleId) || machine.visibleId;
      if (workshopSort.key === "name") return machine.name;
      if (workshopSort.key === "status") return machine.status;
      if (workshopSort.key === "lastIn") return machine.lastIn;
      return machine.lastOut;
    };
    const result = compareValues(value(a), value(b));
    return workshopSort.direction === "asc" ? result : -result;
  });

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
    const closesLocal = existing?.status !== "CERRADO" && draft.status === "CERRADO";
    const machinesToWorkshop = existing ? data.machines.filter((machine) => machine.localId === existing.id) : [];
    const confirmMessage = closesLocal
      ? `El local ${draft.name.trim()} se marcara como CERRADO y ${machinesToWorkshop.length} maquina(s) pasaran automaticamente al Taller. Confirmar accion.`
      : isNew
        ? "Confirmar creacion de este local."
        : "Confirmar cambios de este local.";
    if (!confirmAction(confirmMessage)) return;
    const result = saveLocalCommand(
      data,
      {
        localId: existing?.id,
        id: draft.id,
        name: draft.name,
        tenantName: draft.tenantName,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        googleMapsUrl: draft.googleMapsUrl,
        images: draft.images,
        status: draft.status as Local["status"],
        selectedWorkshopMachineIds,
      },
      commandContext(user, "ADMINISTRADOR"),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage(closesLocal ? "Local cerrado y maquinas enviadas al taller." : isNew ? "Local creado." : "Local modificado.");
    onClose();
  };

  const remove = () => {
    if (!existing || protectedLocal) return;
    if (!confirmAction(`Confirmar baja del local ${existing.name}. Las maquinas volveran al Taller.`)) return;
    const result = deleteLocalCommand(data, existing.id, commandContext(user, "ADMINISTRADOR"));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Local quitado.");
    onClose();
  };

  const sendMachineToWorkshop = (machine: Machine) => {
    if (!existing || !confirmAction(`Confirmar envio de ${machine.name} al Taller.`)) return;
    const result = moveMachineToWorkshopCommand(
      data,
      machine.id,
      commandContext(user, "ADMINISTRADOR"),
      `Enviada a ${WORKSHOP_LABEL} desde edicion de local`,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchData(() => result.data);
    setMessage("Maquina enviada al taller.");
  };

  return (
    <Modal title={isNew ? "Agregar local" : `Editar local ${existing.name}`} onClose={onClose} wide>
      <p className="helper">Antes de aplicar una accion se pide reconfirmacion.</p>
      <form className="form-grid" onSubmit={save}>
        <label>
          ID
          <input
            value={draft.id}
            disabled={!isNew}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setDraft((current) => ({ ...current, id: sanitizeNumberId(event.target.value) }))}
          />
        </label>
        <label>
          Local
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Locatario
          <input
            value={draft.tenantName}
            onChange={(event) => setDraft((current) => ({ ...current, tenantName: event.target.value }))}
          />
        </label>
        <label>
          Telefono
          <input
            value={draft.phone}
            inputMode="numeric"
            onChange={(event) => setDraft((current) => ({ ...current, phone: sanitizeDigits(event.target.value) }))}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label>
          Direccion
          <input
            value={draft.address}
            onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
          />
        </label>
        <label>
          Ubicacion Google
          <input
            value={draft.googleMapsUrl}
            onChange={(event) => setDraft((current) => ({ ...current, googleMapsUrl: event.target.value }))}
            placeholder="Link de Google Maps"
          />
        </label>
        <label>
          Estado
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Local["status"] }))}
          >
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
                <button
                  className="link-button"
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      images: current.images.filter((item) => item.id !== image.id),
                    }))
                  }
                >
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
              <p className="helper">
                {isNew
                  ? "Selecciona maquinas disponibles en Taller."
                  : "Podes sumar maquinas del Taller sin salir de esta ventana."}
              </p>
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
                    {[
                      ["visibleId", "ID"],
                      ["name", "Maquina"],
                      ["status", "Estado"],
                      ["lastIn", "IN"],
                      ["lastOut", "OUT"],
                    ].map(([key, label]) => (
                      <th key={key}>
                        <button
                          className="sort-button"
                          type="button"
                          onClick={() => setWorkshopSort((current) => nextSort(current, key as typeof workshopSort.key))}
                        >
                          {label}
                          {sortIndicator(workshopSort, key as typeof workshopSort.key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedWorkshopMachines.map((machine) => (
                    <tr key={machine.id} className={machineStatusClass(machine.status)}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedWorkshopMachineIds.includes(machine.id)}
                          onChange={(event) =>
                            setSelectedWorkshopMachineIds((current) =>
                              event.target.checked
                                ? [...current, machine.id]
                                : current.filter((id) => id !== machine.id),
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
