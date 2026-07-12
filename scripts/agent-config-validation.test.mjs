import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_AGENT_PROFILES,
  parseAgentConfigSource,
  parseAgentProfileSource,
  validateAgentInfrastructure,
  validateProfileContract,
} from "./agent-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const validInstructions = `
Trabaja exclusivamente en modo de solo lectura.
No modifiques archivos, no instales dependencias, no inicies servidores, no hagas commits
y no ejecutes comandos que alteren datos o el repositorio.
`;

describe("infraestructura de agentes Codex", () => {
  it("interpreta los limites globales controlados", () => {
    expect(parseAgentConfigSource("[agents]\nmax_threads = 3\nmax_depth = 1\ninterrupt_message = true\n")).toEqual({
      maxThreads: 3,
      maxDepth: 1,
      interruptMessage: true,
    });
  });

  it("interpreta un perfil TOML con instrucciones multilinea", () => {
    const source = `name = "poseidon_test"\ndescription = "Perfil de prueba suficientemente descriptivo."\nsandbox_mode = "read-only"\ndeveloper_instructions = """${validInstructions}"""\n`;
    expect(parseAgentProfileSource(source)).toMatchObject({
      name: "poseidon_test",
      sandboxMode: "read-only",
      declaresModel: false,
    });
  });

  it("acepta un contrato completo de solo lectura", () => {
    expect(
      validateProfileContract(
        {
          name: "poseidon_test",
          description: "Perfil de prueba suficientemente descriptivo.",
          sandboxMode: "read-only",
          developerInstructions: validInstructions,
          declaresModel: false,
        },
        "poseidon_test",
      ),
    ).toEqual([]);
  });

  it("rechaza escritura, modelo fijo y restricciones incompletas", () => {
    const errors = validateProfileContract(
      {
        name: "otro",
        description: "corta",
        sandboxMode: "workspace-write",
        developerInstructions: "Puede editar archivos.",
        declaresModel: true,
      },
      "poseidon_test",
    );
    expect(errors.join(" ")).toContain("sandbox_mode debe ser read-only");
    expect(errors.join(" ")).toContain("no debe fijar model");
    expect(errors.length).toBeGreaterThan(5);
  });

  it("valida la infraestructura versionada del repositorio", async () => {
    const result = await validateAgentInfrastructure({ rootDir });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.profiles).toEqual(EXPECTED_AGENT_PROFILES);
  });
});
