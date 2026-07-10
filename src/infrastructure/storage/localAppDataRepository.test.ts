import { describe, expect, it } from "vitest";
import type { AuditEvent } from "../../types";
import { createSeedData } from "../../data/appData";
import { appDataForStorage, importLocalAppData, serializeAppData } from "./localAppDataRepository";

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
    expect(result).toMatchObject({ status: "ready", sourceVersion: 1, needsRewrite: false });
    if (result.status === "ready") expect(result.data.locals[0].name).toBe("Poseidon");
  });
});
