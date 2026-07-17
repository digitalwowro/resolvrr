import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const authStatePath = "playwright/.auth/resolvrr.json";

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "test-results/playwright",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  retries: 0,
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ?? "https://resolvrr.dwow.dev",
    screenshot: "only-on-failure",
    storageState: existsSync(authStatePath) ? authStatePath : undefined,
    timezoneId: "Europe/Bucharest",
    trace: "retain-on-failure",
    video: "off",
    viewport: { height: 900, width: 1440 },
  },
  workers: 1,
});
