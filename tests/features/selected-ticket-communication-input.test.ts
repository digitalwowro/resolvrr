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
        contextVersion: "context-v1",
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
        contextVersion: "context-v1",
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
});
