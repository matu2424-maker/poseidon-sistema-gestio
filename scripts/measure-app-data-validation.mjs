import { performance } from "node:perf_hooks";
import { createServer } from "vite";

function numericOption(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`El parametro --${name} debe ser un entero mayor a cero.`);
  }
  return value;
}

function percentile(values, ratio) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * ratio) - 1)];
}

const records = numericOption("records", 10_000);
const runs = numericOption("runs", 20);
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "error",
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
});

try {
  const [{ createSeedData }, { validateAppData }] = await Promise.all([
    vite.ssrLoadModule("/src/data/appData.ts"),
    vite.ssrLoadModule("/src/infrastructure/storage/appDataValidation.ts"),
  ]);
  const seed = createSeedData();
  const template = seed.audit[0];
  if (!template) throw new Error("El escenario demo necesita al menos un evento de auditoria para medir.");

  const data = {
    ...seed,
    audit: Array.from({ length: records }, (_, index) => ({
      ...template,
      id: `performance-audit-${index + 1}`,
      entityId: `performance-entity-${index + 1}`,
    })),
  };

  const warmup = validateAppData(data);
  if (!warmup.ok) throw new Error(warmup.error);

  const durations = [];
  for (let index = 0; index < runs; index += 1) {
    const startedAt = performance.now();
    const result = validateAppData(data);
    durations.push(performance.now() - startedAt);
    if (!result.ok) throw new Error(result.error);
  }

  const summary = {
    records,
    runs,
    medianMs: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...durations).toFixed(2)),
  };
  console.log("Medicion de validacion profunda de AppData:");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await vite.close();
}
