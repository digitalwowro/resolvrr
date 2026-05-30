import { describe, expect, it } from "vitest";
import { ticketInternalNoteActionInput } from "@/features/tickets/communication-action-input";

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
      input: { body: "Checked the logs." },
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
