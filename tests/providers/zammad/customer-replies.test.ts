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

describe("Zammad customer reply article mutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a public email reply article for the ticket", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 42,
          number: "42042",
          title: "Cannot log in",
          customer_id: 10,
          customer: "Maya Patel",
          updated_at: "2026-05-24T08:30:00Z",
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 10,
          firstname: "Maya",
          lastname: "Patel",
          email: "maya@example.com",
        },
      })
      .mockResolvedValueOnce({
        status: 201,
        headers: new Headers(),
        data: {
          id: 78,
          ticket_id: 42,
          type: "email",
          sender: "Agent",
          internal: false,
          to: "Maya Patel <maya@example.com>",
          body: "Thanks for the report.",
          created_at: "2026-05-30T12:00:00.000Z",
          attachments: [],
        },
      });

    await zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      { body: "  Thanks for the report.  " },
    );

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(3);
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/users/10",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/ticket_articles",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        body: JSON.stringify({
          ticket_id: 42,
          to: "Maya Patel <maya@example.com>",
          subject: "Customer reply",
          body: "Thanks for the report.",
          content_type: "text/plain",
          type: "email",
          internal: false,
          sender: "Agent",
        }),
        method: "POST",
      }),
    );
  });

  it("creates a public html email reply article for rich staged replies", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 42,
          number: "42042",
          title: "Cannot log in",
          customer_id: 10,
          customer: "Maya Patel",
          updated_at: "2026-05-24T08:30:00Z",
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 10,
          firstname: "Maya",
          lastname: "Patel",
          email: "maya@example.com",
        },
      })
      .mockResolvedValueOnce({
        status: 201,
        headers: new Headers(),
        data: {
          id: 78,
          ticket_id: 42,
          type: "email",
          sender: "Agent",
          internal: false,
          to: "Maya Patel <maya@example.com>",
          body: '<p>See <a href="https://example.com/docs">docs</a>.</p>',
          created_at: "2026-05-30T12:00:00.000Z",
          attachments: [],
        },
      });

    await zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      {
        body: '  <p>See <a href="https://example.com/docs">docs</a>.</p>  ',
        bodyFormat: "html",
      },
    );

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/ticket_articles",
      expect.objectContaining({
        body: JSON.stringify({
          ticket_id: 42,
          to: "Maya Patel <maya@example.com>",
          subject: "Customer reply",
          body: '<p>See <a href="https://example.com/docs">docs</a>.</p>',
          content_type: "text/html",
          type: "email",
          internal: false,
          sender: "Agent",
        }),
        method: "POST",
      }),
    );
  });
});
