import { spawnSync } from "node:child_process";

const file = "next-env.d.ts";

function git(args) {
  return spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

const unstaged = git(["diff", "--quiet", "--", file]);
const staged = git(["diff", "--cached", "--quiet", "--", file]);

if (unstaged.status === 0 && staged.status === 0) {
  console.log(`${file} is clean.`);
  process.exit(0);
}

process.stderr.write(
  `${file} has generated Next.js route-type churn. Run npm run next-env:restore before committing.\n`,
);
process.exit(1);
