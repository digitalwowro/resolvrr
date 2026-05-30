import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;

    constructor(reason: string, message: string) {
      super(message);
      this.name = "ProviderJsonBodyError";
      this.reason = reason;
    }
  },
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);

describe("Zammad internal note mutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates an internal plain-text note article for the ticket", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 201,
      headers: new Headers(),
      data: {
        id: 77,
        ticket_id: 42,
        type: "note",
        sender: "Agent",
        internal: true,
        body: "Checked the logs.",
        created_at: "2026-05-30T12:00:00.000Z",
        attachments: [],
      },
    });

    await zammadProviderPlugin.addTicketInternalNote?.(
      providerContext(),
      "42",
      { body: "  Checked the logs.  " },
    );

    expect(mockedSafeProviderJson).toHaveBeenCalledOnce();
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/ticket_articles",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        body: JSON.stringify({
          ticket_id: 42,
          subject: "Internal note",
          body: "Checked the logs.",
          content_type: "text/plain",
          type: "note",
          internal: true,
          sender: "Agent",
        }),
        method: "POST",
      }),
    );
  });

  it("rejects invalid ticket references before provider I/O", async () => {
    await expect(
      zammadProviderPlugin.addTicketInternalNote?.(
        providerContext(),
        "ticket-42",
        { body: "Checked the logs." },
      ),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).not.toHaveBeenCalled();
  });
});
