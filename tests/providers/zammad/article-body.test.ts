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
});
