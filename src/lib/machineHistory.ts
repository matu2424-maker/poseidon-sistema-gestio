import type { Machine, MachineLocalHistory } from "../types";
import { nowIso } from "./dates";
import { uid } from "./ids";

export const machineHistoryEvent = (
  machine: Pick<Machine, "id" | "visibleId" | "name">,
  localId: string,
  action: MachineLocalHistory["action"],
  detail: string,
  userId: string,
  options: { id?: string; createdAt?: string } = {},
): MachineLocalHistory => ({
  id: options.id ?? uid("machine-history"),
  machineId: machine.id,
  machineVisibleId: machine.visibleId,
  machineName: machine.name,
  localId,
  action,
  detail,
  createdAt: options.createdAt ?? nowIso(),
  userId,
});
