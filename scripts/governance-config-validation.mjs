import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const PROJECT_STATUSES = ["ACTIVE", "PAUSED", "BLOCKED", "CLOSED"];
const PROJECT_MODES = ["LOCAL_ONLY", "HYBRID", "ONLINE"];
const HEALTH_STATES = ["GREEN", "YELLOW", "RED"];
const ORDER_STATES = ["PROPUESTA", "ASIGNADA", "EN_CURSO", "LISTA", "INTEGRADA", "BLOQUEADA", "DESCARTADA"];
const DECISION_STATES = ["PROPOSED", "APPROVED", "SUPERSEDED", "REJECTED"];
const MIGRATION_STATES = ["PROPOSED", "READY", "APPLIED", "ROLLED_BACK"];
const MIGRATION_TYPES = ["SCHEMA", "DATA_REPAIR", "SCHEMA_AND_DATA", "RECALCULATION"];
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const CAPABILITY_TYPES = ["AGENT_PROFILE", "SKILL", "VALIDATOR", "TOOL", "PLUGIN", "MCP", "AUTOMATION"];
const CAPABILITY_STATES = ["PROPOSED", "VALIDATING", "ACTIVE", "SUSPENDED", "DEPRECATED"];
const CAPABILITY_RISKS = ["C0", "C1", "C2", "C3", "C4", "C5"];

const duplicateValues = (values) =>
  [...new Set(values.filter((value, index) => value && values.indexOf(value) !== index))];

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
const validCommit = (value) => /^[a-f0-9]{40}$/.test(String(value ?? ""));

function requireEnum(errors, value, allowed, label) {
  if (!allowed.includes(value)) errors.push(`${label} debe ser uno de: ${allowed.join(", ")}.`);
}

function requireStringArray(errors, value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${label} debe ser una lista de textos no vacios.`);
    return [];
  }
  return value;
}

export function validateProjectStatus(config) {
  const errors = [];
  if (config?.schemaVersion !== 1) errors.push("PROJECT_STATUS.schemaVersion debe ser 1.");
  if (config?.project?.id !== "poseidon") errors.push("PROJECT_STATUS.project.id debe ser poseidon.");
  requireEnum(errors, config?.project?.status, PROJECT_STATUSES, "PROJECT_STATUS.project.status");
  requireEnum(errors, config?.project?.mode, PROJECT_MODES, "PROJECT_STATUS.project.mode");
  if (config?.project?.defaultBranch !== "main") errors.push("PROJECT_STATUS.project.defaultBranch debe ser main.");
  if (!validDate(config?.project?.updatedAt)) errors.push("PROJECT_STATUS.project.updatedAt debe usar YYYY-MM-DD.");
  if (!config?.current?.phase || !config?.current?.objective) errors.push("PROJECT_STATUS.current debe declarar phase y objective.");

  const orderLists = ["activeWorkOrders", "queuedWorkOrders", "blockedWorkOrders", "pendingIntegrations"];
  const allOrders = orderLists.flatMap((key) => requireStringArray(errors, config?.current?.[key], `PROJECT_STATUS.current.${key}`));
  for (const duplicate of duplicateValues(allOrders)) errors.push(`PROJECT_STATUS repite la orden ${duplicate}.`);

  if (!config?.lastCompletedBlock?.id || !config?.lastCompletedBlock?.title) {
    errors.push("PROJECT_STATUS.lastCompletedBlock debe identificar el ultimo bloque.");
  }
  requireEnum(errors, config?.lastCompletedBlock?.state, ORDER_STATES, "PROJECT_STATUS.lastCompletedBlock.state");
  requireEnum(errors, config?.health?.overall, HEALTH_STATES, "PROJECT_STATUS.health.overall");
  if (!config?.health?.mainRisk) errors.push("PROJECT_STATUS.health.mainRisk es obligatorio.");

  const risks = Array.isArray(config?.health?.risks) ? config.health.risks : [];
  for (const duplicate of duplicateValues(risks.map((risk) => risk.id))) errors.push(`Riesgo duplicado: ${duplicate}.`);
  risks.forEach((risk, index) => {
    if (!/^RISK-\d{3}$/.test(String(risk.id ?? ""))) errors.push(`Riesgo ${index + 1}: id invalido.`);
    requireEnum(errors, risk.severity, RISK_LEVELS, `Riesgo ${risk.id || index + 1}.severity`);
    if (!risk.summary) errors.push(`Riesgo ${risk.id || index + 1}: falta summary.`);
  });

  requireStringArray(errors, config?.nextActions, "PROJECT_STATUS.nextActions");
  for (const key of ["workstreams", "integrationQueue", "decisions", "migrations", "capabilities"]) {
    if (!config?.registries?.[key]) errors.push(`PROJECT_STATUS.registries.${key} es obligatorio.`);
  }
  return errors;
}

export function validateDecisionRegistry(config) {
  const errors = [];
  if (config?.schemaVersion !== 1) errors.push("DECISIONS.schemaVersion debe ser 1.");
  const decisions = Array.isArray(config?.decisions) ? config.decisions : [];
  if (!decisions.length) errors.push("DECISIONS debe contener al menos una decision.");
  for (const duplicate of duplicateValues(decisions.map((decision) => decision.id))) errors.push(`Decision duplicada: ${duplicate}.`);
  decisions.forEach((decision, index) => {
    if (!/^DEC-\d{4}-\d{3}$/.test(String(decision.id ?? ""))) errors.push(`Decision ${index + 1}: id invalido.`);
    if (!decision.title || !decision.scope) errors.push(`Decision ${decision.id || index + 1}: faltan title o scope.`);
    requireEnum(errors, decision.status, DECISION_STATES, `Decision ${decision.id || index + 1}.status`);
    if (!validDate(decision.date)) errors.push(`Decision ${decision.id || index + 1}: date debe usar YYYY-MM-DD.`);
    if (!String(decision.document ?? "").startsWith("docs/coordinacion/decisiones/")) {
      errors.push(`Decision ${decision.id || index + 1}: document debe vivir en docs/coordinacion/decisiones/.`);
    }
  });
  return errors;
}

export function validateMigrationRegistry(config) {
  const errors = [];
  if (config?.schemaVersion !== 1) errors.push("MIGRATIONS.schemaVersion debe ser 1.");
  const migrations = Array.isArray(config?.migrations) ? config.migrations : [];
  for (const duplicate of duplicateValues(migrations.map((migration) => migration.id))) errors.push(`Migracion duplicada: ${duplicate}.`);
  for (const duplicate of duplicateValues(migrations.map((migration) => migration.runtimeId))) errors.push(`runtimeId de migracion duplicado: ${duplicate}.`);
  migrations.forEach((migration, index) => {
    const label = migration.id || `Migracion ${index + 1}`;
    if (!/^MIG-\d{4}-\d{2}-\d{2}-\d{3}$/.test(String(migration.id ?? ""))) errors.push(`${label}: id invalido.`);
    if (!migration.runtimeId || !migration.summary) errors.push(`${label}: faltan runtimeId o summary.`);
    requireEnum(errors, migration.status, MIGRATION_STATES, `${label}.status`);
    requireEnum(errors, migration.type, MIGRATION_TYPES, `${label}.type`);
    requireEnum(errors, migration.risk, RISK_LEVELS, `${label}.risk`);
    if (!Number.isInteger(migration.sourceSchema) || !Number.isInteger(migration.targetSchema) || migration.sourceSchema >= migration.targetSchema) {
      errors.push(`${label}: sourceSchema debe ser menor que targetSchema.`);
    }
    if (!migration.implementation) errors.push(`${label}: falta implementation.`);
    requireStringArray(errors, migration.tests, `${label}.tests`);
    if (migration.legacyRecord !== true && !validCommit(migration.introducedByCommit)) {
      errors.push(`${label}: introducedByCommit debe ser un SHA completo o el registro debe ser legacyRecord.`);
    }
    for (const key of ["financialData", "appendOnly", "reversible", "legacyRecord"]) {
      if (typeof migration[key] !== "boolean") errors.push(`${label}.${key} debe ser booleano.`);
    }
  });
  return errors;
}

export function validateCapabilityRegistry(config) {
  const errors = [];
  if (config?.schemaVersion !== 1) errors.push("CAPABILITIES.schemaVersion debe ser 1.");
  const capabilities = Array.isArray(config?.capabilities) ? config.capabilities : [];
  if (!capabilities.length) errors.push("CAPABILITIES debe contener al menos una capacidad.");
  for (const duplicate of duplicateValues(capabilities.map((capability) => capability.id))) errors.push(`Capacidad duplicada: ${duplicate}.`);
  capabilities.forEach((capability, index) => {
    const label = capability.id || `Capacidad ${index + 1}`;
    if (!/^CAP-[A-Z0-9-]+$/.test(String(capability.id ?? ""))) errors.push(`${label}: id invalido.`);
    if (!capability.name || !capability.owner) errors.push(`${label}: faltan name u owner.`);
    requireEnum(errors, capability.type, CAPABILITY_TYPES, `${label}.type`);
    requireEnum(errors, capability.status, CAPABILITY_STATES, `${label}.status`);
    requireEnum(errors, capability.riskLevel, CAPABILITY_RISKS, `${label}.riskLevel`);
    requireStringArray(errors, capability.paths, `${label}.paths`);
    if (!/^pnpm run [a-z0-9:-]+$/.test(String(capability.validationCommand ?? ""))) {
      errors.push(`${label}: validationCommand debe ser un script pnpm run simple.`);
    }
    if (typeof capability.externalAccess !== "boolean") errors.push(`${label}.externalAccess debe ser booleano.`);
  });
  return errors;
}

async function readJson(rootDir, relativePath, errors) {
  try {
    return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
  } catch (error) {
    errors.push(`No se pudo leer ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
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

export async function validateGovernanceInfrastructure({ rootDir }) {
  const errors = [];
  const checks = [];
  const paths = {
    status: "docs/coordinacion/PROJECT_STATUS.json",
    decisions: "docs/coordinacion/DECISIONS.json",
    migrations: "docs/coordinacion/MIGRATIONS.json",
    capabilities: "docs/coordinacion/CAPABILITIES.json",
  };
  const [status, decisions, migrations, capabilities, workstreams, packageJson] = await Promise.all([
    readJson(rootDir, paths.status, errors),
    readJson(rootDir, paths.decisions, errors),
    readJson(rootDir, paths.migrations, errors),
    readJson(rootDir, paths.capabilities, errors),
    readJson(rootDir, "docs/coordinacion/WORKSTREAMS.json", errors),
    readJson(rootDir, "package.json", errors),
  ]);

  if (status) errors.push(...validateProjectStatus(status));
  if (decisions) errors.push(...validateDecisionRegistry(decisions));
  if (migrations) errors.push(...validateMigrationRegistry(migrations));
  if (capabilities) errors.push(...validateCapabilityRegistry(capabilities));
  if (errors.length === 0) checks.push("registros estructurales validos");

  const expectedWorkstreamReferences = {
    projectStatus: paths.status,
    decisionRegistry: paths.decisions,
    migrationRegistry: paths.migrations,
    capabilityRegistry: paths.capabilities,
  };
  for (const [key, expected] of Object.entries(expectedWorkstreamReferences)) {
    if (workstreams?.[key] !== expected) errors.push(`WORKSTREAMS.${key} debe referenciar ${expected}.`);
    else checks.push(`workstreams referencia ${key}`);
  }

  const expectedStatusRegistries = {
    workstreams: "docs/coordinacion/WORKSTREAMS.json",
    integrationQueue: "docs/coordinacion/COLA_INTEGRACION.md",
    decisions: paths.decisions,
    migrations: paths.migrations,
    capabilities: paths.capabilities,
  };
  for (const [key, expected] of Object.entries(expectedStatusRegistries)) {
    if (status?.registries?.[key] !== expected) errors.push(`PROJECT_STATUS.registries.${key} debe ser ${expected}.`);
  }

  const references = [
    ...Object.values(expectedStatusRegistries),
    ...(decisions?.decisions ?? []).map((decision) => decision.document),
    ...(migrations?.migrations ?? []).flatMap((migration) => [migration.implementation, ...(migration.tests ?? [])]),
    ...(capabilities?.capabilities ?? []).flatMap((capability) => capability.paths ?? []),
    "docs/plantillas/DECISION_TRANSVERSAL.md",
    "docs/plantillas/MIGRACION_REPARACION.md",
  ];
  for (const reference of [...new Set(references.filter(Boolean))]) await requirePath(rootDir, reference, errors, checks);

  for (const capability of capabilities?.capabilities ?? []) {
    const script = String(capability.validationCommand ?? "").replace(/^pnpm run /, "");
    if (!packageJson?.scripts?.[script]) errors.push(`${capability.id}: package.json no registra ${capability.validationCommand}.`);
  }

  const coordination = await readFile(path.join(rootDir, "docs/coordinacion/README.md"), "utf8");
  for (const name of Object.values(paths)) {
    if (!coordination.includes(name)) errors.push(`docs/coordinacion/README.md debe referenciar ${name}.`);
    else checks.push(`README referencia ${name}`);
  }

  const index = await readFile(path.join(rootDir, "docs/INDICE_DOCUMENTACION.md"), "utf8");
  if (!index.includes(paths.status) || !index.includes(paths.decisions) || !index.includes(paths.migrations)) {
    errors.push("docs/INDICE_DOCUMENTACION.md debe indexar estado, decisiones y migraciones.");
  } else checks.push("indice documental referencia gobierno operativo");

  return {
    ok: errors.length === 0,
    errors,
    checks,
    counts: {
      decisions: decisions?.decisions?.length ?? 0,
      migrations: migrations?.migrations?.length ?? 0,
      capabilities: capabilities?.capabilities?.length ?? 0,
    },
  };
}
