import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAgentInfrastructure } from "./agent-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await validateAgentInfrastructure({ rootDir });

if (!result.ok) {
  console.error("Infraestructura de agentes invalida:");
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Infraestructura de agentes valida: ${result.profiles.length} perfiles, ${result.checks.length} controles.`);
  result.profiles.forEach((profile) => console.log(`- ${profile}: read-only`));
}
