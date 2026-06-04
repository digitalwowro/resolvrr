import { spawnSync } from "node:child_process";

const file = "next-env.d.ts";

function git(args) {
  return spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

const tracked = git(["ls-files", "--error-unmatch", file]);
if (tracked.status !== 0) {
  process.exit(0);
}

const dirty = git(["diff", "--quiet", "--", file]);
if (dirty.status === 0) {
  process.exit(0);
}

const restored = git(["restore", "--worktree", "--", file]);
if (restored.status !== 0) {
  process.stderr.write(restored.stderr || `Failed to restore ${file}.\n`);
  process.exit(restored.status ?? 1);
}

console.log(`Restored generated ${file} after build.`);
