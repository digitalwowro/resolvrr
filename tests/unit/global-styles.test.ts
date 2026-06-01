import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("global styles", () => {
  it("colors plain anchors without overriding styled link buttons", async () => {
    const css = await readFile("src/app/globals.css", "utf8");

    expect(css).toContain("a:not([class]) {\n  color: var(--color-indigo-600);");
    expect(css).not.toContain("a {\n  color: var(--color-indigo-600);");
    expect(css).not.toContain(":where(a)");
  });
});
