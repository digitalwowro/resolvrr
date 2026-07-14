import { describe, expect, it } from "vitest";
import {
  sanitizeForwardedProviderHtml,
  sanitizeProviderHtml,
} from "@/security/sanitize-html";

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
      '<p>Explore:</p><ul><li><a href="https://example.com/docs">Docs</a></li></ul><section><address>Support</address><footer>Footer</footer></section><table><tr><th>A</th></tr><tr><td>B</td></tr></table>',
    );

    expect(sanitized).toContain("<p>Explore:</p>");
    expect(sanitized).toContain("<ul><li>");
    expect(sanitized).toContain('href="https://example.com/docs"');
    expect(sanitized).toContain(
      "<section><address>Support</address><footer>Footer</footer></section>",
    );
    expect(sanitized).toContain("<table><tr><th>A</th></tr><tr><td>B</td></tr></table>");
  });

  it("preserves safe forwarded-email styling but removes active content and tracking images", () => {
    const sanitized = sanitizeForwardedProviderHtml(
      '<div style="color:#125599;position:fixed"><table><tr><td style="padding:10px">Hi</td></tr></table><img src="https://tracker.example/pixel"><script>bad()</script></div>',
    );
    expect(sanitized).toContain('style="color:#125599"');
    expect(sanitized).toContain('style="padding:10px"');
    expect(sanitized).not.toContain("position");
    expect(sanitized).not.toContain("tracker.example");
    expect(sanitized).not.toContain("<script");
  });
});
