import { describe, expect, it } from "vitest";
import { buildCheckPlan, changedFilesFromStatus } from "./precommit-check.mjs";

describe("control previo al commit", () => {
  it("selecciona check y build para codigo", () => {
    expect(buildCheckPlan(["src/App.tsx", "docs/modulos/00_base_sistema.md"])).toEqual(["check", "build"]);
  });

  it("selecciona validadores especificos para infraestructura", () => {
    expect(buildCheckPlan([".agents/skills/poseidon-module-change/SKILL.md"])).toEqual(["check:skills"]);
    expect(buildCheckPlan([".codex/config.toml", "docs/REGLAS_VISUALES.md"])).toEqual(["check:agents", "check:design"]);
  });

  it("interpreta rutas modificadas y renombradas", () => {
    expect(changedFilesFromStatus(" M docs/a.md\n?? .agents/\nR  viejo.md -> nuevo.md\n")).toEqual(["docs/a.md", ".agents/", "nuevo.md"]);
  });
});
