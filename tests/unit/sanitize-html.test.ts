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
});
