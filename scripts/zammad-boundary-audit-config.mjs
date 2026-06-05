export const scanRoots = ["src", "tests", "docs"];
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

export const boundaryPatterns = [
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

export function normalizePath(path) {
  return path.replace(/\\/gu, "/");
}

function isProviderOwned(path) {
  return (
    path.startsWith("src/providers/zammad/") ||
    path.startsWith("tests/providers/zammad/")
  );
}

export function isSourceFile(path) {
  return sourceExtensions.test(path) && !path.startsWith("src/generated/");
}

export function isAllowedFinding(path, category) {
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

export function scanText(path, text, source) {
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
