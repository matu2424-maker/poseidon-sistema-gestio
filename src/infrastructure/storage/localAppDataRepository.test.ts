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
});
