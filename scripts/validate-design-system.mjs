import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDesignSystem } from "./design-system-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await validateDesignSystem({ rootDir });

if (!result.ok) {
  console.error("Sistema visual invalido:");
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Sistema visual valido: ${result.checks.length} controles.`);
}
