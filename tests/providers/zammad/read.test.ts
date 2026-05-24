import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProviderContext } from "@/core/providers";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";

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

function providerContext(): ProviderContext {
  return {
    connection: {
      id: "connection-1",
      providerKey: "zammad",
      displayName: "Support",
      baseUrl: "https://helpdesk.example.com",
      status: "active",
    },
    credentialScheme: "basic-auth",
    credentialPayload: { username: "agent", password: "secret" },
    requestSecurity: { validatedAddresses: ["93.184.216.34"] },
  };
}

const rawTicket = {
  id: 42,
  number: "42042",
  title: "Cannot log in",
  customer: "Maya Patel",
  owner: "Agent Smith",
  group: "Users",
  state: "open",
  priority: "3 high",
  created_at: "2026-05-22T10:00:00Z",
  updated_at: "2026-05-24T08:30:00Z",
  pending_time: null,
};

const rawArticle = {
  id: 500,
  ticket_id: 42,
  type: "email",
  sender: "Customer",
  internal: false,
  created_by: "Maya Patel",
  from: "maya@example.com",
  to: "support@example.com",
  cc: null,
  subject: "Cannot log in",
  body: "<p>Hello <script>alert(1)</script>there</p>",
  created_at: "2026-05-24T08:31:00Z",
  attachments: [],
};

describe("Zammad ticket reads", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("advertises only implemented read capabilities", () => {
    expect(zammadProviderPlugin.capabilities).toEqual([
      "ticket:list",
      "ticket:detail",
    ]);
  });

  it("maps Zammad list tickets to canonical list items", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: [rawTicket],
    });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      limit: 10,
      sort: { key: "updated_at", direction: "descending" },
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets?page=1&per_page=10&expand=true",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
          "User-Agent": "Resolvrr/1.0",
        }),
        maxResponseBytes: 2 * 1024 * 1024,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result?.tickets[0]).toMatchObject({
      externalId: "42",
      number: "42042",
      title: "Cannot log in",
      customer: { name: "Maya Patel", role: "customer" },
      owner: { name: "Agent Smith", role: "agent" },
      group: { name: "Users" },
      state: "open",
      priority: "high",
      tags: [],
      providerUrl: "https://helpdesk.example.com/#ticket/zoom/42",
    });
  });

  it("maps Zammad detail and thread without optional feature leakage", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [rawArticle],
      });

    const result = await zammadProviderPlugin.getTicketDetail?.(
      providerContext(),
      "42",
    );

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/ticket_articles/by_ticket/42?expand=true",
      expect.any(Object),
    );
    expect(result).toMatchObject({
      ticket: { externalId: "42", state: "open", priority: "high" },
      thread: {
        ticketExternalId: "42",
        articles: [
          {
            externalId: "500",
            kind: "message",
            visibility: "public",
            direction: "inbound",
            author: { name: "Maya Patel", role: "customer" },
          },
        ],
      },
      links: [],
      subscription: { supported: false, following: false },
    });
    expect(result?.thread.articles[0]?.sanitizedHtml).not.toContain("<script>");
  });

  it("classifies malformed provider read data as provider mismatch", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: { id: 42 },
    });

    await expect(
      zammadProviderPlugin.listTickets?.(providerContext(), {
        filter: {},
        limit: 10,
      }),
    ).rejects.toMatchObject({ kind: "provider-data-mismatch" });
  });
});
