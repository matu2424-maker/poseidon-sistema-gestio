import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_POSEIDON_SKILLS,
  parseSkillInterfaceSource,
  parseSkillSource,
  validateSkillContract,
  validateSkillInfrastructure,
} from "./skill-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("infraestructura de skills Poseidon", () => {
  it("interpreta frontmatter e interfaz", () => {
    expect(parseSkillSource("---\nname: demo\ndescription: descripcion suficientemente extensa para activar una habilidad de prueba concreta y repetible.\n---\n# Demo\nCuerpo.")).toMatchObject({ name: "demo", body: "# Demo\nCuerpo." });
    expect(parseSkillInterfaceSource('interface:\n  display_name: "Demo"\n  short_description: "Descripcion visible suficientemente larga"\n  default_prompt: "Usa $demo ahora."\n')).toEqual({
      displayName: "Demo",
      shortDescription: "Descripcion visible suficientemente larga",
      defaultPrompt: "Usa $demo ahora.",
    });
  });

  it("rechaza plantillas incompletas", () => {
    const errors = validateSkillContract({
      expectedName: "poseidon-module-change",
      skill: { name: "otro", description: "[TODO]", body: "Sin titulo", lines: 8 },
      ui: { displayName: "", shortDescription: "corta", defaultPrompt: "sin mencion" },
    });
    expect(errors.length).toBeGreaterThan(6);
  });

  it("valida las cuatro skills versionadas", async () => {
    const result = await validateSkillInfrastructure({ rootDir });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.skills).toEqual(EXPECTED_POSEIDON_SKILLS);
  });
});
