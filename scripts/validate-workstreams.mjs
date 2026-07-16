import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorkstreamInfrastructure } from "./workstream-config-validation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await validateWorkstreamInfrastructure({ rootDir });

if (!result.ok) {
  console.error("Coordinacion de chats invalida:");
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Coordinacion de chats valida: ${result.roleChats.length} chats de rol, ${result.checks.length} controles.`);
  result.roleChats.forEach((chat) => console.log(`- ${chat}: worktree aislado`));
}
