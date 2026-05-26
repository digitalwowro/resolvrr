import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawArticle, rawTicket } from "./read-helpers";

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

describe("Zammad ticket reads", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("advertises implemented read and metadata mutation capabilities", () => {
    expect(zammadProviderPlugin.capabilities).toEqual([
      "ticket:list",
      "ticket:detail",
      "ticket:update-state",
      "ticket:update-priority",
    ]);
  });

  it("maps Zammad list tickets to canonical list items", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: [rawTicket],
    });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 10,
      sort: { key: "updatedAt", direction: "descending" },
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets?page=1&per_page=10&expand=true&full=true",
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
    expect(result?.loadedCount).toBe(1);
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "provider-list-request",
        providerKey: "zammad",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "provider-mapping-parsing",
        providerKey: "zammad",
        status: "ok",
      }),
    );
  });

  it("uses page cursors and reports the next ungrouped page cursor", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: [rawTicket],
    });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 1,
      cursor: "2",
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets?page=2&per_page=1&expand=true&full=true",
      expect.any(Object),
    );
    expect(result).toMatchObject({
      loadedCount: 1,
      nextCursor: "3",
    });
  });

  it("maps Zammad detail and thread without optional feature leakage", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
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
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/ticket_articles/by_ticket/42?expand=true&full=true",
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
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "detail",
        phase: "provider-detail-metadata-request",
        providerKey: "zammad",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "detail",
        phase: "provider-article-thread-request",
        providerKey: "zammad",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "detail",
        phase: "provider-mapping-parsing",
        providerKey: "zammad",
        status: "ok",
      }),
    );
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
        pageSize: 10,
      }),
    ).rejects.toMatchObject({ kind: "provider-data-mismatch" });
  });
});
