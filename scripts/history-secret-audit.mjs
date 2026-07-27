import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const secretAssignment =
  /\b(?:SUPABASE_(?:SERVICE_ROLE_KEY|SECRET_KEY|ACCESS_TOKEN|DB_PASSWORD)|POSTGRES_(?:URL(?:_NON_POOLING)?|PASSWORD)|DATABASE_URL|PGPASSWORD|JWT_SECRET)\s*[:=]\s*["']?([^\s"'`]+)/gi;
const privateKeyMarker = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const secretSupabaseKey = /\b(?:sb_secret_|sbp_)[a-zA-Z0-9_-]{12,}/;
const postgresCredentialUrl = /\bpostgres(?:ql)?:\/\/[^/\s:@]+:[^@\s/]+@/i;

const placeholderValue = (value) =>
  !value ||
  value.startsWith("<") ||
  value.startsWith("${") ||
  /^(?:example|placeholder|changeme|redacted|none|null)$/i.test(value);

export function historicalSecretRuleIds(source) {
  const text = String(source ?? "");
  const rules = [];
  if (privateKeyMarker.test(text)) rules.push("PRIVATE_KEY");
  if (secretSupabaseKey.test(text)) rules.push("SUPABASE_SECRET_TOKEN");
  if (postgresCredentialUrl.test(text)) rules.push("POSTGRES_CREDENTIAL_URL");

  secretAssignment.lastIndex = 0;
  let match;
  while ((match = secretAssignment.exec(text))) {
    if (!placeholderValue(match[1])) {
      rules.push("ASSIGNED_SECRET");
      break;
    }
  }
  return [...new Set(rules)];
}

const git = (args, options = {}) =>
  execFileSync("git", args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: options.encoding,
    input: options.input,
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
  });

export function auditGitHistorySecrets({ cwd = process.cwd() } = {}) {
  const objects = git(["rev-list", "--objects", "--all"], {
    cwd,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const pathByObject = new Map();
  const findings = [];
  let scannedBlobs = 0;

  for (const line of objects) {
    const separator = line.indexOf(" ");
    if (separator < 0) continue;
    const objectId = line.slice(0, separator);
    const path = line.slice(separator + 1);
    if (path && !pathByObject.has(objectId)) pathByObject.set(objectId, path);
  }

  const objectIds = [...pathByObject.keys()];
  const objectInfo = git(
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    { cwd, encoding: "utf8", input: `${objectIds.join("\n")}\n` },
  );
  const textBlobIds = objectInfo
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      const [objectId, type, sizeText] = line.split(" ");
      const size = Number(sizeText);
      return type === "blob" && Number.isFinite(size) ? [objectId] : [];
    });
  const batch = git(["cat-file", "--batch"], {
    cwd,
    input: `${textBlobIds.join("\n")}\n`,
    maxBuffer: 512 * 1024 * 1024,
  });

  let offset = 0;
  while (offset < batch.length) {
    const headerEnd = batch.indexOf(10, offset);
    if (headerEnd < 0) break;
    const [objectId, type, sizeText] = batch
      .subarray(offset, headerEnd)
      .toString("utf8")
      .split(" ");
    const size = Number(sizeText);
    if (type !== "blob" || !Number.isFinite(size)) break;
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    const content = batch.subarray(contentStart, contentEnd);
    offset = contentEnd + 1;
    if (content.includes(0)) continue;
    scannedBlobs += 1;
    const rules = historicalSecretRuleIds(content.toString("utf8"));
    if (rules.length) {
      findings.push({
        objectId,
        path: pathByObject.get(objectId) ?? "(ruta desconocida)",
        rules,
      });
    }
  }

  return { findings, scannedBlobs };
}

function runCli() {
  const result = auditGitHistorySecrets();
  console.log(
    `Auditoria historica: ${result.scannedBlobs} blobs de texto, ${result.findings.length} hallazgo(s).`,
  );
  result.findings.forEach((finding) => {
    console.log(
      `- ${finding.path} | blob ${finding.objectId.slice(0, 12)} | ${finding.rules.join(", ")}`,
    );
  });
  if (process.argv.includes("--fail-on-findings") && result.findings.length) {
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
