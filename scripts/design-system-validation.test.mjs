import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VISUAL_PILOTS_PATH, VISUAL_REFERENCES, VISUAL_SYSTEM_PATH, validateDesignSystem } from "./design-system-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("gobierno del sistema visual", () => {
  it("conserva las fuentes y referencias visuales versionadas", async () => {
    const result = await validateDesignSystem({ rootDir });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.checks.length).toBeGreaterThan(20);
    expect(VISUAL_SYSTEM_PATH).toBe("docs/SISTEMA_VISUAL_POSEIDON.md");
    expect(VISUAL_PILOTS_PATH).toBe("docs/PILOTOS_DISENO_POSEIDON.md");
    expect(VISUAL_REFERENCES).toHaveLength(2);
  });
});
