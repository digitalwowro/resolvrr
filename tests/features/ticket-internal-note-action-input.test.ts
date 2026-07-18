import { describe, expect, it } from "vitest";
import {
  ticketCustomerReplyActionInput,
  ticketInternalNoteActionInput,
} from "@/features/tickets/communication-action-input";

describe("ticket internal note action input", () => {
  it("trims the ticket id and note body", () => {
    expect(
      ticketInternalNoteActionInput({
        ticketExternalId: " ticket-1 ",
        body: "  Checked the logs.  ",
      }),
    ).toEqual({
      status: "valid",
      ticketExternalId: "ticket-1",
      input: { body: "Checked the logs.", bodyFormat: "plain" },
    });
  });

  it("rejects empty notes and unsupported payload keys", () => {
    expect(
      ticketInternalNoteActionInput({
        ticketExternalId: "ticket-1",
        body: "   ",
      }),
    ).toEqual({ status: "invalid" });

    expect(
      ticketInternalNoteActionInput({
        ticketExternalId: "ticket-1",
        body: "Checked the logs.",
        publicReply: true,
      }),
    ).toEqual({ status: "invalid" });
  });
});

describe("ticket customer reply action input", () => {
  it("trims the ticket id and reply body", () => {
    expect(
      ticketCustomerReplyActionInput({
        ticketExternalId: " ticket-1 ",
        body: "  Thanks for the report.  ",
        cc: ["Watcher@Example.com"],
        contextVersion: "context-v1",
        intent: "reply-all",
        sourceArticleExternalId: "article-1",
        to: ["Customer@Example.com"],
      }),
    ).toEqual({
      status: "valid",
      ticketExternalId: "ticket-1",
      input: {
        body: "Thanks for the report.",
        bodyFormat: "plain",
        cc: ["watcher@example.com"],
        contextVersion: "context-v1",
        includeConversationHistory: false,
        intent: "reply-all",
        sourceArticleExternalId: "article-1",
        to: ["customer@example.com"],
      },
    });
  });

  it("rejects empty replies and unsupported payload keys", () => {
    expect(
      ticketCustomerReplyActionInput({
        ticketExternalId: "ticket-1",
        body: "   ",
      }),
    ).toEqual({ status: "invalid" });

    expect(
      ticketCustomerReplyActionInput({
        ticketExternalId: "ticket-1",
        body: "Thanks for the report.",
        internal: false,
      }),
    ).toEqual({ status: "invalid" });
  });
});
