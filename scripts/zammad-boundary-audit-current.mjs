import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  isSourceFile,
  normalizePath,
  scanRoots,
  scanText,
} from "./zammad-boundary-audit-config.mjs";

function collectCurrentFiles() {
  const files = [];

  function walk(path) {
    if (!existsSync(path)) {
      return;
    }
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        walk(join(path, entry));
      }
      return;
    }
    const normalized = normalizePath(relative(process.cwd(), path));
    if (isSourceFile(normalized)) {
      files.push(normalized);
    }
  }

  scanRoots.forEach((root) => walk(join(process.cwd(), root)));
  return files;
}

export function scanCurrentTree() {
  return collectCurrentFiles().flatMap((path) =>
    scanText(path, readFileSync(path, "utf8"), "current-tree"),
  );
}
