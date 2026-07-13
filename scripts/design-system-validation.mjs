import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const VISUAL_SYSTEM_PATH = "docs/SISTEMA_VISUAL_POSEIDON.md";
export const VISUAL_REVIEWS_PATH = "docs/REVISIONES_DE_DISENO_POSEIDON.md";
export const VISUAL_REFERENCES = [
  "docs/referencias-visuales/diferencias-desktop-1920x1080.png",
  "docs/referencias-visuales/diferencias-mobile-390x844.png",
];
export const FEATURE_STYLE_PATHS = [
  "src/styles/features/admin.css",
  "src/styles/features/cash.css",
  "src/styles/features/dashboards.css",
  "src/styles/features/salaries.css",
];

const normalized = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-UY");

async function readRequired(rootDir, relativePath, errors) {
  try {
    return await readFile(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    errors.push(`No se pudo leer ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

export async function validateDesignSystem({ rootDir }) {
  const errors = [];
  const checks = [];
  const pass = (condition, success, failure) => {
    if (condition) checks.push(success);
    else errors.push(failure);
  };

  const system = await readRequired(rootDir, VISUAL_SYSTEM_PATH, errors);
  const systemText = normalized(system);
  [
    "Identidad",
    "Estructura de pantalla",
    "Superficies",
    "Botones e iconos",
    "Tablas",
    "Formularios y mensajes",
    "Modales y detalle",
    "Patrones por rol",
    "Patrones aprobados",
    "Flujo del custodio de diseno",
    "Validacion",
  ].forEach((heading) => {
    pass(systemText.includes(normalized(`## ${heading}`)), `sistema visual incluye ${heading}`, `${VISUAL_SYSTEM_PATH} no incluye ${heading}.`);
  });

  const rules = await readRequired(rootDir, "docs/REGLAS_VISUALES.md", errors);
  pass(rules.includes(`\`${VISUAL_SYSTEM_PATH}\``), "reglas referencia sistema visual", `docs/REGLAS_VISUALES.md debe referenciar ${VISUAL_SYSTEM_PATH}.`);

  const reviews = await readRequired(rootDir, VISUAL_REVIEWS_PATH, errors);
  ["2026-07-11-DIF-UI-01", "2026-07-11-SAL-UI-01", "2026-07-11-ENC-UI-01"].forEach((id) => {
    pass(reviews.includes(id), `revisiones incluye ${id}`, `${VISUAL_REVIEWS_PATH} no referencia ${id}.`);
  });

  const profilePath = ".codex/agents/poseidon_ui_reviewer.toml";
  const profile = await readRequired(rootDir, profilePath, errors);
  pass(profile.includes(VISUAL_SYSTEM_PATH), "perfil UI referencia sistema visual", `${profilePath} no referencia ${VISUAL_SYSTEM_PATH}.`);
  pass(profile.includes("docs/referencias-visuales/README.md"), "perfil UI referencia ejemplos", `${profilePath} no referencia ejemplos aprobados.`);
  pass(profile.includes("PROPUESTA") && profile.includes("VERIFICACION"), "perfil UI declara dos modos", `${profilePath} debe declarar PROPUESTA y VERIFICACION.`);
  pass(!profile.includes("Sistema Gestion GENERAL 2026"), "perfil UI sin dependencia externa", `${profilePath} no debe depender del otro proyecto.`);

  const protocol = await readRequired(rootDir, "docs/PROTOCOLO_AGENTES_CODEX.md", errors);
  pass(normalized(protocol).includes("custodio de diseno"), "protocolo declara custodio", "docs/PROTOCOLO_AGENTES_CODEX.md debe declarar el custodio de diseno.");
  pass(protocol.includes(VISUAL_REVIEWS_PATH), "protocolo referencia revisiones visuales", `docs/PROTOCOLO_AGENTES_CODEX.md debe referenciar ${VISUAL_REVIEWS_PATH}.`);

  const index = await readRequired(rootDir, "docs/INDICE_DOCUMENTACION.md", errors);
  pass(index.includes(VISUAL_SYSTEM_PATH), "indice referencia sistema visual", `docs/INDICE_DOCUMENTACION.md debe referenciar ${VISUAL_SYSTEM_PATH}.`);
  pass(index.includes(VISUAL_REVIEWS_PATH), "indice referencia revisiones visuales", `docs/INDICE_DOCUMENTACION.md debe referenciar ${VISUAL_REVIEWS_PATH}.`);

  const agents = await readRequired(rootDir, "AGENTS.md", errors);
  pass(agents.includes(VISUAL_SYSTEM_PATH), "AGENTS referencia sistema visual", `AGENTS.md debe referenciar ${VISUAL_SYSTEM_PATH}.`);
  pass(agents.includes("pnpm run check:design"), "AGENTS exige check:design", "AGENTS.md debe exigir pnpm run check:design para infraestructura visual.");

  const referencesReadme = await readRequired(rootDir, "docs/referencias-visuales/README.md", errors);
  VISUAL_REFERENCES.forEach((reference) => {
    const fileName = path.basename(reference);
    pass(referencesReadme.includes(fileName), `referencias documenta ${fileName}`, `docs/referencias-visuales/README.md no documenta ${fileName}.`);
  });

  for (const reference of VISUAL_REFERENCES) {
    try {
      const details = await stat(path.join(rootDir, reference));
      pass(details.isFile() && details.size > 1_000, `captura valida ${path.basename(reference)}`, `${reference} debe ser una captura no vacia.`);
    } catch (error) {
      errors.push(`No se pudo validar ${reference}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const globalCss = await readRequired(rootDir, "src/styles/global.css", errors);
  const globalLines = globalCss.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  pass(globalLines.every((line) => line.startsWith("@import ")), "global.css conserva solo imports", "src/styles/global.css debe conservarse como manifiesto de imports.");

  for (const stylePath of FEATURE_STYLE_PATHS) {
    const styleSource = await readRequired(rootDir, stylePath, errors);
    const excessiveWeights = [...styleSource.matchAll(/font-weight:\s*(\d+)/g)]
      .map((match) => Number(match[1]))
      .filter((weight) => weight > 600);
    pass(
      excessiveWeights.length === 0,
      `${stylePath} conserva pesos operativos hasta 600`,
      `${stylePath} contiene pesos tipograficos mayores a 600: ${[...new Set(excessiveWeights)].join(", ")}.`,
    );
  }

  const packageSource = await readRequired(rootDir, "package.json", errors);
  if (packageSource) {
    try {
      const packageJson = JSON.parse(packageSource);
      pass(packageJson.scripts?.["check:design"] === "node scripts/validate-design-system.mjs", "script check:design registrado", "package.json debe registrar check:design.");
      pass(packageJson.scripts?.["capture:visual"] === "node scripts/capture-visual-references.mjs", "script capture:visual registrado", "package.json debe registrar capture:visual.");
      pass(String(packageJson.scripts?.check ?? "").includes("pnpm run check:design"), "check incluye diseno", "pnpm run check debe ejecutar check:design.");
    } catch (error) {
      errors.push(`package.json no es JSON valido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { ok: errors.length === 0, checks, errors };
}
