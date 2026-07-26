import type { AppData, Machine, MachineLocalHistory, MachineStatus } from "../../types";
import { WORKSHOP_LABEL, WORKSHOP_LOCAL_ID } from "../../data/appDataIds";
import { openBalanceForLocal } from "../../lib/balanceReferences";
import { localName } from "../../lib/display";
import { shortNumberId } from "../../lib/ids";
import { machineHistoryEvent } from "../../lib/machineHistory";
import { counter } from "../../lib/money";
import {
  auditCommand,
  commandError,
  commandSuccess,
  type CommandContext,
  type CommandResult,
} from "../command";
import { commandFunctionAccessError } from "../localAccess";

const requireAdministrator = (context: CommandContext) =>
  commandFunctionAccessError(
    context,
    ["ADMINISTRADOR"],
    "Solo el administrador puede gestionar maquinas.",
  );

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

export type SaveMachineInput = {
  machineId?: string;
  visibleId: string;
  name: string;
  localId: string;
  location: string;
  status: MachineStatus;
  lastIn: number;
  lastOut: number;
  notes: string;
};

export function saveMachineCommand(
  data: AppData,
  input: SaveMachineInput,
  context: CommandContext,
): CommandResult<Machine> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const existing = input.machineId ? data.machines.find((machine) => machine.id === input.machineId) : undefined;
  if (input.machineId && !existing) return commandError("No se encontro la maquina a modificar.");
  const visibleId = shortNumberId(input.visibleId);
  if (!visibleId || !input.name.trim()) return commandError("ID numerico corto y nombre son obligatorios.");
  if (
    data.machines.some(
      (machine) => machine.id !== existing?.id && shortNumberId(machine.visibleId) === visibleId,
    )
  ) {
    return commandError("Ya existe una maquina con ese ID.");
  }
  const localId = existing ? input.localId : WORKSHOP_LOCAL_ID;
  if (localId !== WORKSHOP_LOCAL_ID && !data.locals.some((local) => local.id === localId)) {
    return commandError("No se encontro el local de la maquina.");
  }
  if (input.status === "DESUSO" && localId !== WORKSHOP_LOCAL_ID) {
    return commandError("El estado Desuso solo se puede aplicar a maquinas que estan en Taller.");
  }
  if (![input.lastIn, input.lastOut].every(Number.isFinite)) {
    return commandError("Los contadores deben ser numeros finitos.");
  }
  if (input.lastIn < 0 || input.lastOut < 0) return commandError("Los contadores no pueden ser negativos.");
  if (
    existing &&
    openBalanceForLocal(data, existing.localId) &&
    (existing.localId !== localId || existing.lastIn !== input.lastIn || existing.lastOut !== input.lastOut)
  ) {
    return commandError("No se puede mover la maquina ni ajustar sus contadores mientras el local tenga una caja abierta.");
  }
  if (existing && existing.localId !== localId && openBalanceForLocal(data, localId)) {
    return commandError("No se puede ingresar una maquina a un local con caja abierta.");
  }

  const next: Machine = {
    id: existing?.id ?? context.id("machine"),
    visibleId,
    name: input.name.trim(),
    localId,
    location: existing
      ? input.location.trim() || (localId === WORKSHOP_LOCAL_ID ? WORKSHOP_LABEL : "Salon")
      : WORKSHOP_LABEL,
    status: input.status,
    lastIn: existing ? input.lastIn : 0,
    lastOut: existing ? input.lastOut : 0,
    notes: input.notes.trim(),
  };
  const timestamp = context.now();
  if (!existing) {
    const history = historyEvent(next, WORKSHOP_LOCAL_ID, "AGREGADA", "Alta de maquina en taller", context, timestamp);
    return commandSuccess(
      auditCommand(
        { ...data, machines: [...data.machines, next], machineLocalHistory: [history, ...data.machineLocalHistory] },
        context,
        "Crear maquina",
        "Maquina",
        next.id,
        "",
        next,
        "Autorizado",
      ),
      next,
    );
  }

  const history: MachineLocalHistory[] = [];
  if (existing.localId !== next.localId) {
    history.push(
      historyEvent(next, next.localId, "MOVIDA", `Recibida desde ${localName(data, existing.localId)}`, context, timestamp),
      historyEvent(existing, existing.localId, "MOVIDA", `Movida a ${localName(data, next.localId)}`, context, timestamp),
    );
  }
  if (existing.lastIn !== next.lastIn || existing.lastOut !== next.lastOut) {
    history.push(
      historyEvent(
        next,
        next.localId,
        "CONTADORES",
        `Ajuste admin: IN ${counter(existing.lastIn)} -> ${counter(next.lastIn)}, OUT ${counter(existing.lastOut)} -> ${counter(next.lastOut)}`,
        context,
        timestamp,
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
    history.push(historyEvent(next, next.localId, "MODIFICADA", "Edicion administrativa", context, timestamp));
  }
  return commandSuccess(
    auditCommand(
      {
        ...data,
        machines: data.machines.map((machine) => (machine.id === next.id ? next : machine)),
        machineLocalHistory: [...history, ...data.machineLocalHistory],
      },
      context,
      "Modificar maquina",
      "Maquina",
      next.id,
      existing,
      next,
      "Autorizado",
    ),
    next,
  );
}

export function resetMachineCountersCommand(
  data: AppData,
  machineId: string,
  context: CommandContext,
): CommandResult<Machine> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const existing = data.machines.find((machine) => machine.id === machineId);
  if (!existing) return commandError("No se encontro la maquina.");
  const blockingBalance = openBalanceForLocal(data, existing.localId);
  if (blockingBalance) {
    return commandError(
      `No se puede resetear ${existing.name}: hay una caja abierta del ${blockingBalance.operatingDate}. Primero hay que cerrar esa caja.`,
    );
  }
  const next: Machine = { ...existing, lastIn: 0, lastOut: 0 };
  const timestamp = context.now();
  const history = historyEvent(
    existing,
    existing.localId,
    "RESET",
    `Reset admin: IN ${counter(existing.lastIn)} -> 0, OUT ${counter(existing.lastOut)} -> 0`,
    context,
    timestamp,
  );
  return commandSuccess(
    auditCommand(
      {
        ...data,
        machines: data.machines.map((machine) => (machine.id === existing.id ? next : machine)),
        machineLocalHistory: [history, ...data.machineLocalHistory],
      },
      context,
      "Reset contadores",
      "Maquina",
      existing.id,
      existing,
      next,
      "Autorizado",
    ),
    next,
  );
}

export function moveMachineToWorkshopCommand(
  data: AppData,
  machineId: string,
  context: CommandContext,
  detail = `Enviada a ${WORKSHOP_LABEL}`,
): CommandResult<Machine> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const existing = data.machines.find((machine) => machine.id === machineId);
  if (!existing) return commandError("No se encontro la maquina.");
  if (existing.localId === WORKSHOP_LOCAL_ID) return commandError("La maquina ya esta en el Taller.");
  if (openBalanceForLocal(data, existing.localId)) {
    return commandError("No se puede enviar la maquina al Taller mientras su local tenga una caja abierta.");
  }
  const next: Machine = { ...existing, localId: WORKSHOP_LOCAL_ID, location: WORKSHOP_LABEL };
  const timestamp = context.now();
  const history = [
    historyEvent(existing, existing.localId, "MOVIDA", detail, context, timestamp),
    historyEvent(
      next,
      WORKSHOP_LOCAL_ID,
      "MOVIDA",
      `Recibida desde ${localName(data, existing.localId)}`,
      context,
      timestamp,
    ),
  ];
  return commandSuccess(
    auditCommand(
      {
        ...data,
        machines: data.machines.map((machine) => (machine.id === existing.id ? next : machine)),
        machineLocalHistory: [...history, ...data.machineLocalHistory],
      },
      context,
      "Enviar maquina al taller",
      "Maquina",
      existing.id,
      existing,
      next,
      "Autorizado",
    ),
    next,
  );
}

export function deleteMachineCommand(
  data: AppData,
  machineId: string,
  context: CommandContext,
): CommandResult<Machine> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const existing = data.machines.find((machine) => machine.id === machineId);
  if (!existing) return commandError("No se encontro la maquina.");
  if (existing.localId !== WORKSHOP_LOCAL_ID) {
    return commandError("Para eliminar una maquina primero hay que enviarla al taller.");
  }
  if (data.readings.some((reading) => reading.machineId === existing.id)) {
    return commandError("No se puede eliminar una maquina que tenga recaudaciones.");
  }
  const timestamp = context.now();
  const history = historyEvent(
    existing,
    existing.localId,
    "QUITADA",
    "Baja definitiva desde taller",
    context,
    timestamp,
  );
  return commandSuccess(
    auditCommand(
      {
        ...data,
        machines: data.machines.filter((machine) => machine.id !== existing.id),
        machineLocalHistory: [history, ...data.machineLocalHistory],
      },
      context,
      "Eliminar maquina",
      "Maquina",
      existing.id,
      existing,
      "",
      "Autorizado",
    ),
    existing,
  );
}

export function assignMachinesToLocalCommand(
  data: AppData,
  localId: string,
  machineIds: string[],
  context: CommandContext,
): CommandResult<Machine[]> {
  const permissionError = requireAdministrator(context);
  if (permissionError) return commandError(permissionError);
  const local = data.locals.find((item) => item.id === localId);
  if (!local) return commandError("No se encontro el local.");
  if (local.status === "CERRADO") return commandError("No se pueden asignar maquinas a un local cerrado.");
  if (openBalanceForLocal(data, local.id)) {
    return commandError("No se pueden asignar maquinas mientras el local tenga una caja abierta.");
  }
  const selectedIds = [...new Set(machineIds)];
  if (!selectedIds.length) return commandError("Seleccione al menos una maquina del taller.");
  const selectedMachines = data.machines.filter((machine) => selectedIds.includes(machine.id));
  if (
    selectedMachines.length !== selectedIds.length ||
    selectedMachines.some((machine) => machine.localId !== WORKSHOP_LOCAL_ID || machine.status === "DESUSO")
  ) {
    return commandError("Solo se pueden asignar maquinas disponibles del Taller.");
  }
  const timestamp = context.now();
  const machines = data.machines.map((machine) =>
    selectedIds.includes(machine.id) ? { ...machine, localId: local.id, location: local.name } : machine,
  );
  const assigned = machines.filter((machine) => selectedIds.includes(machine.id));
  const history = selectedMachines.flatMap((machine) => [
    historyEvent(machine, local.id, "MOVIDA", `Asignada desde ${WORKSHOP_LABEL}`, context, timestamp),
    historyEvent(machine, WORKSHOP_LOCAL_ID, "MOVIDA", `Movida al local ${local.name}`, context, timestamp),
  ]);
  return commandSuccess(
    auditCommand(
      { ...data, machines, machineLocalHistory: [...history, ...data.machineLocalHistory] },
      context,
      "Asignar maquinas a local",
      "Local",
      local.id,
      "",
      { localId: local.id, machineIds: selectedIds },
      "Autorizado",
    ),
    assigned,
  );
}
