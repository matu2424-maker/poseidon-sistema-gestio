import type { Role } from "../../types";

export const LOCAL_SESSION_KEY = "poseidon-local-session-v1";

export type LocalSession = {
  userId: string;
  actingRole: Role;
};

type SessionStoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const roles: Role[] = ["CAJERO", "ENCARGADO", "ADMINISTRADOR"];

const isRole = (value: unknown): value is Role => roles.includes(value as Role);

export function readLocalSession(storage: SessionStoragePort = sessionStorage): LocalSession | null {
  try {
    const raw = storage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalSession>;
    if (typeof parsed.userId !== "string" || !parsed.userId || !isRole(parsed.actingRole)) return null;
    return { userId: parsed.userId, actingRole: parsed.actingRole };
  } catch {
    return null;
  }
}

export function writeLocalSession(session: LocalSession, storage: SessionStoragePort = sessionStorage) {
  storage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
}

export function clearLocalSession(storage: SessionStoragePort = sessionStorage) {
  storage.removeItem(LOCAL_SESSION_KEY);
}

export function allowedActingRole(actualRole: Role, requestedRole: Role): Role {
  if (requestedRole === actualRole) return actualRole;
  if (requestedRole === "CAJERO" && (actualRole === "ENCARGADO" || actualRole === "ADMINISTRADOR")) return "CAJERO";
  return actualRole;
}
