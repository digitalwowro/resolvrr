import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = resolve(process.env.APP_ROOT ?? process.cwd());
const serviceName = process.env.NEXT_DEV_SERVICE;
const cachePaths = [".next", ".turbo", ".cache", "coverage", "tsconfig.tsbuildinfo"];

function runSystemctl(args) {
  const result = spawnSync("systemctl", ["--user", ...args], {
    stdio: "inherit",
  });
  return result.status === 0;
}

if (serviceName) {
  runSystemctl(["stop", serviceName]);
}

for (const cachePath of cachePaths) {
  await rm(resolve(appRoot, cachePath), { force: true, recursive: true });
}

if (serviceName) {
  runSystemctl(["start", serviceName]);
}

if (process.env.APP_DEV_URL) {
  console.log(`Dev app: ${process.env.APP_DEV_URL}`);
}
