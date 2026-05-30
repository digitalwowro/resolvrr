#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const scanRoots = ["src", "tests", "docs"];
const providerAssemblyFile = "src/providers/available-providers.ts";
const allowedDocs = new Set([
  "docs/architecture/codebase-map.md",
  "docs/architecture/provider-plugins.md",
  "docs/architecture/ticket-read-contract.md",
]);
const allowedNegativeTests = new Set([
  "tests/features/ticket-service-query.test.ts",
  "tests/unit/ticket-list-query.test.ts",
]);
const sourceExtensions = /\.(js|jsx|mjs|ts|tsx|md)$/u;

const boundaryPatterns = [
  {
    category: "direct-zammad-import",
    pattern: /(?:from\s+["'][^"']*zammad|import\s*\(\s*["'][^"']*zammad)/u,
  },
  { category: "zammad-api-path", pattern: /\/api\/v1/u },
  { category: "zammad-payload-field", pattern: /mentionable_/u },
  { category: "zammad-payload-field", pattern: /ticket_id/u },
  { category: "zammad-payload-field", pattern: /article_type_id/u },
  { category: "zammad-payload-field", pattern: /pending_time/u },
  { category: "zammad-payload-field", pattern: /state_id/u },
  { category: "zammad-payload-field", pattern: /priority_id/u },
  { category: "zammad-search-syntax", pattern: /state\.name/u },
  { category: "zammad-raw-state-label", pattern: /pending reminder/u },
  { category: "zammad-raw-priority-label", pattern: /2 normal/u },
  { category: "zammad-query-field", pattern: /zammadQuery/u },
  { category: "zammad-query-field", pattern: /zammadSearch/u },
];

function command(commandName, args, options = {}) {
  return execFileSync(commandName, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function commandOrEmpty(commandName, args) {
  try {
    return command(commandName, args);
  } catch {
    return "";
  }
}

function normalizePath(path) {
  return path.replace(/\\/gu, "/");
}

function isProviderOwned(path) {
  return (
    path.startsWith("src/providers/zammad/") ||
    path.startsWith("tests/providers/zammad/")
  );
}

function isSourceFile(path) {
  return sourceExtensions.test(path) && !path.startsWith("src/generated/");
}

function isAllowedFinding(path, category) {
  if (isProviderOwned(path)) {
    return true;
  }
  if (category === "direct-zammad-import" && path === providerAssemblyFile) {
    return true;
  }
  if (allowedDocs.has(path)) {
    return true;
  }
  if (allowedNegativeTests.has(path) && category !== "direct-zammad-import") {
    return true;
  }
  return false;
}

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

function scanText(path, text, source) {
  const findings = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    for (const { category, pattern } of boundaryPatterns) {
      if (pattern.test(line) && !isAllowedFinding(path, category)) {
        findings.push({
          category,
          line: index + 1,
          path,
          source,
        });
      }
    }
  });
  return findings;
}

function scanCurrentTree() {
  return collectCurrentFiles().flatMap((path) =>
    scanText(path, readFileSync(path, "utf8"), "current-tree"),
  );
}

function gitObjectExists(ref) {
  try {
    command("git", ["cat-file", "-e", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function ensurePrHeadObject(number, oid) {
  if (gitObjectExists(oid)) {
    return oid;
  }
  const auditRef = `refs/audit/zammad-boundary/pr-${number}`;
  command("git", ["fetch", "--quiet", "origin", `pull/${number}/head:${auditRef}`]);
  return auditRef;
}

function filesAtRef(ref) {
  const output = commandOrEmpty("git", [
    "ls-tree",
    "-r",
    "--name-only",
    ref,
    "--",
    ...scanRoots,
  ]);
  return output
    ? output.split("\n").map(normalizePath).filter(isSourceFile)
    : [];
}

function scanGitTree(ref) {
  return filesAtRef(ref).flatMap((path) => {
    const text = commandOrEmpty("git", ["show", `${ref}:${path}`]);
    return scanText(path, text, "git-tree");
  });
}

function scanAddedLines(baseRef, headRef) {
  const diff = commandOrEmpty("git", [
    "diff",
    "--unified=0",
    baseRef,
    headRef,
    "--",
    ...scanRoots,
  ]);
  const findings = [];
  let currentPath = "";

  for (const line of diff.split(/\r?\n/u)) {
    if (line.startsWith("+++ b/")) {
      currentPath = normalizePath(line.slice("+++ b/".length));
      continue;
    }
    if (!currentPath || !isSourceFile(currentPath)) {
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }
    const added = line.slice(1);
    for (const { category, pattern } of boundaryPatterns) {
      if (pattern.test(added) && !isAllowedFinding(currentPath, category)) {
        findings.push({
          category,
          line: null,
          path: currentPath,
          source: "added-line",
        });
      }
    }
  }
  return findings;
}

function listPullRequests(limit) {
  const pullRequests = JSON.parse(
    command("gh", [
      "pr",
      "list",
      "--state",
      "all",
      "--limit",
      String(limit),
      "--json",
      "number,state,mergeCommit,headRefOid,title",
    ]),
  );
  const byNumber = new Map(
    pullRequests.map((pullRequest) => [pullRequest.number, pullRequest]),
  );
  const maxNumber = Math.max(0, ...pullRequests.map((pullRequest) => pullRequest.number));
  for (let number = 1; number <= maxNumber; number += 1) {
    if (!byNumber.has(number)) {
      byNumber.set(number, {
        headRefOid: "",
        mergeCommit: null,
        number,
        state: "UNAVAILABLE",
        title: "Not returned by gh pr list",
      });
    }
  }
  return [...byNumber.values()];
}

function summarizeFindings(findings) {
  return [...new Set(findings.map((finding) => finding.path))].sort();
}

function auditPullRequests(limit) {
  return listPullRequests(limit)
    .sort((left, right) => left.number - right.number)
    .map((pullRequest) => {
      const mergeOid = pullRequest.mergeCommit?.oid;
      const headOid = pullRequest.headRefOid;
      const checkedRef = mergeOid ?? headOid;
      if (!checkedRef) {
        return {
          checkedRef: "",
          diffFindings: [],
          number: pullRequest.number,
          result: "unavailable",
          state: pullRequest.state,
          title: pullRequest.title,
          treeFindings: [],
          verdict: "UNAVAILABLE_NO_REF",
        };
      }

      try {
        const ref =
          pullRequest.state === "MERGED"
            ? checkedRef
            : ensurePrHeadObject(pullRequest.number, checkedRef);
        const treeFindings = scanGitTree(ref);
        const firstParent = mergeOid
          ? commandOrEmpty("git", ["rev-parse", `${ref}^1`])
          : "";
        const diffFindings = firstParent ? scanAddedLines(firstParent, ref) : [];
        const verdict = diffFindings.length
          ? "INTRODUCED_LEAK"
          : treeFindings.length
            ? "TREE_LEAK"
            : "PASS";
        const result = diffFindings.length
          ? `${diffFindings.length} added finding(s)`
          : treeFindings.length
            ? `${treeFindings.length} tree finding(s)`
            : "clean";

        return {
          checkedRef,
          diffFindings,
          number: pullRequest.number,
          result,
          state: pullRequest.state,
          title: pullRequest.title,
          treeFindings,
          verdict,
        };
      } catch (error) {
        return {
          checkedRef,
          diffFindings: [],
          error: error instanceof Error ? error.message : String(error),
          number: pullRequest.number,
          result: "unavailable",
          state: pullRequest.state,
          title: pullRequest.title,
          treeFindings: [],
          verdict: "UNAVAILABLE_SCAN_FAILED",
        };
      }
    });
}

function markdownEscape(value) {
  return String(value)
    .replace(/\\/gu, "\\\\")
    .replace(/\|/gu, "\\|")
    .replace(/\n/gu, " ");
}

function historyMarkdown(rows) {
  const lines = [
    "| PR | State | Checked ref | Result | Suspicious paths | Verdict |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    const paths = summarizeFindings([
      ...row.diffFindings,
      ...row.treeFindings,
    ]).join("<br>");
    lines.push(
      [
        `#${row.number}`,
        row.state,
        row.checkedRef ? row.checkedRef.slice(0, 12) : "-",
        row.result,
        paths || "-",
        row.verdict,
      ]
        .map(markdownEscape)
        .join(" | "),
    );
  }
  return lines.join("\n");
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const limitIndex = process.argv.indexOf("--limit");
  const limit =
    limitIndex >= 0 && process.argv[limitIndex + 1]
      ? Number(process.argv[limitIndex + 1])
      : 60;
  return {
    failOnFindings: args.has("--fail-on-findings"),
    history: args.has("--history"),
    json: args.has("--json"),
    limit,
  };
}

const options = parseArgs();
if (options.history) {
  const rows = auditPullRequests(options.limit);
  if (options.json) {
    console.log(JSON.stringify({ mode: "history", rows }, null, 2));
  } else {
    console.log(historyMarkdown(rows));
  }
  if (options.failOnFindings && rows.some((row) => row.verdict !== "PASS")) {
    process.exitCode = 1;
  }
} else {
  const findings = scanCurrentTree();
  if (options.json) {
    console.log(JSON.stringify({ findings, mode: "current" }, null, 2));
  } else if (findings.length) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    console.log("Zammad provider boundary check passed.");
  }
  if (options.failOnFindings && findings.length) {
    process.exitCode = 1;
  }
}
