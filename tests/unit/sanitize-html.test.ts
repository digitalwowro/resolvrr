import { describe, expect, it } from "vitest";
import { sanitizeProviderHtml } from "@/security/sanitize-html";

describe("provider HTML sanitization", () => {
  it("removes scripts and unsafe attributes", () => {
    const sanitized = sanitizeProviderHtml(
      '<p onclick="alert(1)">Hello<script>alert(2)</script></p>',
    );

    expect(sanitized).toBe("<p>Hello</p>");
  });

  it("keeps safe links with protective attributes", () => {
    const sanitized = sanitizeProviderHtml('<a href="https://example.com">x</a>');

    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).toContain('rel="noreferrer noopener"');
    expect(sanitized).toContain('target="_blank"');
  });

  it("keeps rich text structure used by provider ticket articles", () => {
    const sanitized = sanitizeProviderHtml(
      '<p>Explore:</p><ul><li><a href="https://example.com/docs">Docs</a></li></ul><table><tr><th>A</th></tr><tr><td>B</td></tr></table>',
    );

    expect(sanitized).toContain("<p>Explore:</p>");
    expect(sanitized).toContain("<ul><li>");
    expect(sanitized).toContain('href="https://example.com/docs"');
    expect(sanitized).toContain("<table><tr><th>A</th></tr><tr><td>B</td></tr></table>");
  });
});
