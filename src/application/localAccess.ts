import type { AppData, Role } from "../types";
import type { CommandContext } from "./command";

const allowedFunctionsByRole: Record<Role, readonly Role[]> = {
  CAJERO: ["CAJERO"],
  ENCARGADO: ["ENCARGADO", "CAJERO"],
  ADMINISTRADOR: ["ADMINISTRADOR", "ENCARGADO", "CAJERO"],
};

export function commandFunctionAccessError(
  context: CommandContext,
  allowedFunctions: readonly Role[],
  deniedMessage: string,
) {
  if (!allowedFunctionsByRole[context.user.role].includes(context.actorRole)) {
    return "La funcion activa no corresponde al usuario autenticado.";
  }
  if (!allowedFunctions.includes(context.actorRole)) return deniedMessage;
  if (context.user.status !== "ACTIVO") return "El usuario no esta activo.";
  return "";
}

export function commandLocalsAccessError(
  data: AppData,
  localIds: readonly string[],
  context: CommandContext,
  allowedFunctions: readonly Role[],
  deniedMessage: string,
) {
  const functionError = commandFunctionAccessError(context, allowedFunctions, deniedMessage);
  if (functionError) return functionError;

  for (const localId of [...new Set(localIds)]) {
    if (!data.locals.some((local) => local.id === localId)) return "No se encontro el local.";
    if (context.user.role !== "ADMINISTRADOR" && !context.user.localIds.includes(localId)) {
      return "El usuario no esta asignado al local seleccionado.";
    }
  }
  return "";
}

export function localCommandAccessError(
  data: AppData,
  localId: string,
  context: CommandContext,
  allowedFunctions: readonly Role[],
  deniedMessage: string,
) {
  return commandLocalsAccessError(data, [localId], context, allowedFunctions, deniedMessage);
}
