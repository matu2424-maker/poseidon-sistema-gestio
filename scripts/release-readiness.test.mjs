import { describe, expect, it } from "vitest";
import {
  containsSensitiveReleaseContent,
  expectedReleaseTag,
  validateReleaseConfiguration,
} from "./release-readiness.mjs";

const validInput = {
  packageJson: {
    private: true,
    version: "0.1.0-beta.1",
    packageManager: "pnpm@11.9.0",
    engines: { node: ">=24.14.0 <25" },
    scripts: {
      "release:check": "node scripts/check-release-readiness.mjs",
      ci: "pnpm run check && pnpm run build",
    },
  },
  nodeVersion: "24.14.0\n",
  gitignore: ".env\n.env.*\n!.env.example\n.vercel/\ndist/\n",
  vercelConfig: {
    installCommand: "pnpm install --frozen-lockfile",
    buildCommand: "pnpm run build",
    outputDirectory: "dist",
    git: { deploymentEnabled: { main: false } },
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  },
  changelog: "## [0.1.0-beta.1] - 2026-07-24",
  releaseGuide: "release/test vMAJOR.MINOR.PATCH rollback localStorage",
  workflow:
    "release/test actions/checkout@v6 actions/setup-node@v6 pnpm/action-setup@v6 actions/upload-artifact@v7 pnpm install --frozen-lockfile pnpm run check pnpm run build pnpm run release:check pnpm run test:e2e pnpm exec supabase start pnpm run backend:check pnpm exec supabase stop --no-backup",
};

describe("preparacion de releases", () => {
  it("acepta la configuracion canonica", () => {
    expect(validateReleaseConfiguration(validInput)).toEqual([]);
    expect(expectedReleaseTag("0.1.0-beta.1")).toBe("v0.1.0-beta.1");
  });

  it("detecta una entrega no reproducible", () => {
    const errors = validateReleaseConfiguration({
      ...validInput,
      packageJson: { ...validInput.packageJson, packageManager: "pnpm@latest" },
      gitignore: "dist/\n",
      vercelConfig: {
        ...validInput.vercelConfig,
        installCommand: "pnpm install",
        git: { deploymentEnabled: { main: true } },
      },
      changelog: "",
    });

    expect(errors).toContain("packageManager debe fijar una version exacta de pnpm.");
    expect(errors).toContain("Vercel debe instalar con lockfile congelado.");
    expect(errors).toContain("Vercel no debe desplegar automaticamente la rama main.");
    expect(errors).toContain("CHANGELOG.md debe registrar 0.1.0-beta.1.");
    expect(errors).toContain(".gitignore debe contener .vercel/.");
  });

  it("rechaza Actions que no usan el runtime Node 24 vigente", () => {
    const errors = validateReleaseConfiguration({
      ...validInput,
      workflow:
        "release/test actions/checkout@v4 actions/setup-node@v4 pnpm/action-setup@v4 actions/upload-artifact@v4 pnpm install --frozen-lockfile pnpm run check pnpm run build pnpm run release:check pnpm run test:e2e",
    });

    expect(errors).toContain("El workflow de calidad debe incluir actions/checkout@v6.");
    expect(errors).toContain("El workflow de calidad debe incluir actions/setup-node@v6.");
    expect(errors).toContain("El workflow de calidad debe incluir pnpm/action-setup@v6.");
    expect(errors).toContain("El workflow de calidad debe incluir actions/upload-artifact@v7.");
  });

  it("detecta credenciales privadas sin marcar placeholders ni claves publicables", () => {
    expect(
      containsSensitiveReleaseContent(
        ["DATABASE", "_URL=postgres", "ql://poseidon:secret@db.example.com/db"].join(""),
      ),
    ).toBe(true);
    expect(
      containsSensitiveReleaseContent(
        ["SUPABASE_SERVICE", "_ROLE_KEY=sb_", "secret_1234567890123456"].join(""),
      ),
    ).toBe(true);
    expect(
      containsSensitiveReleaseContent(
        ["SUPABASE_ACCESS", "_TOKEN=sb", "p_1234567890123456"].join(""),
      ),
    ).toBe(true);
    expect(containsSensitiveReleaseContent(["JWT", "_SECRET=do-not-commit"].join(""))).toBe(true);
    expect(containsSensitiveReleaseContent(["-----BEGIN PRIVATE", " KEY-----"].join(""))).toBe(true);
    expect(containsSensitiveReleaseContent(["DATABASE", "_URL=<configurar-en-el-proveedor>"].join(""))).toBe(false);
    expect(containsSensitiveReleaseContent("VITE_SUPABASE_PUBLISHABLE_KEY=public-key")).toBe(false);
  });
});
