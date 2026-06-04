import "dotenv/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

function parseAllowedDevOrigins(value: string | undefined): string[] {
  const origins = new Set(
    (value ?? "resolvrr.dwow.dev,localhost,127.0.0.1")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const hostname = process.env.HOSTNAME?.trim();
  if (hostname && hostname !== "0.0.0.0") {
    origins.add(hostname);
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: parseAllowedDevOrigins(process.env.ALLOWED_DEV_ORIGINS),
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
