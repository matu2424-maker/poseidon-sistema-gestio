import { describe, expect, it } from "vitest";
import { allowedActingRole, clearLocalSession, LOCAL_SESSION_KEY, readLocalSession, writeLocalSession } from "./localSession";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("local session", () => {
  it("persiste y elimina usuario y funcion activa", () => {
    const storage = memoryStorage();
    writeLocalSession({ userId: "user-admin", actingRole: "CAJERO" }, storage);
    expect(readLocalSession(storage)).toEqual({ userId: "user-admin", actingRole: "CAJERO" });
    clearLocalSession(storage);
    expect(storage.getItem(LOCAL_SESSION_KEY)).toBeNull();
  });

  it("descarta contenido corrupto o incompleto", () => {
    const storage = memoryStorage();
    storage.setItem(LOCAL_SESSION_KEY, "{invalido");
    expect(readLocalSession(storage)).toBeNull();
    storage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: "user-admin", actingRole: "OTRO" }));
    expect(readLocalSession(storage)).toBeNull();
  });

  it("solo permite rol real o funcion cajero para encargado y administrador", () => {
    expect(allowedActingRole("ENCARGADO", "CAJERO")).toBe("CAJERO");
    expect(allowedActingRole("ADMINISTRADOR", "ENCARGADO")).toBe("ADMINISTRADOR");
    expect(allowedActingRole("CAJERO", "ADMINISTRADOR")).toBe("CAJERO");
  });
});
