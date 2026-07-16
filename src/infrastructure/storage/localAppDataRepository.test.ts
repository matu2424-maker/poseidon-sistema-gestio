import { describe, expect, it } from "vitest";
import type { AuditEvent } from "../../types";
import { createSeedData } from "../../data/appData";
import {
  appDataForStorage,
  createLocalAppDataRepository,
  importLocalAppData,
  serializeAppData,
  type KeyValueStorage,
} from "./localAppDataRepository";
import { CURRENT_SCHEMA_VERSION } from "./snapshot";

describe("repositorio local de AppData", () => {
  it("conserva auditoria e historiales completos al preparar el guardado", () => {
    const seed = createSeedData();
    const template = seed.audit[0];
    const audit: AuditEvent[] = Array.from({ length: 500 }, (_, index) => ({
      ...template,
      id: `audit-${index}`,
      previousValue: index === 0 ? `data:image/png;base64,${"a".repeat(600)}` : template.previousValue,
    }));
    const stored = appDataForStorage({ ...seed, audit });
    expect(stored.audit).toHaveLength(500);
    expect(stored.machineLocalHistory).toHaveLength(seed.machineLocalHistory.length);
    expect(stored.accountMovements).toHaveLength(seed.accountMovements.length);
    expect(stored.audit[0].previousValue).toContain("archivo no persistido");
  });

  it("exporta e importa un snapshot versionado", () => {
    const seed = createSeedData();
    const result = importLocalAppData(serializeAppData(seed));
    expect(result).toMatchObject({ status: "ready", sourceVersion: CURRENT_SCHEMA_VERSION, needsRewrite: false });
    if (result.status === "ready") expect(result.data.locals[0].name).toBe("Poseidon");
  });

  it("cumple el puerto asincrono usando almacenamiento clave-valor local", async () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    const repository = createLocalAppDataRepository(storage);
    expect(await repository.load()).toEqual({ status: "empty" });

    const seed = createSeedData();
    const saved = await repository.save(seed);
    expect(saved.status).toBe("ok");
    const loaded = await repository.load();
    expect(loaded).toMatchObject({ status: "ready", sourceVersion: CURRENT_SCHEMA_VERSION, needsRewrite: false });
    if (loaded.status === "ready") expect(loaded.data.machines).toHaveLength(3);

    await repository.clear();
    expect(await repository.load()).toEqual({ status: "empty" });
  });

  it("rechaza un guardado si otra pestaña cambio la version leida", async () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    const repository = createLocalAppDataRepository(storage);
    const seed = createSeedData();
    const first = await repository.save(seed, null);
    expect(first.status).toBe("ok");
    if (first.status !== "ok") return;

    const external = await repository.save({ ...seed, locals: [{ ...seed.locals[0], tenantName: "Otra pestaña" }] });
    expect(external.status).toBe("ok");
    const stale = await repository.save({ ...seed, locals: [{ ...seed.locals[0], tenantName: "Cambio pendiente" }] }, first.raw);

    expect(stale).toMatchObject({ status: "conflict" });
    if (stale.status !== "conflict") return;
    expect(stale.attemptedRaw).toContain("Cambio pendiente");
    expect(stale.storedRaw).toContain("Otra pestaña");
  });

  it("devuelve un respaldo del intento cuando falla la escritura", async () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Cuota agotada");
      },
      removeItem: () => undefined,
    };
    const result = await createLocalAppDataRepository(storage).save(createSeedData(), null);
    expect(result).toMatchObject({ status: "failed", error: "Cuota agotada" });
    if (result.status !== "failed") return;
    expect(result.attemptedRaw).toContain("poseidon-app-data");
  });
});
