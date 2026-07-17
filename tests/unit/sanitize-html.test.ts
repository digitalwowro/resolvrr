import { describe, expect, it } from "vitest";
import {
  sanitizeForwardedProviderHtml,
  sanitizeProviderHtml,
  sanitizeSignatureTemplateHtml,
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

  it("preserves conservative email presentation while blocking unsafe layout", () => {
    const sanitized = sanitizeProviderHtml(
      '<table border="0" cellpadding="8" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;position:fixed"><tr style="background-color:#f5f5f5"><td align="center" style="padding:10px 20px;border:0;z-index:99">Invoice</td></tr></table>',
    );

    expect(sanitized).toContain('border="0"');
    expect(sanitized).toContain('cellpadding="8"');
    expect(sanitized).toContain("width:100%");
    expect(sanitized).toContain("padding:10px 20px");
    expect(sanitized).not.toContain("position");
    expect(sanitized).not.toContain("z-index");
  });

  it("keeps only inline images approved and rewritten by the provider", () => {
    const sanitized = sanitizeProviderHtml(
      '<p>Invoice</p><img src="cid:quote" alt="Quote"><img src="https://tracker.example/pixel" alt="Tracker">',
      {
        rewriteImageSource: (source) =>
          source === "cid:quote" ? "/api/helpdesk-connections/1/inline-image/2" : undefined,
      },
    );

    expect(sanitized).toContain(
      'src="/api/helpdesk-connections/1/inline-image/2"',
    );
    expect(sanitized).toContain('alt="Quote"');
    expect(sanitized).not.toContain("tracker.example");
    expect(sanitized).not.toContain("Tracker");
  });

  it("preserves safe absolute image dimensions used by email signatures", () => {
    const sanitized = sanitizeProviderHtml(
      '<img src="cid:logo" style="max-width:100%;width:0.9479in;max-height:1.4166in;position:fixed">',
      { rewriteImageSource: () => "/inline/logo" },
    );

    expect(sanitized).toContain("width:0.9479in");
    expect(sanitized).toContain("max-height:1.4166in");
    expect(sanitized).not.toContain("position");
  });

  it("preserves provider-approved embedded image data", () => {
    const source = "data:image/jpeg;base64,AQID";
    const sanitized = sanitizeProviderHtml(
      `<img src="${source}" alt="Logo">`,
      { rewriteImageSource: () => source },
    );

    expect(sanitized).toContain(`src="${source}"`);
    expect(sanitized).toContain('alt="Logo"');
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

  it("keeps managed signature images while removing remote tracking images", () => {
    const sanitized = sanitizeSignatureTemplateHtml(
      '<p>Agent</p><img src="data:image/png;base64,AQID"><img src="https://tracker.example/pixel"><script>bad()</script>',
    );
    expect(sanitized).toContain("data:image/png;base64,AQID");
    expect(sanitized).not.toContain("tracker.example");
    expect(sanitized).not.toContain("<script");
  });
});
