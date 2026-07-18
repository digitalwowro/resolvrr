import { describe, expect, it } from "vitest";
import {
  customerReplyInput,
  normalizedReplyAddress,
  normalizedReplyRecipients,
} from "@/features/tickets/reply-input";

describe("provider-neutral contextual reply input", () => {
  it("normalizes, deduplicates, and gives To precedence over Cc", () => {
    expect(normalizedReplyRecipients(
      [" Customer@Example.com ", "customer@example.com"],
      ["CUSTOMER@example.com", " watcher@example.com "],
    )).toEqual({
      to: ["customer@example.com"],
      cc: ["watcher@example.com"],
    });
  });

  it("rejects invalid and control-character addresses", () => {
    expect(normalizedReplyAddress("not-an-email")).toBeUndefined();
    expect(normalizedReplyAddress("ok@example.com\r\nBcc: victim@example.com"))
      .toBeUndefined();
    expect(normalizedReplyRecipients([], [])).toBeUndefined();
  });

  it("has no application recipient-count ceiling", () => {
    const addresses = Array.from(
      { length: 600 },
      (_, index) => `recipient-${index}@example.com`,
    );
    expect(normalizedReplyRecipients(addresses, [])?.to).toHaveLength(600);
  });

  it("requires a source, version, intent, body, and recipient", () => {
    const base = {
      body: "Reply",
      bodyFormat: "html" as const,
      cc: [],
      contextVersion: "version",
      includeConversationHistory: false,
      intent: "reply",
      sourceArticleExternalId: "article-1",
      to: ["customer@example.com"],
    };
    expect(customerReplyInput(base)).toEqual(base);
    expect(customerReplyInput({ ...base, intent: "forward" })).toBeUndefined();
    expect(customerReplyInput({ ...base, to: [] })).toBeUndefined();
    expect(customerReplyInput({ ...base, contextVersion: "" })).toBeUndefined();
  });

  it("requires a reviewed context version when including conversation history", () => {
    const base = {
      body: "Reply",
      bodyFormat: "html" as const,
      cc: [],
      contextVersion: "reply-version",
      includeConversationHistory: true,
      intent: "reply",
      sourceArticleExternalId: "article-1",
      to: ["customer@example.com"],
    };

    expect(customerReplyInput(base)).toBeUndefined();
    expect(customerReplyInput({
      ...base,
      conversationHistoryContextVersion: "history-version",
      conversationHistoryScope: "through-source",
    })).toMatchObject({
      conversationHistoryContextVersion: "history-version",
      conversationHistoryScope: "through-source",
      includeConversationHistory: true,
    });
  });
});
