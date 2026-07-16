import type { AppData, Local, LocalImage, Machine, MachineLocalHistory } from "../../types";
import { POSEIDON_LOCAL_ID, WORKSHOP_LABEL, WORKSHOP_LOCAL_ID } from "../../data/appDataIds";
import { openBalanceForLocal } from "../../lib/balanceReferences";
import {
  createLocalBankCurrentAccount,
  createLocalCashCurrentAccount,
  ensureLocalCurrentAccounts,
  localBankAccountId,
  localCashAccountId,
} from "../../lib/currentAccounts";
import { localDeletionReferences, referenceMessage } from "../../lib/entityReferences";
import { shortNumberId } from "../../lib/ids";
import { machineHistoryEvent } from "../../lib/machineHistory";
import {
  auditCommand,
  commandError,
  commandSuccess,
  type CommandContext,
  type CommandResult,
} from "../command";

const requireAdministrator = (context: CommandContext) =>
  context.actorRole === "ADMINISTRADOR" ? "" : "Solo el administrador puede gestionar locales.";

const historyEvent = (
  machine: Machine,
  localId: string,
  action: MachineLocalHistory["action"],
  detail: string,
  context: CommandContext,
  createdAt: string,
) =>
  machineHistoryEvent(machine, localId, action, detail, context.user.id, {
    id: context.id("machine-history"),
    createdAt,
  });

export type SaveLocalInput = {
  localId?: string;
  id: string;
  name: string;
  tenantName: string;
  phone: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  images: LocalImage[];
  status: Local["status"];
  selectedWorkshopMachineIds?: string[];
};

export function saveLocalCommand(
  data: AppData,
  input: SaveLocalInput,
  context: CommandContext,
): CommandResult<Local> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const existing = input.localId ? data.locals.find((local) => local.id === input.localId) : undefined;
  if (input.localId && !existing) return commandError("No se encontro el local a modificar.");
  const numericId = shortNumberId(input.id);
  const localId = existing?.id ?? numericId;
  if (!numericId || !input.name.trim()) return commandError("ID numerico corto y nombre son obligatorios.");
  if (data.locals.some((local) => local.id !== existing?.id && local.id === localId)) {
    return commandError("Ya existe un local con ese ID.");
  }
  if (input.phone && !/^\d+$/.test(input.phone)) return commandError("El telefono solo puede contener numeros.");
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) return commandError("Ingresa un email valido.");

  const selectedIds = [...new Set(input.selectedWorkshopMachineIds ?? [])];
  const selectedMachines = data.machines.filter((machine) => selectedIds.includes(machine.id));
  if (
    !existing &&
    (selectedMachines.length !== selectedIds.length ||
      selectedMachines.some((machine) => machine.localId !== WORKSHOP_LOCAL_ID || machine.status === "DESUSO"))
  ) {
    return commandError("Solo se pueden asignar maquinas disponibles del Taller.");
  }
  if (!existing && input.status === "CERRADO" && selectedIds.length) {
    return commandError("No se pueden asignar maquinas a un local cerrado.");
  }

  const next: Local = {
    id: localId,
    name: input.name.trim(),
    tenantName: input.tenantName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim() || "Sin direccion",
    googleMapsUrl: input.googleMapsUrl.trim(),
    images: input.images,
    status: input.status,
  };
  const timestamp = context.now();

  if (!existing) {
    const machines = data.machines.map((machine) =>
      selectedIds.includes(machine.id) ? { ...machine, localId: next.id, location: next.name } : machine,
    );
    const history = selectedMachines.flatMap((machine) => [
      historyEvent(machine, next.id, "MOVIDA", `Asignada desde ${WORKSHOP_LABEL}`, context, timestamp),
      historyEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Movida al local ${next.name}`, context, timestamp),
    ]);
    const locals = [...data.locals, next];
    return commandSuccess(
      auditCommand(
        {
          ...data,
          currentAccounts: ensureLocalCurrentAccounts({ ...data, locals }, next.id),
          locals,
          machines,
          machineLocalHistory: [...history, ...data.machineLocalHistory],
        },
        context,
        "Crear local",
        "Local",
        next.id,
        "",
        { local: next, machines: selectedMachines.map((machine) => machine.id) },
        "Autorizado",
      ),
      next,
    );
  }

  const closesLocal = existing.status !== "CERRADO" && next.status === "CERRADO";
  if (closesLocal && openBalanceForLocal(data, next.id)) {
    return commandError("No se puede cerrar el local mientras tenga una caja abierta.");
  }
  const closingMachines = closesLocal ? data.machines.filter((machine) => machine.localId === next.id) : [];
  const machines = closesLocal
    ? data.machines.map((machine) =>
        machine.localId === next.id
          ? { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL }
          : machine,
      )
    : data.machines;
  const history = closingMachines.flatMap((machine) => [
    historyEvent(
      machine,
      next.id,
      "MOVIDA",
      `Enviada a ${WORKSHOP_LABEL} por cierre de local`,
      context,
      timestamp,
    ),
    historyEvent(
      machine,
      WORKSHOP_LOCAL_ID,
      "MOVIDA",
      `Recibida por cierre de ${next.name}`,
      context,
      timestamp,
    ),
  ]);
  const locals = data.locals.map((local) => (local.id === next.id ? next : local));
  const currentAccounts = ensureLocalCurrentAccounts({ ...data, locals }, next.id).map((account) => {
    if (account.id === localCashAccountId(next.id)) return createLocalCashCurrentAccount(next, account);
    if (account.id === localBankAccountId(next.id)) return createLocalBankCurrentAccount(next, account);
    return account;
  });
  return commandSuccess(
    auditCommand(
      {
        ...data,
        currentAccounts,
        locals,
        machines,
        machineLocalHistory: [...history, ...data.machineLocalHistory],
      },
      context,
      closesLocal ? "Cerrar local" : "Modificar local",
      "Local",
      next.id,
      existing,
      { local: next, machinesMovedToWorkshop: closingMachines.map((machine) => machine.id) },
      "Autorizado",
    ),
    next,
  );
}

export function deleteLocalCommand(
  data: AppData,
  localId: string,
  context: CommandContext,
): CommandResult<Local> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const existing = data.locals.find((local) => local.id === localId);
  if (!existing) return commandError("No se encontro el local.");
  if (existing.id === POSEIDON_LOCAL_ID) return commandError("El local principal no se puede quitar.");
  const references = localDeletionReferences(data, existing.id);
  if (references.length) {
    return commandError(`No se puede quitar definitivamente: conserva ${referenceMessage(references)}. Usa el estado CERRADO.`);
  }
  const timestamp = context.now();
  const removedMachines = data.machines.filter((machine) => machine.localId === existing.id);
  const machines = data.machines.map((machine) =>
    machine.localId === existing.id
      ? { ...machine, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL }
      : machine,
  );
  const history = removedMachines.flatMap((machine) => [
    historyEvent(
      machine,
      existing.id,
      "MOVIDA",
      `Devuelta a ${WORKSHOP_LABEL} por baja de local`,
      context,
      timestamp,
    ),
    historyEvent(
      machine,
      WORKSHOP_LOCAL_ID,
      "MOVIDA",
      `Recibida desde local ${existing.name}`,
      context,
      timestamp,
    ),
  ]);
  const accountIds = new Set([localCashAccountId(existing.id), localBankAccountId(existing.id)]);
  return commandSuccess(
    auditCommand(
      {
        ...data,
        locals: data.locals.filter((local) => local.id !== existing.id),
        currentAccounts: data.currentAccounts.filter((account) => !accountIds.has(account.id)),
        machines,
        machineLocalHistory: [...history, ...data.machineLocalHistory],
      },
      context,
      "Quitar local",
      "Local",
      existing.id,
      existing,
      "",
      "Autorizado",
    ),
    existing,
  );
}
