#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const scannedRoots = ["src", "tests", "docs"];
const sourceLimit = 300;
const smellLimit = 500;
const checkedExtensions = new Set([".md", ".ts", ".tsx"]);
const skippedSegments = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "src/generated",
]);
const exemptFiles = new Set(["docs/architecture/codebase-map.md"]);

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function skipPath(repoPath) {
  return exemptFiles.has(repoPath) ||
    [...skippedSegments].some((segment) => repoPath === segment ||
      repoPath.startsWith(`${segment}/`));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const repoPath = toRepoPath(fullPath);
    if (skipPath(repoPath)) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
      continue;
    }
    if (entry.isFile() && checkedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineCount(source) {
  if (source.length === 0) {
    return 0;
  }

  const normalizedSource = source.endsWith("\n") ? source.slice(0, -1) : source;
  return normalizedSource.split("\n").length;
}

const findings = [];

for (const root of scannedRoots) {
  const files = await listFiles(path.join(repoRoot, root));
  for (const file of files) {
    const repoPath = toRepoPath(file);
    const lines = lineCount(await readFile(file, "utf8"));
    if (lines > smellLimit) {
      findings.push({ level: "error", lines, repoPath });
      continue;
    }
    if (repoPath.startsWith("src/") && lines > sourceLimit) {
      findings.push({ level: "error", lines, repoPath });
      continue;
    }
    if (lines > sourceLimit) {
      findings.push({ level: "warn", lines, repoPath });
    }
  }
}

const errors = findings.filter((finding) => finding.level === "error");
const warnings = findings.filter((finding) => finding.level === "warn");

for (const finding of errors) {
  console.error(`error ${finding.lines} ${finding.repoPath}`);
}

for (const finding of warnings) {
  console.warn(`warn ${finding.lines} ${finding.repoPath}`);
}

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log("File size check passed.");
}
