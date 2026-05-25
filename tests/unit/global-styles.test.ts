import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("global styles", () => {
  it("uses a plain anchor selector so global link color wins over Tailwind preflight", async () => {
    const css = await readFile("src/app/globals.css", "utf8");

    expect(css).toContain("a {\n  color: var(--color-indigo-600);");
    expect(css).not.toContain(":where(a)");
  });
});
