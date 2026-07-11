const url = process.env.POSEIDON_URL ?? "http://127.0.0.1:5173/";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
  const html = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!html.includes('<div id="root"></div>')) throw new Error("No se encontro el nodo raiz de React.");
  if (!html.includes("Poseidon | Sistema de Gestion")) throw new Error("El titulo de Poseidon no esta presente.");
  console.log(`Poseidon responde correctamente en ${url} (HTTP ${response.status}).`);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Poseidon no responde correctamente en ${url}: ${detail}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
