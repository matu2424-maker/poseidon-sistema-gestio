import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  webServer: isCi
    ? {
        command: "pnpm run dev --host 127.0.0.1 --port 5173 --strictPort",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
  use: {
    baseURL: "http://127.0.0.1:5173",
    ...(isCi ? {} : { channel: "chrome" }),
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
