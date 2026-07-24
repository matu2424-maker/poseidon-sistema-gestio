import { describe, expect, it } from "vitest";
import { expectedReleaseTag, validateReleaseConfiguration } from "./release-readiness.mjs";

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
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  },
  changelog: "## [0.1.0-beta.1] - 2026-07-24",
  releaseGuide: "release/test vMAJOR.MINOR.PATCH rollback localStorage",
  workflow:
    "release/test actions/checkout@v6 actions/setup-node@v6 pnpm/action-setup@v6 actions/upload-artifact@v7 pnpm install --frozen-lockfile pnpm run check pnpm run build pnpm run release:check pnpm run test:e2e",
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
      vercelConfig: { ...validInput.vercelConfig, installCommand: "pnpm install" },
      changelog: "",
    });

    expect(errors).toContain("packageManager debe fijar una version exacta de pnpm.");
    expect(errors).toContain("Vercel debe instalar con lockfile congelado.");
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
});
