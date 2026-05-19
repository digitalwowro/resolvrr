import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const requiredFiles = [
  "docs/architecture/codebase-map.md",
  "docs/architecture/overview.md",
  "docs/architecture/provider-plugins.md",
  "docs/deploy/.env.example",
  "docs/deploy/environment.md",
  "docs/development/local-development.md",
  "docs/features/auth.md",
  "docs/operations/dev-service.md",
  "docs/security/privacy.md",
  "docs/ui/primitives.md",
  "docs/ui/workspace-ui-contract.md",
];

const disallowedTerms = [
  ["as", "sistant"].join(""),
  ["L", "LM"].join(""),
  ["build", "origin"].join("-"),
];

for (const file of requiredFiles) {
  await stat(join(process.cwd(), file));
  const content = await readFile(join(process.cwd(), file), "utf8");
  for (const term of disallowedTerms) {
    const pattern = new RegExp(`\\b${term}\\b`, "i");
    if (pattern.test(content)) {
      throw new Error(`Disallowed public-doc wording in ${file}`);
    }
  }
}

console.log("Public docs check passed.");
