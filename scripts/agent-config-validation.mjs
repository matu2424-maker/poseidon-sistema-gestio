import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const EXPECTED_AGENT_PROFILES = [
  "poseidon_scope_mapper",
  "poseidon_accounting_reviewer",
  "poseidon_ui_reviewer",
];

const REQUIRED_INSTRUCTION_FRAGMENTS = [
  "solo lectura",
  "no modifiques archivos",
  "no instales dependencias",
  "no inicies servidores",
  "no hagas commits",
  "no ejecutes comandos que alteren datos o el repositorio",
];

const normalized = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-UY");

const scalarMatch = (source, key) =>
  source.match(new RegExp(`^\\s*${key}\\s*=\\s*([^\\r\\n]+?)\\s*$`, "m"))?.[1]?.trim();

const stringField = (source, key) => {
  const raw = scalarMatch(source, key);
  const match = raw?.match(/^"([^"\r\n]*)"$/);
  if (!match) throw new Error(`El campo ${key} debe ser un string TOML simple.`);
  return match[1];
};

const integerField = (source, key) => {
  const raw = scalarMatch(source, key);
  if (!raw || !/^-?\d+$/.test(raw)) throw new Error(`El campo ${key} debe ser un entero TOML.`);
  return Number(raw);
};

const booleanField = (source, key) => {
  const raw = scalarMatch(source, key);
  if (raw !== "true" && raw !== "false") throw new Error(`El campo ${key} debe ser booleano TOML.`);
  return raw === "true";
};

export function parseAgentConfigSource(source) {
  if (!/^\s*\[agents\]\s*$/m.test(source)) throw new Error("Falta la seccion [agents].");
  return {
    maxThreads: integerField(source, "max_threads"),
    maxDepth: integerField(source, "max_depth"),
    interruptMessage: booleanField(source, "interrupt_message"),
  };
}

export function parseAgentProfileSource(source) {
  const instructions = source.match(/^\s*developer_instructions\s*=\s*"""([\s\S]*?)"""\s*$/m)?.[1]?.trim();
  if (!instructions) throw new Error("Falta developer_instructions como string TOML multilinea.");
  return {
    name: stringField(source, "name"),
    description: stringField(source, "description"),
    sandboxMode: stringField(source, "sandbox_mode"),
    developerInstructions: instructions,
    declaresModel: /^\s*model\s*=/m.test(source),
  };
}

export function validateProfileContract(profile, expectedName) {
  const errors = [];
  if (profile.name !== expectedName) errors.push(`El nombre ${profile.name || "vacio"} no coincide con ${expectedName}.`);
  if (profile.description.trim().length < 20) errors.push(`${expectedName}: description es demasiado corta.`);
  if (profile.sandboxMode !== "read-only") errors.push(`${expectedName}: sandbox_mode debe ser read-only.`);
  if (profile.declaresModel) errors.push(`${expectedName}: no debe fijar model; debe heredarlo de la tarea.`);
  const instructions = normalized(profile.developerInstructions);
  REQUIRED_INSTRUCTION_FRAGMENTS.forEach((fragment) => {
    if (!instructions.includes(normalized(fragment))) errors.push(`${expectedName}: falta la restriccion "${fragment}".`);
  });
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

export async function validateAgentInfrastructure({ rootDir }) {
  const errors = [];
  const checks = [];
  const pass = (condition, success, failure) => {
    if (condition) checks.push(success);
    else errors.push(failure);
  };

  const configSource = await readRequired(rootDir, ".codex/config.toml", errors);
  if (configSource) {
    try {
      const config = parseAgentConfigSource(configSource);
      pass(config.maxThreads === 3, "max_threads=3", "max_threads debe ser 3: principal mas dos subagentes.");
      pass(config.maxThreads - 1 === 2, "concurrencia operativa=2", "La configuracion debe permitir exactamente dos subagentes ademas del principal.");
      pass(config.maxDepth === 1, "max_depth=1", "max_depth debe ser 1.");
      pass(config.interruptMessage, "interrupt_message=true", "interrupt_message debe ser true.");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  let profileFiles = [];
  try {
    profileFiles = (await readdir(path.join(rootDir, ".codex/agents")))
      .filter((file) => file.endsWith(".toml"))
      .sort();
  } catch (error) {
    errors.push(`No se pudo leer .codex/agents: ${error instanceof Error ? error.message : String(error)}`);
  }
  const expectedFiles = EXPECTED_AGENT_PROFILES.map((name) => `${name}.toml`).sort();
  pass(
    JSON.stringify(profileFiles) === JSON.stringify(expectedFiles),
    "perfiles esperados=3",
    `Los perfiles deben ser exactamente: ${expectedFiles.join(", ")}. Encontrados: ${profileFiles.join(", ") || "ninguno"}.`,
  );

  for (const profileName of EXPECTED_AGENT_PROFILES) {
    const relativePath = `.codex/agents/${profileName}.toml`;
    const source = await readRequired(rootDir, relativePath, errors);
    if (!source) continue;
    try {
      const profile = parseAgentProfileSource(source);
      const profileErrors = validateProfileContract(profile, profileName);
      if (profileErrors.length) errors.push(...profileErrors);
      else checks.push(`${profileName}=read-only`);
    } catch (error) {
      errors.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const protocolPath = "docs/PROTOCOLO_AGENTES_CODEX.md";
  const templatePath = "docs/plantillas/REPORTE_DELEGACION_AGENTES.md";
  const registryPath = "docs/REGISTRO_DELEGACIONES_AGENTES.md";
  const protocol = await readRequired(rootDir, protocolPath, errors);
  const protocolText = normalized(protocol);
  EXPECTED_AGENT_PROFILES.forEach((profileName) => {
    pass(protocol.includes(`\`${profileName}\``), `protocolo referencia ${profileName}`, `${protocolPath} no referencia ${profileName}.`);
  });
  pass(protocol.includes("`.codex/config.toml`"), "protocolo referencia config", `${protocolPath} no referencia .codex/config.toml.`);
  pass(protocol.includes("`.codex/agents/`"), "protocolo referencia perfiles", `${protocolPath} no referencia .codex/agents/.`);
  pass(protocol.includes(`\`${templatePath}\``), "protocolo referencia plantilla", `${protocolPath} no referencia ${templatePath}.`);
  pass(protocol.includes(`\`${registryPath}\``), "protocolo referencia registro", `${protocolPath} no referencia ${registryPath}.`);
  pass(protocolText.includes("maximo operativo de dos subagentes"), "protocolo limita concurrencia", `${protocolPath} debe declarar un maximo operativo de dos subagentes.`);
  pass(protocolText.includes("tres delegaciones utiles documentadas"), "regla de tres usos documentada", `${protocolPath} debe exigir tres delegaciones utiles documentadas antes de un perfil nuevo.`);
  pass(protocolText.includes("agente principal es el unico responsable"), "responsabilidad principal documentada", `${protocolPath} debe declarar que el agente principal es el unico responsable de integrar y cerrar.`);

  const template = await readRequired(rootDir, templatePath, errors);
  ["Resultado", "Duracion", "Consumo", "Hallazgos adoptados", "Duplicacion", "Cierre"].forEach((field) => {
    pass(normalized(template).includes(normalized(field)), `plantilla incluye ${field}`, `${templatePath} no incluye el campo ${field}.`);
  });
  await readRequired(rootDir, registryPath, errors);

  const agentsInstructions = await readRequired(rootDir, "AGENTS.md", errors);
  pass(agentsInstructions.includes("pnpm run check:agents"), "AGENTS exige check:agents", "AGENTS.md debe exigir pnpm run check:agents para infraestructura Codex.");
  pass(agentsInstructions.includes(protocolPath), "AGENTS referencia protocolo", `AGENTS.md debe referenciar ${protocolPath}.`);

  const packageSource = await readRequired(rootDir, "package.json", errors);
  if (packageSource) {
    try {
      const packageJson = JSON.parse(packageSource);
      pass(packageJson.scripts?.["check:agents"] === "node scripts/validate-agent-config.mjs", "script check:agents registrado", "package.json debe registrar check:agents.");
      pass(String(packageJson.scripts?.check ?? "").includes("pnpm run check:agents"), "check incluye agentes", "pnpm run check debe ejecutar check:agents.");
    } catch (error) {
      errors.push(`package.json no es JSON valido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    ok: errors.length === 0,
    checks,
    errors,
    profiles: EXPECTED_AGENT_PROFILES,
  };
}
