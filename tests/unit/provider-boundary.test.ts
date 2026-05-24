import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const providerAssemblyFile = "src/providers/available-providers.ts";

describe("provider boundary", () => {
  it("keeps direct Zammad imports in provider code, provider tests, or assembly only", () => {
    const files = collectSourceFiles(["src", "tests"]);

    const offenders = files.filter((file) => {
      const normalized = relative(process.cwd(), file).replace(/\\/gu, "/");
      if (
        normalized === providerAssemblyFile ||
        normalized.startsWith("src/providers/zammad/") ||
        normalized.startsWith("tests/providers/zammad/")
      ) {
        return false;
      }

      return /from ["'][^"']*zammad|import\(["'][^"']*zammad/u.test(
        readFileSync(file, "utf8"),
      );
    });

    expect(offenders).toEqual([]);
  });
});

function collectSourceFiles(roots: string[]): string[] {
  const files: string[] = [];

  function walk(path: string) {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        walk(join(path, entry));
      }
      return;
    }

    if (/\.(ts|tsx)$/u.test(path)) {
      files.push(path);
    }
  }

  roots.forEach((root) => walk(join(process.cwd(), root)));
  return files;
}
