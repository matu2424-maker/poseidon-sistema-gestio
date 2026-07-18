import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const EXPECTED_ROLE_CHAT_IDS = ["poseidon-cajero", "poseidon-encargado", "poseidon-administrador"];
export const EXPECTED_SUPPORT_CHAT_IDS = ["poseidon-calidad"];

const REQUIRED_CHECKS = ["pnpm run check", "pnpm run build", "pnpm run check:commit"];
const WORKSTREAM_SCRIPT = "node scripts/validate-workstreams.mjs && node scripts/validate-governance.mjs";

const normalizedPath = (value) => String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");

const pathsOverlap = (left, right) => {
  const a = normalizedPath(left);
  const b = normalizedPath(right);
  const aPrefix = a.endsWith("/") ? a : `${a}/`;
  const bPrefix = b.endsWith("/") ? b : `${b}/`;
  return a === b || aPrefix.startsWith(bPrefix) || bPrefix.startsWith(aPrefix);
};

const duplicateValues = (values) =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

export function validateWorkstreamConfig(config) {
  const errors = [];
  if (config?.schemaVersion !== 1) errors.push("schemaVersion debe ser 1.");
  if (config?.integrationBranch !== "main") errors.push("integrationBranch debe ser main.");
  if (config?.central?.id !== "poseidon-central") errors.push("El chat central debe usar id poseidon-central.");
  if (!config?.central?.prompt) errors.push("El chat central debe declarar prompt.");
  if (!Array.isArray(config?.central?.reservedPaths) || config.central.reservedPaths.length === 0) {
    errors.push("El chat central debe reservar contratos compartidos.");
  }

  const roleChats = Array.isArray(config?.roleChats) ? config.roleChats : [];
  const roleIds = roleChats.map((role) => role.id);
  if (JSON.stringify(roleIds) !== JSON.stringify(EXPECTED_ROLE_CHAT_IDS)) {
    errors.push(`Los chats de rol deben ser exactamente y en orden: ${EXPECTED_ROLE_CHAT_IDS.join(", ")}.`);
  }

  const supportChats = Array.isArray(config?.supportChats) ? config.supportChats : [];
  const supportIds = supportChats.map((chat) => chat.id);
  if (JSON.stringify(supportIds) !== JSON.stringify(EXPECTED_SUPPORT_CHAT_IDS)) {
    errors.push(`Los chats de apoyo deben ser exactamente y en orden: ${EXPECTED_SUPPORT_CHAT_IDS.join(", ")}.`);
  }

  const ownedChats = [...roleChats, ...supportChats];

  for (const duplicate of duplicateValues(ownedChats.map((chat) => chat.id))) errors.push(`ID de chat duplicado: ${duplicate}.`);
  for (const duplicate of duplicateValues(ownedChats.map((chat) => chat.title))) {
    errors.push(`Titulo de chat duplicado: ${duplicate}.`);
  }

  ownedChats.forEach((chat) => {
    if (!chat.title) errors.push(`${chat.id || "chat sin id"}: falta title.`);
    if (!chat.prompt) errors.push(`${chat.id || "chat sin id"}: falta prompt.`);
    if (!chat.context) errors.push(`${chat.id || "chat sin id"}: falta context.`);
    if (!Array.isArray(chat.writeScopes) || chat.writeScopes.length === 0) {
      errors.push(`${chat.id || "chat sin id"}: debe declarar writeScopes.`);
    }
    for (const check of REQUIRED_CHECKS) {
      if (!chat.requiredChecks?.includes(check)) errors.push(`${chat.id || "chat sin id"}: falta ${check}.`);
    }
    for (const duplicate of duplicateValues(chat.writeScopes ?? [])) {
      errors.push(`${chat.id || "chat sin id"}: writeScope duplicado ${duplicate}.`);
    }
  });

  supportChats.forEach((chat) => {
    if (!chat.reportTemplate) errors.push(`${chat.id || "chat de apoyo sin id"}: falta reportTemplate.`);
  });

  for (let leftIndex = 0; leftIndex < ownedChats.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ownedChats.length; rightIndex += 1) {
      const left = ownedChats[leftIndex];
      const right = ownedChats[rightIndex];
      for (const leftScope of left.writeScopes ?? []) {
        for (const rightScope of right.writeScopes ?? []) {
          if (pathsOverlap(leftScope, rightScope)) {
            errors.push(`${left.id} y ${right.id} superponen propiedad: ${leftScope} / ${rightScope}.`);
          }
        }
      }
    }
  }

  for (const chat of ownedChats) {
    for (const scope of chat.writeScopes ?? []) {
      for (const reserved of config?.central?.reservedPaths ?? []) {
        if (pathsOverlap(scope, reserved)) {
          errors.push(`${chat.id} invade contrato reservado: ${scope} / ${reserved}.`);
        }
      }
    }
  }

  if (!Array.isArray(config?.specialists) || config.specialists.length === 0) {
    errors.push("Debe existir al menos una especialidad temporal.");
  }
  for (const duplicate of duplicateValues((config?.specialists ?? []).map((specialist) => specialist.id))) {
    errors.push(`Especialidad duplicada: ${duplicate}.`);
  }
  for (const key of [
    "workOrderTemplate",
    "handoffTemplate",
    "integrationQueue",
    "projectStatus",
    "decisionRegistry",
    "migrationRegistry",
    "capabilityRegistry",
  ]) {
    if (!config?.[key]) errors.push(`Falta ${key}.`);
  }
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

async function requirePath(rootDir, relativePath, errors, checks) {
  try {
    await stat(path.join(rootDir, relativePath));
    checks.push(`existe ${relativePath}`);
  } catch (error) {
    errors.push(`No existe ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function validateWorkstreamInfrastructure({ rootDir }) {
  const errors = [];
  const checks = [];
  const configPath = "docs/coordinacion/WORKSTREAMS.json";
  const source = await readRequired(rootDir, configPath, errors);
  let config;
  if (source) {
    try {
      config = JSON.parse(source);
      errors.push(...validateWorkstreamConfig(config));
      if (errors.length === 0) checks.push("configuracion estructural valida");
    } catch (error) {
      errors.push(`${configPath} no es JSON valido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (config) {
    const references = [
      config.central.prompt,
      ...config.central.reservedPaths,
      ...config.roleChats.flatMap((role) => [role.prompt, role.context, ...role.writeScopes]),
      ...config.supportChats.flatMap((chat) => [chat.prompt, chat.context, chat.reportTemplate, ...chat.writeScopes]),
      ...config.specialists.map((specialist) => specialist.context),
      config.workOrderTemplate,
      config.handoffTemplate,
      config.integrationQueue,
      config.projectStatus,
      config.decisionRegistry,
      config.migrationRegistry,
      config.capabilityRegistry,
    ];
    for (const reference of [...new Set(references)]) await requirePath(rootDir, reference, errors, checks);
  }

  const coordination = await readRequired(rootDir, "docs/coordinacion/README.md", errors);
  for (const title of ["Poseidon Central", "Poseidon Cajero", "Poseidon Encargado", "Poseidon Administrador", "Poseidon Calidad y Pruebas"]) {
    if (!coordination.includes(title)) errors.push(`docs/coordinacion/README.md no referencia ${title}.`);
    else checks.push(`coordinacion referencia ${title}`);
  }

  const agents = await readRequired(rootDir, "AGENTS.md", errors);
  if (!agents.includes("pnpm run check:workstreams")) errors.push("AGENTS.md debe exigir pnpm run check:workstreams.");
  else checks.push("AGENTS exige check:workstreams");

  const packageSource = await readRequired(rootDir, "package.json", errors);
  if (packageSource) {
    try {
      const packageJson = JSON.parse(packageSource);
      if (packageJson.scripts?.["check:workstreams"] !== WORKSTREAM_SCRIPT) {
        errors.push("package.json debe registrar check:workstreams.");
      } else checks.push("script check:workstreams registrado");
      if (packageJson.scripts?.["check:governance"] !== "node scripts/validate-governance.mjs") {
        errors.push("package.json debe registrar check:governance.");
      } else checks.push("script check:governance registrado");
      if (!String(packageJson.scripts?.check ?? "").includes("pnpm run check:workstreams")) {
        errors.push("pnpm run check debe ejecutar check:workstreams.");
      } else checks.push("check incluye workstreams");
    } catch (error) {
      errors.push(`package.json no es JSON valido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checks,
    roleChats: config?.roleChats?.map((role) => role.id) ?? [],
    supportChats: config?.supportChats?.map((chat) => chat.id) ?? [],
  };
}
