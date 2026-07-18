import { describe, expect, it } from "vitest";
import { ticketMetadataMutationActionInput } from "@/features/tickets/metadata-action-input";

describe("selected ticket communication input", () => {
  it("parses exactly one discriminated internal comment", () => {
    expect(ticketMetadataMutationActionInput({
      communication: { body: "  Checked the logs.  ", kind: "internal-comment" },
      ticketExternalId: "ticket-1",
    })).toMatchObject({
      communication: {
        body: "Checked the logs.",
        bodyFormat: "plain",
        kind: "internal-comment",
      },
      field: "communication",
      input: {},
      status: "valid",
      ticketExternalId: "ticket-1",
    });
  });

  it("parses, sanitizes, and normalizes a contextual customer reply", () => {
    const result = ticketMetadataMutationActionInput({
      communication: {
        bodyFormat: "html",
        body: '<div>See <a href="https://example.com/docs">docs</a>.</div>',
        cc: [" Watcher@Example.com ", "customer@example.com"],
        conversationHistoryContextVersion: "history-v1",
        conversationHistoryScope: "through-source",
        contextVersion: "context-v1",
        includeConversationHistory: true,
        intent: "reply-all",
        kind: "customer-reply",
        sourceArticleExternalId: "article-1",
        to: [" Customer@Example.com "],
      },
      ticketExternalId: "ticket-1",
    });
    expect(result).toMatchObject({
      communication: {
        body: '<p>See <a href="https://example.com/docs" rel="noreferrer noopener" target="_blank">docs</a>.</p>',
        bodyFormat: "html",
        cc: ["watcher@example.com"],
        conversationHistoryContextVersion: "history-v1",
        conversationHistoryScope: "through-source",
        contextVersion: "context-v1",
        includeConversationHistory: true,
        intent: "reply-all",
        kind: "customer-reply",
        sourceArticleExternalId: "article-1",
        to: ["customer@example.com"],
      },
      field: "communication",
      input: {},
      status: "valid",
      ticketExternalId: "ticket-1",
    });
  });

  it("keeps malformed script fragments out of rich communication html", () => {
    const result = ticketMetadataMutationActionInput({
      communication: {
        bodyFormat: "html",
        body: "<p>Checked <scrip<script>alert(1)</script>t>bad</script></p>",
        kind: "internal-comment",
      },
      ticketExternalId: "ticket-1",
    });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("Expected valid input");
    expect(result.communication?.body).toBe("<p>Checked alert(1)t&gt;bad</p>");
    expect(result.communication?.body).not.toContain("<script");
  });

  it("preserves only canonical provider-neutral mention markers", () => {
    const result = ticketMetadataMutationActionInput({
      communication: {
        bodyFormat: "html",
        body:
          '<p><span onclick="steal()" data-resolvrr-mention-id="4">Manuela Duma</span> and <span data-resolvrr-mention-id="../../bad">Unknown</span></p>',
        kind: "internal-comment",
      },
      ticketExternalId: "ticket-1",
    });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("Expected valid input");
    expect(result.communication?.body).toBe(
      '<p><span contenteditable="false" data-resolvrr-mention-id="4">Manuela Duma</span> and Unknown</p>',
    );
  });

  it("parses a forward with empty introduction but reviewed provider-neutral context", () => {
    expect(ticketMetadataMutationActionInput({
      communication: {
        attachmentExternalIds: ["91", "91"],
        body: "",
        cc: ["Watcher@Example.com"],
        conversationHistoryContextVersion: "history-v1",
        conversationHistoryScope: "through-source",
        contextVersion: "forward-v1",
        includeConversationHistory: true,
        kind: "customer-forward",
        sourceArticleExternalId: "500",
        subject: "Original subject",
        to: ["Customer@Example.com"],
      },
      ticketExternalId: "ticket-1",
    })).toMatchObject({
      communication: {
        attachmentExternalIds: ["91"], body: "", cc: ["watcher@example.com"],
        conversationHistoryContextVersion: "history-v1",
        conversationHistoryScope: "through-source",
        contextVersion: "forward-v1", includeConversationHistory: true,
        kind: "customer-forward", sourceArticleExternalId: "500",
        subject: "Original subject", to: ["customer@example.com"],
      },
      status: "valid",
    });
  });

  it("rejects forward Bcc, control-character subjects, and arbitrary attachment references", () => {
    const base = {
      attachmentExternalIds: ["91"], body: "", cc: [], contextVersion: "v1",
      includeConversationHistory: true, kind: "customer-forward", sourceArticleExternalId: "500",
      subject: "Subject", to: ["customer@example.com"],
    };
    for (const communication of [
      { ...base, bcc: ["hidden@example.com"] },
      { ...base, subject: "Subject\r\nBcc: hidden@example.com" },
      { ...base, attachmentExternalIds: ["https://example.com/file"] },
    ]) {
      expect(ticketMetadataMutationActionInput({ communication, ticketExternalId: "ticket-1" }))
        .toEqual({ status: "invalid", field: "communication" });
    }
  });

  it("rejects Bcc and fields from the other communication variant", () => {
    expect(ticketMetadataMutationActionInput({
      communication: {
        body: "Reply", bcc: ["hidden@example.com"], cc: [],
        contextVersion: "v1", intent: "reply", kind: "customer-reply",
        sourceArticleExternalId: "article-1", to: ["customer@example.com"],
      },
      ticketExternalId: "ticket-1",
    })).toEqual({ status: "invalid", field: "communication" });
    expect(ticketMetadataMutationActionInput({
      communication: {
        body: "Comment", kind: "internal-comment", to: ["customer@example.com"],
      },
      ticketExternalId: "ticket-1",
    })).toEqual({ status: "invalid", field: "communication" });
  });

  it("rejects conversation history without a reviewed history context", () => {
    expect(ticketMetadataMutationActionInput({
      communication: {
        body: "Reply",
        cc: [],
        contextVersion: "v1",
        includeConversationHistory: true,
        intent: "reply",
        kind: "customer-reply",
        sourceArticleExternalId: "article-1",
        to: ["customer@example.com"],
      },
      ticketExternalId: "ticket-1",
    })).toEqual({ status: "invalid", field: "communication" });
  });
});
