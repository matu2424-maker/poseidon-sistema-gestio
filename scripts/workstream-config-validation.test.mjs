import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_ROLE_CHAT_IDS,
  validateWorkstreamConfig,
  validateWorkstreamInfrastructure,
} from "./workstream-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const validConfig = () => ({
  schemaVersion: 1,
  integrationBranch: "main",
  central: {
    id: "poseidon-central",
    prompt: "central.md",
    reservedPaths: ["src/shared/"],
  },
  roleChats: EXPECTED_ROLE_CHAT_IDS.map((id, index) => ({
    id,
    title: `Chat ${index}`,
    prompt: `prompt-${index}.md`,
    context: `context-${index}.md`,
    writeScopes: [`src/role-${index}/`],
    requiredChecks: ["pnpm run check", "pnpm run build", "pnpm run check:commit"],
  })),
  specialists: [{ id: "especialista", context: "specialist.md" }],
  workOrderTemplate: "order.md",
  handoffTemplate: "handoff.md",
  integrationQueue: "queue.md",
  projectStatus: "status.json",
  decisionRegistry: "decisions.json",
  migrationRegistry: "migrations.json",
  capabilityRegistry: "capabilities.json",
});

describe("coordinacion de chats Poseidon", () => {
  it("acepta propietarios de rol sin superposicion", () => {
    expect(validateWorkstreamConfig(validConfig())).toEqual([]);
  });

  it("rechaza propiedad superpuesta entre chats", () => {
    const config = validConfig();
    config.roleChats[1].writeScopes = ["src/role-0/detail/"];
    expect(validateWorkstreamConfig(config).join(" ")).toContain("superponen propiedad");
  });

  it("rechaza que un chat invada un contrato central", () => {
    const config = validConfig();
    config.roleChats[0].writeScopes = ["src/shared/child/"];
    expect(validateWorkstreamConfig(config).join(" ")).toContain("invade contrato reservado");
  });

  it("exige el control previo al commit", () => {
    const config = validConfig();
    config.roleChats[0].requiredChecks = ["pnpm run check"];
    expect(validateWorkstreamConfig(config).join(" ")).toContain("pnpm run check:commit");
  });

  it("exige los registros de gobierno operativo", () => {
    const config = validConfig();
    delete config.migrationRegistry;
    expect(validateWorkstreamConfig(config).join(" ")).toContain("Falta migrationRegistry");
  });

  it("valida la infraestructura versionada del repositorio", async () => {
    const result = await validateWorkstreamInfrastructure({ rootDir });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.roleChats).toEqual(EXPECTED_ROLE_CHAT_IDS);
  });
});
