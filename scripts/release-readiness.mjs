const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const expectedReleaseTag = (version) => `v${version}`;

const normalizedLines = (source) =>
  new Set(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

export function validateReleaseConfiguration({
  packageJson,
  nodeVersion,
  gitignore,
  vercelConfig,
  changelog,
  releaseGuide,
  workflow,
}) {
  const errors = [];
  const version = String(packageJson?.version ?? "");
  const packageManager = String(packageJson?.packageManager ?? "");
  const engine = String(packageJson?.engines?.node ?? "");
  const node = String(nodeVersion ?? "").trim();

  if (packageJson?.private !== true) errors.push("package.json debe conservar private=true.");
  if (!SEMVER_PATTERN.test(version)) errors.push("package.json.version debe usar SemVer valido.");
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(packageManager)) errors.push("packageManager debe fijar una version exacta de pnpm.");
  if (!/^\d+\.\d+\.\d+$/.test(node)) errors.push(".node-version debe fijar una version exacta de Node.");

  const nodeMajor = Number(node.split(".")[0]);
  if (!engine.includes(`>=${node}`) || !engine.includes(`<${nodeMajor + 1}`)) {
    errors.push("engines.node debe incluir la version fijada y limitar el siguiente major.");
  }

  if (packageJson?.scripts?.["release:check"] !== "node scripts/check-release-readiness.mjs") {
    errors.push("package.json debe registrar release:check.");
  }
  if (packageJson?.scripts?.ci !== "pnpm run check && pnpm run build") {
    errors.push("package.json debe registrar el control CI canonico.");
  }

  const ignored = normalizedLines(gitignore);
  for (const required of [".env", ".env.*", "!.env.example", ".vercel/", "dist/"]) {
    if (!ignored.has(required)) errors.push(`.gitignore debe contener ${required}.`);
  }

  if (vercelConfig?.installCommand !== "pnpm install --frozen-lockfile") {
    errors.push("Vercel debe instalar con lockfile congelado.");
  }
  if (vercelConfig?.buildCommand !== "pnpm run build" || vercelConfig?.outputDirectory !== "dist") {
    errors.push("La configuracion de build de Vercel no coincide con Poseidon.");
  }
  if (!Array.isArray(vercelConfig?.rewrites) || !vercelConfig.rewrites.some((rewrite) => rewrite?.destination === "/index.html")) {
    errors.push("Vercel debe conservar el fallback de React Router.");
  }

  if (!changelog.includes(`## [${version}]`)) errors.push(`CHANGELOG.md debe registrar ${version}.`);
  for (const fragment of ["release/test", "vMAJOR.MINOR.PATCH", "rollback", "localStorage"]) {
    if (!releaseGuide.includes(fragment)) errors.push(`La guia de releases debe incluir ${fragment}.`);
  }
  for (const fragment of [
    "pnpm install --frozen-lockfile",
    "pnpm run check",
    "pnpm run build",
    "pnpm run release:check",
    "pnpm run test:e2e",
    "release/test",
    "actions/checkout@v6",
    "actions/setup-node@v6",
    "pnpm/action-setup@v6",
    "actions/upload-artifact@v7",
  ]) {
    if (!workflow.includes(fragment)) errors.push(`El workflow de calidad debe incluir ${fragment}.`);
  }

  return errors;
}
