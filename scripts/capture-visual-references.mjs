import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "referencias-visuales");
const baseURL = process.env.POSEIDON_URL ?? "http://127.0.0.1:5173";

async function openDifferences(page) {
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption("user-encargado");
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("heading", { name: "Panel del encargado", exact: true }).waitFor();

  await page.getByRole("button", { name: "Ver diferencias", exact: true }).click();
  await page.getByRole("heading", { name: "Diferencias de caja", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Situacion de las diferencias", exact: true }).waitFor();
  await page.locator(".difference-table").waitFor();
  await page.evaluate("document.fonts.ready");
}

async function captureReference(browser, { fileName, viewport, focusContent }) {
  const context = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await context.newPage();
  const runtimeErrors = [];
  const responseErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      runtimeErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      responseErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await openDifferences(page);
  if (focusContent) {
    await page.locator(".differences-page").evaluate((element) => element.scrollIntoView({ block: "start" }));
  }

  const pageOverflows = await page.evaluate(
    "document.documentElement.scrollWidth > document.documentElement.clientWidth",
  );
  if (pageOverflows) throw new Error(`${fileName}: la pagina tiene overflow horizontal.`);
  if (runtimeErrors.length) throw new Error(`${fileName}: ${runtimeErrors.join(" | ")}`);
  if (responseErrors.length) throw new Error(`${fileName}: ${responseErrors.join(" | ")}`);

  await page.screenshot({
    path: path.join(outputDir, fileName),
    animations: "disabled",
    fullPage: false,
  });
  await context.close();
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  await captureReference(browser, {
    fileName: "diferencias-desktop-1920x1080.png",
    viewport: { width: 1920, height: 1080 },
    focusContent: false,
  });
  await captureReference(browser, {
    fileName: "diferencias-mobile-390x844.png",
    viewport: { width: 390, height: 844 },
    focusContent: true,
  });
} finally {
  await browser.close();
}

console.log(`Referencias visuales actualizadas en ${outputDir}.`);
