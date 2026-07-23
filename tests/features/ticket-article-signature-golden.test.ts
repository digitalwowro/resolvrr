import { describe, expect, it } from "vitest";
import {
  visibleTicketArticleMessageHtml,
} from "@/core/ticket-article-content";
import {
  trimArticleBodyHtml,
} from "@/features/workspace/components/ticket-article-body-trim";
import {
  materializeSignatureGoldenFixture,
  signatureGoldenFixtures,
} from "./ticket-article-signature-golden-fixtures";
import {
  signatureFailOpenFixtures,
} from "./ticket-article-signature-golden-fail-open-fixtures";

describe("redacted article signature golden corpus", () => {
  for (const fixture of signatureGoldenFixtures) {
    it(`preserves the known boundary: ${fixture.name}`, () => {
      const { hint, html } = materializeSignatureGoldenFixture(fixture);
      const options = {
        signatureHints: hint ? [hint] : [],
      };
      const result = trimArticleBodyHtml(html, options);

      expect(result.collapsed).toBe(true);
      if (!result.collapsed) return;
      expect(visibleTicketArticleMessageHtml(html, options)).toBe(
        result.visibleHtml,
      );
      expect(result.hiddenKind).toBe(fixture.expected.hiddenKind);
      for (const expected of fixture.expected.visibleContains) {
        expect(result.visibleHtml).toContain(expected);
      }
      for (const hidden of fixture.expected.hiddenContains ?? []) {
        expect(result.visibleHtml).not.toContain(hidden);
        expect(result.hiddenHtml).toContain(hidden);
      }
    });
  }

  for (const fixture of signatureFailOpenFixtures) {
    it(`fails open: ${fixture.name}`, () => {
      const { hint, html } = materializeSignatureGoldenFixture(fixture);
      const options = {
        signatureHints: hint ? [hint] : [],
      };
      const result = trimArticleBodyHtml(html, options);

      expect(result.collapsed).toBe(false);
      expect(visibleTicketArticleMessageHtml(html, options)).toBe(
        result.visibleHtml,
      );
      for (const expected of fixture.expected.visibleContains) {
        expect(result.visibleHtml).toContain(expected);
      }
    });
  }

  it("strips a validated short signature from history without a disclosure", () => {
    const signature = "<p>Short footer.</p>";
    const html = `<p>Short authored message.</p>${signature}`;
    const boundaryOffset = html.indexOf(signature);
    const options = {
      signatureHints: [{
        boundaryOffset,
        kind: "provider-marker" as const,
      }],
    };
    const result = trimArticleBodyHtml(html, options);
    const history = visibleTicketArticleMessageHtml(html, options);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Short footer");
    expect(history).toContain("Short authored message");
    expect(history).not.toContain("Short footer");
  });

  it("refines a provider container that also wraps quoted history", () => {
    const containerStart = "<div>";
    const html = [
      "<p>Hello recipient,</p>",
      containerStart,
      "<p>The requested account change is complete.</p>",
      "<p>Please confirm that the result is correct.</p>",
      "<table><tr><td><strong>Example Agent</strong><br>",
      '<a href="mailto:agent@example.test">agent@example.test</a>',
      "</td></tr></table>",
      '<blockquote type="cite"><p>Earlier conversation context.</p></blockquote>',
      "</div>",
    ].join("");
    const startOffset = html.indexOf(containerStart);
    const result = trimArticleBodyHtml(html, {
      signatureHints: [{
        endOffset: html.length,
        kind: "provider-container",
        startOffset,
      }],
    });

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("account change is complete");
    expect(result.visibleHtml).toContain("result is correct");
    expect(result.visibleHtml).not.toContain("Example Agent");
    expect(result.hiddenHtml).toContain("Earlier conversation context");
  });

  it("does not trust an overbroad container after substantive content", () => {
    const containerStart = "<div>";
    const html = [
      "<p>The initial validation completed successfully.</p>",
      containerStart,
      "<p>The production record still requires a manual review.</p>",
      "<p>Do not close the request until the owner confirms the values.</p>",
      "<p>Please reply with the final approval identifier.</p>",
      "</div>",
    ].join("");
    const startOffset = html.indexOf(containerStart);
    const options = {
      signatureHints: [{
        endOffset: html.length,
        kind: "provider-container" as const,
        startOffset,
      }],
    };
    const result = trimArticleBodyHtml(html, options);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("manual review");
    expect(result.visibleHtml).toContain("final approval identifier");
    expect(visibleTicketArticleMessageHtml(html, options)).toBe(
      result.visibleHtml,
    );
  });

  it("prefers a validated provider marker over an earlier delimiter-like line", () => {
    const signature = [
      "<p>Example Agent<br>",
      "Customer Operations<br>",
      "agent@example.test<br>",
      "company.example.test</p>",
    ].join("");
    const html = [
      "<p>The migration details are listed below.</p>",
      "<p>--</p>",
      "<p>This separator is part of the authored message.</p>",
      signature,
    ].join("");
    const boundaryOffset = html.indexOf(signature);
    const result = trimArticleBodyHtml(html, {
      signatureHints: [{
        boundaryOffset,
        kind: "provider-marker",
      }],
    });

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("separator is part");
    expect(result.visibleHtml).not.toContain("Example Agent");
  });

  it("fails open when a provider marker leaves only a two-line greeting", () => {
    const authoredReply = [
      "<p>Datele actualizate sunt incluse în solicitare.</p>",
      "<p>Verificați valorile înainte de aprobarea finală.</p>",
      "<p>Confirmați când revizuirea este completă.</p>",
    ].join("");
    const html = `<p>Bună,</p><p>Don,</p>${authoredReply}`;
    const boundaryOffset = html.indexOf(authoredReply);
    const options = {
      signatureHints: [{
        boundaryOffset,
        kind: "provider-marker" as const,
      }],
    };
    const result = trimArticleBodyHtml(html, options);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Datele actualizate");
    expect(visibleTicketArticleMessageHtml(html, options)).toBe(
      result.visibleHtml,
    );
  });

  it("collapses an image-only signature behind a validated marker", () => {
    const signature = '<p><img src="/inline/company-logo" alt=""></p>';
    const html = [
      "<p>The requested change has been completed successfully.</p>",
      signature,
    ].join("");
    const result = trimArticleBodyHtml(html, {
      signatureHints: [{
        boundaryOffset: html.indexOf(signature),
        kind: "provider-marker",
      }],
    });

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("completed successfully");
    expect(result.visibleHtml).not.toContain("company-logo");
    expect(result.hiddenHtml).toContain("company-logo");
  });
});
