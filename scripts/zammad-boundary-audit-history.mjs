import { execFileSync } from "node:child_process";
import {
  boundaryPatterns,
  isAllowedFinding,
  isSourceFile,
  normalizePath,
  scanRoots,
  scanText,
} from "./zammad-boundary-audit-config.mjs";

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

function markdownEscape(value) {
  return String(value)
    .replace(/\\/gu, "\\\\")
    .replace(/\|/gu, "\\|")
    .replace(/\n/gu, " ");
}

export function historyMarkdown(rows) {
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

export function auditPullRequests(limit) {
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
