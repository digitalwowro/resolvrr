import { describe, expect, it } from "vitest";
import {
  zammadReplyConversationHistoryContext,
  zammadReplyConversationHistoryHtml,
} from "@/providers/zammad/reply-conversation-history";
import type { ZammadArticle } from "@/providers/zammad/schemas";

function article(
  id: number,
  overrides: Partial<ZammadArticle> = {},
): ZammadArticle {
  return {
    attachments: [],
    body: `<p>Public message ${id}</p>`,
    created_at: `2026-07-${String(id).padStart(2, "0")}T08:00:00Z`,
    created_by: {
      email: `person-${id}@example.com`,
      fullname: `Person ${id}`,
      id,
    },
    from: `Person ${id} <person-${id}@example.com>`,
    id,
    internal: false,
    sender: id % 2 ? "Customer" : "Agent",
    ticket_id: 42,
    to: "support@example.com",
    type: "email",
    ...overrides,
  };
}

describe("Zammad reply conversation history", () => {
  it("versions only public customer and agent communications", () => {
    const publicArticles = [article(2), article(1)];
    const internal = article(3, { internal: true, sender: "Agent" });
    const system = article(4, { sender: "System", type: "note" });
    const first = zammadReplyConversationHistoryContext([
      internal,
      ...publicArticles,
      system,
    ]);

    expect(first?.messageCount).toBe(2);
    expect(zammadReplyConversationHistoryContext([
      ...publicArticles,
      article(3, { internal: true, body: "<p>Changed privately</p>" }),
    ])?.contextVersion).toBe(first?.contextVersion);
    expect(zammadReplyConversationHistoryContext([
      article(2, { body: "<p>Changed publicly</p>" }),
      article(1),
    ])?.contextVersion).not.toBe(first?.contextVersion);
  });

  it("fails closed when Zammad omits article visibility", () => {
    const untrusted = article(11);
    delete (untrusted as Partial<ZammadArticle>).internal;
    expect(zammadReplyConversationHistoryContext([untrusted])).toBeUndefined();
  });

  it("bounds contextual history at its source while current history reaches now", () => {
    const newest = article(3);
    const source = article(2);
    const oldest = article(1);
    const articles = [oldest, newest, source];
    const contextual = zammadReplyConversationHistoryContext(
      articles,
      "through-source",
      source.id,
    );
    const current = zammadReplyConversationHistoryContext(
      articles,
      "current",
    );
    const contextualHtml = zammadReplyConversationHistoryHtml({
      articles,
      inlineImages: new Map(),
      scope: "through-source",
      sourceArticleId: source.id,
    });

    expect(contextual).toMatchObject({
      messageCount: 2,
      scope: "through-source",
    });
    expect(current).toMatchObject({ messageCount: 3, scope: "current" });
    expect(contextual?.contextVersion).not.toBe(current?.contextVersion);
    expect(contextualHtml).toContain("Public message 2");
    expect(contextualHtml).toContain("Public message 1");
    expect(contextualHtml).not.toContain("Public message 3");
  });

  it("builds a newest-first transcript without nested quotes, signatures, or internal notes", () => {
    const latest = article(2, {
      attachments: [{
        filename: "invoice.pdf",
        id: 22,
        preferences: { "Content-Type": "application/pdf" },
        size: 120,
      }],
      body: [
        "<p>Latest public answer</p>",
        '<span class="js-signatureMarker"></span>',
        "<div>Agent signature</div>",
      ].join(""),
    });
    const older = article(1, {
      body: "<p>Original request</p><blockquote type=\"cite\"><p>Duplicated quote</p></blockquote>",
    });
    const html = zammadReplyConversationHistoryHtml({
      articles: [
        older,
        article(3, { body: "<p>Private investigation</p>", internal: true }),
        latest,
      ],
      inlineImages: new Map(),
    });

    expect(html).toContain("Conversation history");
    expect(html.indexOf("Latest public answer")).toBeLessThan(
      html.indexOf("Original request"),
    );
    expect(html).toContain("Attachments:</strong> invoice.pdf");
    expect(html).not.toContain("Agent signature");
    expect(html).not.toContain("Duplicated quote");
    expect(html).not.toContain("Private investigation");
  });

  it("preserves bounded inline images supplied by the provider loader", () => {
    const source = article(1, {
      attachments: [{
        filename: "diagram.png",
        id: 91,
        preferences: {
          "Content-ID": "<diagram@example>",
          "Content-Type": "image/png",
        },
        size: 3,
      }],
      body: '<p>See below</p><img src="cid:diagram@example">',
    });
    const html = zammadReplyConversationHistoryHtml({
      articles: [source],
      inlineImages: new Map([["1:91", "data:image/png;base64,AQID"]]),
    });

    expect(html).toContain('src="data:image/png;base64,AQID"');
    expect(html).not.toContain("Attachments:");
  });
});
