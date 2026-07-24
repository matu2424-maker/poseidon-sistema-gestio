import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { expectedReleaseTag, validateReleaseConfiguration } from "./release-readiness.mjs";

const readText = (path) => readFile(path, "utf8");
const readJson = async (path) => JSON.parse(await readText(path));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const [packageJson, nodeVersion, gitignore, vercelConfig, changelog, releaseGuide, workflow] = await Promise.all([
  readJson("package.json"),
  readText(".node-version"),
  readText(".gitignore"),
  readJson("vercel.json"),
  readText("CHANGELOG.md"),
  readText("docs/RELEASES_Y_DESPLIEGUES.md"),
  readText(".github/workflows/quality.yml"),
]);

const errors = validateReleaseConfiguration({
  packageJson,
  nodeVersion,
  gitignore,
  vercelConfig,
  changelog,
  releaseGuide,
  workflow,
});
const warnings = [];

const status = git("status", "--porcelain");
if (status) errors.push("El arbol de trabajo debe estar limpio para validar un candidato de release.");

const tracked = git("ls-files")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((path) => path.replaceAll("\\", "/"));
const forbiddenTracked = tracked.filter(
  (path) =>
    path === ".env" ||
    (path.startsWith(".env.") && path !== ".env.example") ||
    path.startsWith(".vercel/") ||
    path === "dist" ||
    path.startsWith("dist/"),
);
if (forbiddenTracked.length) errors.push(`Hay rutas sensibles o generadas versionadas: ${forbiddenTracked.join(", ")}.`);

const branch = git("branch", "--show-current") || "(detached)";
const commit = git("rev-parse", "HEAD");
const expectedTag = expectedReleaseTag(packageJson.version);
const headTags = git("tag", "--points-at", "HEAD")
  .split(/\r?\n/)
  .filter(Boolean);
const versionTags = headTags.filter((tag) => tag.startsWith("v"));
if (versionTags.length && !versionTags.includes(expectedTag)) {
  errors.push(`HEAD tiene una etiqueta de version distinta de ${expectedTag}: ${versionTags.join(", ")}.`);
}
if (!headTags.includes(expectedTag)) warnings.push(`El candidato todavia no tiene la etiqueta ${expectedTag}.`);

let ahead = "sin referencia local";
try {
  ahead = git("rev-list", "--count", "origin/main..HEAD");
} catch {
  warnings.push("No se pudo comparar HEAD con origin/main.");
}

if (errors.length) {
  console.error("Poseidon no esta listo para crear una version:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Preparacion local de release valida.");
  console.log(`- Version: ${packageJson.version}`);
  console.log(`- Etiqueta esperada: ${expectedTag}`);
  console.log(`- Rama: ${branch}`);
  console.log(`- Commit: ${commit}`);
  console.log(`- Commits delante de origin/main: ${ahead}`);
  warnings.forEach((warning) => console.log(`- Aviso: ${warning}`));
}
