import { describe, expect, it } from "vitest";
import { sanitizeZammadArticleBody } from "@/providers/zammad/article-body";

describe("Zammad article body normalization", () => {
  it("replaces the provider marker with a provider-neutral boundary", () => {
    const html = sanitizeZammadArticleBody(
      '<p>Message</p><span class="foo js-signatureMarker bar"></span><script>alert(1)</script>',
    );

    expect(html).toContain(
      '<span data-resolvrr-signature-boundary="explicit"></span>',
    );
    expect(html).not.toContain("js-signatureMarker");
    expect(html).not.toContain("script");
  });

  it("normalizes Zammad signature containers without exposing provider classes", () => {
    const html = sanitizeZammadArticleBody([
      "<p>Authored message</p>",
      '<div class="email js-signatureMarker compact">',
      "<p>Regards,<br>Example Agent<br>example.test</p>",
      "</div>",
    ].join(""));

    expect(html.match(/data-resolvrr-signature-boundary/gu)).toHaveLength(1);
    expect(html.indexOf("data-resolvrr-signature-boundary")).toBeLessThan(
      html.indexOf("Regards"),
    );
    expect(html).toContain('class="email compact"');
    expect(html).not.toContain("js-signatureMarker");
  });

  it("does not duplicate a standalone Zammad boundary for a marked container", () => {
    const html = sanitizeZammadArticleBody([
      "<p>Authored message</p>",
      '<span class="js-signatureMarker"></span>',
      '<div class="js-signatureMarker"><p>Signature body</p></div>',
    ].join(""));

    expect(html.match(/data-resolvrr-signature-boundary/gu)).toHaveLength(1);
    expect(html).not.toContain("js-signatureMarker");
  });

  it("normalizes Zammad data-signature containers", () => {
    const html = sanitizeZammadArticleBody(
      '<p>Message</p><div data-signature="true"><p>Signature body</p></div>',
    );

    expect(html).toContain(
      '<span data-resolvrr-signature-boundary="explicit"></span><div>',
    );
    expect(html).not.toContain("data-signature");
  });

  it("uses Zammad learned signature line metadata when no marker exists", () => {
    const html = sanitizeZammadArticleBody(
      "<p>Message</p><br><p>Learned signature</p><br><p>Contact line</p>",
      { signatureDetectionLine: 1 },
    );

    expect(html.indexOf("data-resolvrr-signature-boundary")).toBeLessThan(
      html.indexOf("Learned signature"),
    );
  });
});
