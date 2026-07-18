import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGovernanceInfrastructure } from "./governance-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await validateGovernanceInfrastructure({ rootDir });

if (!result.ok) {
  console.error("Gobierno operativo invalido:");
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Gobierno operativo valido: ${result.counts.decisions} decisiones, ${result.counts.migrations} migraciones y ${result.counts.capabilities} capacidades; ${result.checks.length} controles.`,
  );
}
