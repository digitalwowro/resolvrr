import { describe, expect, it } from "vitest";
import {
  normalizeZammadSignatureBodyResult,
  sanitizeZammadArticleBody,
  sanitizeZammadArticleBodyResult,
  zammadArticleSignatureDetectionLine,
} from "@/providers/zammad/article-body";
import { mapArticle } from "@/providers/zammad/mapping";
import type { ZammadArticle } from "@/providers/zammad/schemas";

describe("Zammad article body normalization", () => {
  it("turns the provider marker into typed evidence only", () => {
    const result = sanitizeZammadArticleBodyResult(
      '<p>Message</p><span class="foo js-signatureMarker bar"></span><script>alert(1)</script>',
    );

    expect(result.signatureHints).toEqual([
      { kind: "provider-marker", boundaryOffset: 14 },
    ]);
    expect(result.sanitizedHtml).toBe("<p>Message</p>");
    expect(result.sanitizedHtml).not.toContain("js-signatureMarker");
    expect(result.sanitizedHtml).not.toContain("script");
  });

  it("normalizes Zammad signature containers without exposing provider classes", () => {
    const html = sanitizeZammadArticleBody([
      "<p>Authored message</p>",
      '<div class="email js-signatureMarker compact">',
      "<p>Regards,<br>Example Agent<br>example.test</p>",
      "</div>",
    ].join(""));

    expect(html).not.toContain("data-resolvrr-signature-boundary");
    expect(html).toContain("Regards");
    expect(html).toContain('class="email compact"');
    expect(html).not.toContain("js-signatureMarker");
  });

  it("keeps separate typed evidence without emitting duplicate boundaries", () => {
    const result = sanitizeZammadArticleBodyResult([
      "<p>Authored message</p>",
      '<span class="js-signatureMarker"></span>',
      '<div class="js-signatureMarker"><p>Signature body</p></div>',
    ].join(""));

    expect(result.signatureHints.map((hint) => hint.kind)).toEqual([
      "provider-marker",
      "provider-container",
    ]);
    expect(result.sanitizedHtml).not.toContain(
      "data-resolvrr-signature-boundary",
    );
    expect(result.sanitizedHtml).not.toContain("js-signatureMarker");
  });

  it("normalizes Zammad data-signature containers", () => {
    const html = sanitizeZammadArticleBody(
      '<p>Message</p><div data-signature="true"><p>Signature body</p></div>',
    );

    expect(html).toContain("<p>Message</p><div>");
    expect(html).not.toContain("data-signature");
  });

  it("uses Zammad learned signature line metadata when no marker exists", () => {
    const result = sanitizeZammadArticleBodyResult(
      "<p>Message</p><br><p>Learned signature</p><br><p>Contact line</p>",
      { signatureDetectionLine: 1 },
    );

    expect(result.signatureHints).toHaveLength(1);
    expect(result.signatureHints[0]).toMatchObject({
      kind: "provider-learned-line",
      line: 1,
    });
    expect(result.sanitizedHtml).not.toContain(
      "data-resolvrr-signature-boundary",
    );
  });

  it("returns a typed standalone-marker hint with a sanitized offset", () => {
    const result = sanitizeZammadArticleBodyResult(
      '<p>Message</p><span class="js-signatureMarker"></span><p>Signature</p>',
    );

    expect(result.signatureHints).toEqual([
      { kind: "provider-marker", boundaryOffset: 14 },
    ]);
    const hint = result.signatureHints[0];
    if (!hint || hint.kind !== "provider-marker") {
      throw new Error("Expected a provider marker hint.");
    }
    expect(result.sanitizedHtml.slice(hint.boundaryOffset)).toBe(
      "<p>Signature</p>",
    );
    expect(result.sanitizedHtml).not.toContain("js-signatureMarker");
  });

  it("returns the exact sanitized range of a provider signature container", () => {
    const result = sanitizeZammadArticleBodyResult([
      "<p>Message</p>",
      '<div class="email js-signatureMarker compact">',
      "<p>Signature</p>",
      "</div>",
    ].join(""));
    const hint = result.signatureHints[0];

    expect(hint).toMatchObject({ kind: "provider-container" });
    if (!hint || hint.kind !== "provider-container") {
      throw new Error("Expected a provider container hint.");
    }
    expect(result.sanitizedHtml.slice(hint.startOffset, hint.endOffset)).toBe(
      '<div class="email compact"><p>Signature</p></div>',
    );
    expect(result.sanitizedHtml).not.toContain("js-signatureMarker");
  });

  it("keeps hint offsets aligned with normalized article HTML", () => {
    const result = sanitizeZammadArticleBodyResult([
      " \n<p>Message</p><br />",
      '<div data-signature="true"><p>Signature</p></div>',
      " ",
    ].join(""));
    const hint = result.signatureHints[0];

    expect(result.sanitizedHtml.startsWith("<p>Message</p><br>")).toBe(true);
    if (!hint || hint.kind !== "provider-container") {
      throw new Error("Expected a provider container hint.");
    }
    expect(result.sanitizedHtml.slice(hint.startOffset, hint.endOffset)).toBe(
      "<div><p>Signature</p></div>",
    );
  });

  it("preserves explicit container provenance independently of its HTML tag", () => {
    const result = sanitizeZammadArticleBodyResult(
      '<p>Message</p><table data-signature="true"><tbody><tr><td>Signature</td></tr></tbody></table>',
    );
    const hint = result.signatureHints[0];

    expect(hint).toMatchObject({ kind: "provider-container" });
    if (!hint || hint.kind !== "provider-container") {
      throw new Error("Expected a provider container hint.");
    }
    expect(result.sanitizedHtml.slice(hint.startOffset, hint.endOffset)).toBe(
      "<table><tbody><tr><td>Signature</td></tr></tbody></table>",
    );
  });

  it("returns learned-line provenance separately from explicit markers", () => {
    const result = sanitizeZammadArticleBodyResult(
      "<p>Message</p><br><p>Signature</p>",
      { signatureDetectionLine: 1 },
    );

    expect(result.signatureHints).toEqual([
      {
        kind: "provider-learned-line",
        boundaryOffset: 18,
        line: 1,
      },
    ]);
  });

  it("does not accept forged reserved placeholder classes", () => {
    for (const forged of [
      "<span class=resolvrr-signature-hint-marker-0></span>",
      '<span class = "foo   resolvrr-signature-hint-container-start-4"></span>',
      "<span class = 'resolvrr-signature-hint-learned-2 bar'></span>",
    ]) {
      const html = `<p>Message</p>${forged}<p>Still authored content</p>`;
      const sanitized = sanitizeZammadArticleBodyResult(html);
      const normalized = normalizeZammadSignatureBodyResult(html);

      expect(sanitized.signatureHints).toEqual([]);
      expect(normalized.signatureHints).toEqual([]);
      expect(sanitized.sanitizedHtml).toContain("Still authored content");
      expect(normalized.html).toContain("Still authored content");
      expect(sanitized.sanitizedHtml).not.toContain(
        "data-resolvrr-signature-boundary",
      );
    }
  });

  it("keeps raw normalization distinct and preserves CID sources", () => {
    const result = normalizeZammadSignatureBodyResult(
      '<p>Message</p><img src="cid:logo@example"><span class="js-signatureMarker"></span><p>Signature</p>',
    );

    expect(result.html).toContain('src="cid:logo@example"');
    expect(result.html).toBe(
      '<p>Message</p><img src="cid:logo@example"><p>Signature</p>',
    );
    expect(result.signatureHints).toEqual([
      { kind: "provider-marker", boundaryOffset: 42 },
    ]);
    expect("sanitizedHtml" in result).toBe(false);
  });

  it("accepts only positive finite integer numbers as learned metadata", () => {
    const article = (value: unknown) =>
      ({
        id: 1,
        ticket_id: 2,
        internal: false,
        attachments: [],
        preferences: { signature_detection: value },
      }) as ZammadArticle;

    expect(zammadArticleSignatureDetectionLine(article(2))).toBe(2);
    expect(zammadArticleSignatureDetectionLine(article(true))).toBeUndefined();
    expect(zammadArticleSignatureDetectionLine(article("2"))).toBeUndefined();
    expect(zammadArticleSignatureDetectionLine(article(1.5))).toBeUndefined();
    expect(zammadArticleSignatureDetectionLine(article(Number.NaN)))
      .toBeUndefined();
    expect(zammadArticleSignatureDetectionLine(article(Number.POSITIVE_INFINITY)))
      .toBeUndefined();
  });

  it("maps structured provider hints onto the provider-neutral article", () => {
    const mapped = mapArticle({
      id: 10,
      ticket_id: 20,
      internal: false,
      attachments: [],
      body: [
        "<p>Authored message</p>",
        '<div data-signature="true"><p>Signature</p></div>',
      ].join(""),
    } as ZammadArticle);

    expect(mapped.signatureHints).toHaveLength(1);
    expect(mapped.signatureHints?.[0]).toMatchObject({
      kind: "provider-container",
    });
    const hint = mapped.signatureHints?.[0];
    if (!hint || hint.kind !== "provider-container") {
      throw new Error("Expected a mapped provider container hint.");
    }
    expect(mapped.sanitizedHtml.slice(hint.startOffset, hint.endOffset)).toBe(
      "<div><p>Signature</p></div>",
    );
  });
});
