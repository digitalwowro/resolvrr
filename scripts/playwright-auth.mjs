import { chmod, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const email = process.env.PLAYWRIGHT_USER_EMAIL?.trim();
const password = process.env.PLAYWRIGHT_USER_PASSWORD;
const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://resolvrr.dwow.dev";
const authStatePath = resolve("playwright/.auth/resolvrr.json");

if (!email || !password) {
  console.error(
    "Set PLAYWRIGHT_USER_EMAIL and PLAYWRIGHT_USER_PASSWORD for this command.",
  );
  process.exitCode = 1;
} else {
  await mkdir(resolve("playwright/.auth"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(new URL("/login", baseUrl).href, {
      waitUntil: "domcontentloaded",
    });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/workspace", {
        timeout: 30_000,
      }),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);
    await context.storageState({
      indexedDB: true,
      path: authStatePath,
    });
    await chmod(authStatePath, 0o600);
    console.info("Saved the gitignored Playwright authentication state.");
  } catch {
    console.error(
      "Headless authentication failed. Check the credentials and application availability.",
    );
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
