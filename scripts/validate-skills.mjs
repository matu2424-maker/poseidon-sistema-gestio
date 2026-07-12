import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSkillInfrastructure } from "./skill-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await validateSkillInfrastructure({ rootDir });

if (!result.ok) {
  console.error("Infraestructura de skills invalida:");
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Infraestructura de skills valida: ${result.skills.length} skills, ${result.checks.length} controles.`);
  result.skills.forEach((skill) => console.log(`- ${skill}`));
}
