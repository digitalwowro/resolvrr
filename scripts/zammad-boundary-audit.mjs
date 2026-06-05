#!/usr/bin/env node

import { scanCurrentTree } from "./zammad-boundary-audit-current.mjs";
import {
  auditPullRequests,
  historyMarkdown,
} from "./zammad-boundary-audit-history.mjs";

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
