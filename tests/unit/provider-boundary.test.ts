import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("provider boundary", () => {
  it("keeps Zammad imports and raw provider tokens inside the provider boundary", () => {
    const output = execFileSync(
      "node",
      ["scripts/zammad-boundary-audit.mjs", "--json"],
      { encoding: "utf8" },
    );
    const result = JSON.parse(output) as {
      findings: Array<{
        category: string;
        line: number;
        path: string;
        source: string;
      }>;
    };

    expect(result.findings).toEqual([]);
  });
});
