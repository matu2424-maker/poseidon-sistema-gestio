import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  validateCapabilityRegistry,
  validateDecisionRegistry,
  validateGovernanceInfrastructure,
  validateMigrationRegistry,
  validateProjectStatus,
} from "./governance-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const validStatus = () => ({
  schemaVersion: 1,
  project: { id: "poseidon", status: "ACTIVE", mode: "LOCAL_ONLY", defaultBranch: "main", updatedAt: "2026-07-18" },
  current: { phase: "local", objective: "Objetivo", activeWorkOrders: [], queuedWorkOrders: [], blockedWorkOrders: [], pendingIntegrations: [] },
  lastCompletedBlock: { id: "BLOCK-1", title: "Bloque", state: "INTEGRADA" },
  health: { overall: "GREEN", mainRisk: "Riesgo", risks: [{ id: "RISK-001", severity: "LOW", summary: "Resumen" }] },
  nextActions: ["Accion"],
  registries: { workstreams: "a", integrationQueue: "b", decisions: "c", migrations: "d", capabilities: "e" },
});

describe("gobierno operativo Poseidon", () => {
  it("acepta registros estructurales minimos", () => {
    expect(validateProjectStatus(validStatus())).toEqual([]);
    expect(validateDecisionRegistry({ schemaVersion: 1, decisions: [{ id: "DEC-2026-001", title: "Decision", status: "APPROVED", date: "2026-07-18", document: "docs/coordinacion/decisiones/decision.md", scope: "Global" }] })).toEqual([]);
    expect(validateMigrationRegistry({ schemaVersion: 1, migrations: [{ id: "MIG-2026-07-18-001", runtimeId: "schema-v2", status: "APPLIED", type: "SCHEMA", risk: "HIGH", sourceSchema: 1, targetSchema: 2, implementation: "src/migrate.ts", tests: ["src/migrate.test.ts"], introducedByCommit: "a".repeat(40), legacyRecord: false, financialData: true, appendOnly: true, reversible: false, summary: "Migracion" }] })).toEqual([]);
    expect(validateCapabilityRegistry({ schemaVersion: 1, capabilities: [{ id: "CAP-TEST", name: "Test", type: "VALIDATOR", owner: "central", status: "ACTIVE", riskLevel: "C1", paths: ["script.mjs"], validationCommand: "pnpm run check:test", externalAccess: false }] })).toEqual([]);
  });

  it("rechaza ordenes y decisiones duplicadas", () => {
    const status = validStatus();
    status.current.activeWorkOrders = ["WO-1"];
    status.current.queuedWorkOrders = ["WO-1"];
    expect(validateProjectStatus(status).join(" ")).toContain("repite la orden WO-1");
    const decision = { id: "DEC-2026-001", title: "Decision", status: "APPROVED", date: "2026-07-18", document: "docs/coordinacion/decisiones/decision.md", scope: "Global" };
    expect(validateDecisionRegistry({ schemaVersion: 1, decisions: [decision, decision] }).join(" ")).toContain("Decision duplicada");
  });

  it("exige commit exacto para una migracion no heredada", () => {
    const errors = validateMigrationRegistry({ schemaVersion: 1, migrations: [{ id: "MIG-2026-07-18-001", runtimeId: "schema-v2", status: "APPLIED", type: "SCHEMA", risk: "HIGH", sourceSchema: 1, targetSchema: 2, implementation: "src/migrate.ts", tests: ["src/migrate.test.ts"], introducedByCommit: "corto", legacyRecord: false, financialData: true, appendOnly: true, reversible: false, summary: "Migracion" }] });
    expect(errors.join(" ")).toContain("SHA completo");
  });

  it("valida la infraestructura versionada del repositorio", async () => {
    const result = await validateGovernanceInfrastructure({ rootDir });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.counts).toEqual({ decisions: 5, migrations: 2, capabilities: 14 });
  });
});
