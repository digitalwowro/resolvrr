import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawTicket } from "./read-helpers";

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

describe("Zammad ticket article mutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates an internal plain-text note article for the ticket", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    }).mockResolvedValueOnce({
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

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(2);
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

  it("creates an internal html note article for rich staged comments", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    }).mockResolvedValueOnce({
      status: 201,
      headers: new Headers(),
      data: {
        id: 77,
        ticket_id: 42,
        type: "note",
        sender: "Agent",
        internal: true,
        body: "<p><strong>Checked</strong> the logs.</p>",
        created_at: "2026-05-30T12:00:00.000Z",
        attachments: [],
      },
    });

    await zammadProviderPlugin.addTicketInternalNote?.(
      providerContext(),
      "42",
      {
        body: "  <p><strong>Checked</strong> the logs.</p>  ",
        bodyFormat: "html",
      },
    );

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/ticket_articles",
      expect.objectContaining({
        body: JSON.stringify({
          ticket_id: 42,
          subject: "Internal note",
          body: "<p><strong>Checked</strong> the logs.</p>",
          content_type: "text/html",
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

  it("does not POST an internal note to a merged ticket", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: { ...rawTicket, state: "merged" },
    });

    await expect(
      zammadProviderPlugin.addTicketInternalNote?.(
        providerContext(),
        "42",
        { body: "Do not save this." },
      ),
    ).rejects.toMatchObject({ diagnosticCode: "ticket-merged" });
    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(1);
  });

  it("does not create a customer reply without a safe customer recipient", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 42,
          number: "42042",
          title: "Cannot log in",
          customer: "Maya Patel",
          updated_at: "2026-05-24T08:30:00Z",
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 1, ticket_id: 42, type: "email", sender: "Customer",
          internal: false, from: null, to: "support@example.com", attachments: [],
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [{ email: "support@example.com", active: true }],
      });

    await expect(
      zammadProviderPlugin.addTicketCustomerReply?.(
        providerContext(),
        "42",
        {
          body: "Thanks for the report.", cc: [], contextVersion: "v1",
          intent: "reply", sourceArticleExternalId: "1", to: ["customer@example.com"],
        },
      ),
    ).rejects.toMatchObject({
      kind: "provider-data-mismatch",
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid customer reply ticket references before provider I/O", async () => {
    await expect(
      zammadProviderPlugin.addTicketCustomerReply?.(
        providerContext(),
        "ticket-42",
        {
          body: "Thanks for the report.", cc: [], contextVersion: "v1",
          intent: "reply", sourceArticleExternalId: "1", to: ["customer@example.com"],
        },
      ),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).not.toHaveBeenCalled();
  });
});
