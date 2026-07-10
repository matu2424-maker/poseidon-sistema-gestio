import type { AppData, Balance, Role } from "../types";

export const roleLabels: Record<Role, string> = {
  CAJERO: "Cajero",
  ENCARGADO: "Encargado",
  ADMINISTRADOR: "Administrador",
};

export const localName = (data: Pick<AppData, "locals">, localId: string) =>
  data.locals.find((local) => local.id === localId)?.name ?? (localId === "taller" ? "Taller" : localId);

export const localCode = (name: string) => (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "CAJA");

export const balanceVisibleId = (data: Pick<AppData, "locals">, balance: Balance) =>
  balance.visibleId ?? `${localCode(localName(data, balance.localId))}-${balance.id.slice(-4)}`;

export const userDisplayName = (data: AppData, userId: string | undefined) =>
  userId ? data.users.find((item) => item.id === userId)?.name ?? userId : "-";

export const userDisplayNameWithRole = (data: AppData, userId: string | undefined, role: Role | undefined) => {
  const name = userDisplayName(data, userId);
  return role ? `${name} como ${roleLabels[role]}` : name;
};
