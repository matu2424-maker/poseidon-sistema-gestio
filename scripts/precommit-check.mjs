import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const normalizePath = (value) => value.trim().replaceAll("\\", "/");

export function buildCheckPlan(files) {
  const normalizedFiles = files.map(normalizePath).filter(Boolean);
  const touchesCode = normalizedFiles.some((file) =>
    /^(src|e2e|scripts)\//.test(file) || /^(package\.json|pnpm-lock\.yaml|tsconfig[^/]*\.json|vite\.config\.mjs|playwright\.config\.ts)$/.test(file),
  );
  if (touchesCode) return ["check", "build"];

  const plan = [];
  if (normalizedFiles.some((file) => file.startsWith(".agents/skills/") || file === "docs/SKILLS_POSEIDON.md")) plan.push("check:skills");
  if (normalizedFiles.some((file) => file.startsWith(".codex/") || /docs\/(PROTOCOLO_AGENTES_CODEX|REGISTRO_DELEGACIONES_AGENTES)\.md/.test(file))) plan.push("check:agents");
  if (normalizedFiles.some((file) => /docs\/(REGLAS_VISUALES|SISTEMA_VISUAL_POSEIDON|REVISIONES_DE_DISENO_POSEIDON)\.md/.test(file) || file.startsWith("docs/referencias-visuales/"))) plan.push("check:design");
  return [...new Set(plan)];
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: "inherit", shell: false, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const output = (command, args) => {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", shell: false });
  if (result.status !== 0) return "";
  return result.stdout.trim();
};

const runPnpmScript = (script) => {
  if (process.env.npm_execpath) run(process.execPath, [process.env.npm_execpath, "run", script], { shell: false });
  else run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", script], { shell: process.platform === "win32" });
};

export function changedFilesFromStatus(statusSource) {
  return statusSource
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").at(-1) ?? "")
    .map(normalizePath)
    .filter(Boolean);
}

async function main() {
  const staged = output("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  const files = staged ? staged.split(/\r?\n/) : changedFilesFromStatus(output("git", ["status", "--short"]));
  if (staged) run("git", ["diff", "--cached", "--check"]);
  else run("git", ["diff", "--check"]);

  const plan = buildCheckPlan(files);
  console.log(`Control previo al commit: ${files.length} ruta(s), ${plan.length} validacion(es).`);
  if (!plan.length) console.log("- Solo control de formato Git; no hay codigo ni infraestructura afectada.");
  for (const script of plan) {
    console.log(`- pnpm run ${script}`);
    runPnpmScript(script);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
