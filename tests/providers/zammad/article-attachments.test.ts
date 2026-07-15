import { describe, expect, it } from "vitest";
import { classifyZammadArticleAttachments } from "@/providers/zammad/article-attachments";
import type { ZammadArticle } from "@/providers/zammad/schemas";

function article(overrides: Partial<ZammadArticle> = {}): ZammadArticle {
  return {
    attachments: [],
    body: "<p>Message</p>",
    created_at: "2026-07-14T08:31:00Z",
    id: 500,
    internal: false,
    sender: "Agent",
    ticket_id: 42,
    type: "email",
    ...overrides,
  };
}

function attachment(
  id: number,
  preferences: Record<string, unknown> = {},
) {
  return {
    id,
    filename: `file-${id}.png`,
    preferences,
    size: 4,
  };
}

describe("Zammad article attachment visibility", () => {
  it("hides a raw CID image while keeping an unreferenced inline-disposition file", () => {
    const referenced = attachment(91, {
      "Content-Disposition": "inline",
      "Content-ID": "<logo@example>",
      "Content-Type": "image/png",
    });
    const unreferenced = attachment(92, {
      "Content-Disposition": "inline",
      "Content-ID": "<other@example>",
      "Content-Type": "image/png",
    });
    const result = classifyZammadArticleAttachments(article({
      attachments: [referenced, unreferenced],
      body: '<p>Message</p><img src="cid:logo@example">',
    }));

    expect(result.inline).toEqual([referenced]);
    expect(result.visible).toEqual([unreferenced]);
  });

  it("hides an attachment referenced by Zammad's transformed inline URL", () => {
    const inline = attachment(91, {
      "Content-Disposition": "inline",
      "Content-ID": "<logo@example>",
    });
    const visible = attachment(92);
    const result = classifyZammadArticleAttachments(article({
      attachments: [inline, visible],
      body: '<img src="/api/v1/ticket_attachment/42/500/91?view=inline">',
    }));

    expect(result.inline).toEqual([inline]);
    expect(result.visible).toEqual([visible]);
  });

  it("does not hide lookalike URLs for another article or without inline disposition", () => {
    const first = attachment(91);
    const second = attachment(92);
    const result = classifyZammadArticleAttachments(article({
      attachments: [first, second],
      body: [
        '<img src="/api/v1/ticket_attachment/42/999/91?view=inline">',
        '<img src="/api/v1/ticket_attachment/42/500/92">',
      ].join(""),
    }));

    expect(result.inline).toEqual([]);
    expect(result.visible).toEqual([first, second]);
  });

  it("separates content alternatives before evaluating inline references", () => {
    const alternative = attachment(91, {
      "Content-ID": "<alternative@example>",
      "content-alternative": true,
    });
    const result = classifyZammadArticleAttachments(article({
      attachments: [alternative],
      body: '<img src="cid:alternative@example">',
    }));

    expect(result.alternatives).toEqual([alternative]);
    expect(result.inline).toEqual([]);
    expect(result.visible).toEqual([]);
  });

  it("does not infer inline content from filenames, MIME types, or disposition alone", () => {
    const signatureNamed = {
      ...attachment(91, {
        "Content-Disposition": "inline",
        "Content-ID": "<signature@example>",
        "Content-Type": "image/jpeg",
      }),
      filename: "signature-logo.jpeg",
    };

    expect(classifyZammadArticleAttachments(article({
      attachments: [signatureNamed],
    })).visible).toEqual([signatureNamed]);
  });
});
