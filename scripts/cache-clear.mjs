import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = resolve(process.env.APP_ROOT ?? process.cwd());
const disabledServiceValues = new Set(["", "0", "false", "none", "off"]);
const configuredServiceName = process.env.NEXT_DEV_SERVICE;
const serviceName = disabledServiceValues.has(
  (configuredServiceName ?? "resolvrr-dev.service").toLowerCase(),
)
  ? undefined
  : (configuredServiceName ?? "resolvrr-dev.service");
const cachePaths = [".next", ".turbo", ".cache", "coverage", "tsconfig.tsbuildinfo"];

function systemctl(args, options = {}) {
  return spawnSync("systemctl", ["--user", ...args], {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
}

function serviceIsLoaded(name) {
  const result = systemctl(["show", "--property=LoadState", "--value", name]);

  if (result.status !== 0) {
    return false;
  }

  return result.stdout.trim() === "loaded";
}

function serviceIsActive(name) {
  return systemctl(["is-active", "--quiet", name]).status === 0;
}

function stopService(name) {
  const result = systemctl(["stop", name], { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`Refusing to clear caches because ${name} could not be stopped.`);
  }
}

function startService(name) {
  const result = systemctl(["start", name], { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`Caches were cleared, but ${name} could not be restarted.`);
  }
}

let restartService = false;

if (serviceName) {
  const loaded = serviceIsLoaded(serviceName);

  if (loaded && serviceIsActive(serviceName)) {
    console.log(`Stopping ${serviceName} before clearing framework caches.`);
    stopService(serviceName);
    restartService = true;
  }
}

for (const cachePath of cachePaths) {
  await rm(resolve(appRoot, cachePath), { force: true, recursive: true });
}

if (serviceName && restartService) {
  console.log(`Restarting ${serviceName} after clearing framework caches.`);
  startService(serviceName);
}

if (process.env.APP_DEV_URL) {
  console.log(`Dev app: ${process.env.APP_DEV_URL}`);
}
