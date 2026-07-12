import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const EXPECTED_POSEIDON_SKILLS = [
  "poseidon-accounting-regression",
  "poseidon-localhost-diagnostics",
  "poseidon-module-change",
  "poseidon-visual-qa",
];

const REQUIRED_REFERENCES = {
  "poseidon-accounting-regression": ["docs/REGLAS_CONTABLES.md", "pnpm run check"],
  "poseidon-localhost-diagnostics": ["docs/VALIDACION_LOCAL.md", "iniciar-poseidon.bat", "pnpm run smoke:localhost"],
  "poseidon-module-change": ["docs/INDICE_DOCUMENTACION.md", "docs/PROTOCOLO_AGENTES_CODEX.md", "pnpm run check:commit"],
  "poseidon-visual-qa": ["docs/REGLAS_VISUALES.md", "docs/SISTEMA_VISUAL_POSEIDON.md", "pnpm run check:design"],
};

const quotedYamlField = (source, key) =>
  source.match(new RegExp(`^\\s*${key}:\\s*"([^"\\r\\n]+)"\\s*$`, "m"))?.[1]?.trim() ?? "";

export function parseSkillSource(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Falta frontmatter YAML delimitado por ---.");
  const name = match[1].match(/^name:\s*([^\r\n]+)$/m)?.[1]?.trim() ?? "";
  const description = match[1].match(/^description:\s*([^\r\n]+)$/m)?.[1]?.trim() ?? "";
  return { name, description, body: match[2].trim(), lines: source.split(/\r?\n/).length };
}

export function parseSkillInterfaceSource(source) {
  return {
    displayName: quotedYamlField(source, "display_name"),
    shortDescription: quotedYamlField(source, "short_description"),
    defaultPrompt: quotedYamlField(source, "default_prompt"),
  };
}

export function validateSkillContract({ skill, ui, expectedName }) {
  const errors = [];
  if (skill.name !== expectedName) errors.push(`${expectedName}: name no coincide.`);
  if (skill.description.length < 80) errors.push(`${expectedName}: description debe explicar alcance y disparadores.`);
  if (!skill.body.startsWith("# ")) errors.push(`${expectedName}: falta titulo principal.`);
  if (skill.lines > 500) errors.push(`${expectedName}: SKILL.md supera 500 lineas.`);
  if (/\[TODO|TODO:/i.test(`${skill.description}\n${skill.body}`)) errors.push(`${expectedName}: contiene marcadores TODO.`);
  for (const reference of REQUIRED_REFERENCES[expectedName] ?? []) {
    if (!skill.body.includes(reference)) errors.push(`${expectedName}: falta la referencia ${reference}.`);
  }
  if (!ui.displayName) errors.push(`${expectedName}: falta interface.display_name.`);
  if (ui.shortDescription.length < 25 || ui.shortDescription.length > 64) {
    errors.push(`${expectedName}: short_description debe tener entre 25 y 64 caracteres.`);
  }
  if (!ui.defaultPrompt.includes(`$${expectedName}`)) errors.push(`${expectedName}: default_prompt debe mencionar $${expectedName}.`);
  return errors;
}

async function readRequired(rootDir, relativePath, errors) {
  try {
    return await readFile(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    errors.push(`No se pudo leer ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

export async function validateSkillInfrastructure({ rootDir }) {
  const errors = [];
  const checks = [];
  const skillsRoot = path.join(rootDir, ".agents/skills");
  let skillFolders = [];
  try {
    skillFolders = (await readdir(skillsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    errors.push(`No se pudo leer .agents/skills: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (JSON.stringify(skillFolders) !== JSON.stringify(EXPECTED_POSEIDON_SKILLS)) {
    errors.push(`Las skills deben ser exactamente: ${EXPECTED_POSEIDON_SKILLS.join(", ")}.`);
  } else {
    checks.push("skills esperadas=4");
  }

  for (const expectedName of EXPECTED_POSEIDON_SKILLS) {
    const skillSource = await readRequired(rootDir, `.agents/skills/${expectedName}/SKILL.md`, errors);
    const uiSource = await readRequired(rootDir, `.agents/skills/${expectedName}/agents/openai.yaml`, errors);
    if (!skillSource || !uiSource) continue;
    try {
      const contractErrors = validateSkillContract({
        skill: parseSkillSource(skillSource),
        ui: parseSkillInterfaceSource(uiSource),
        expectedName,
      });
      if (contractErrors.length) errors.push(...contractErrors);
      else checks.push(`${expectedName}=valida`);
    } catch (error) {
      errors.push(`${expectedName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const agentsInstructions = await readRequired(rootDir, "AGENTS.md", errors);
  if (!agentsInstructions.includes("pnpm run check:skills")) errors.push("AGENTS.md debe exigir pnpm run check:skills.");
  if (!agentsInstructions.includes("docs/SKILLS_POSEIDON.md")) errors.push("AGENTS.md debe referenciar docs/SKILLS_POSEIDON.md.");

  const packageSource = await readRequired(rootDir, "package.json", errors);
  if (packageSource) {
    try {
      const packageJson = JSON.parse(packageSource);
      if (packageJson.scripts?.["check:skills"] !== "node scripts/validate-skills.mjs") errors.push("package.json debe registrar check:skills.");
      if (!String(packageJson.scripts?.check ?? "").includes("pnpm run check:skills")) errors.push("pnpm run check debe incluir check:skills.");
    } catch (error) {
      errors.push(`package.json no es JSON valido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { ok: errors.length === 0, checks, errors, skills: EXPECTED_POSEIDON_SKILLS };
}
