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

describe("Zammad ticket reads", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("advertises implemented read, mutation, and communication capabilities", () => {
    expect(zammadProviderPlugin.capabilities).toEqual([
      "ticket:list",
      "ticket:count",
      "ticket:sort",
      "ticket:group",
      "ticket:group-count",
      "ticket:detail",
      "ticket:links",
      "ticket:subscription",
      "ticket:update-state",
      "ticket:update-priority",
      "ticket:update-owner",
      "ticket:update-group",
      "ticket:update-tags",
      "ticket:update-links",
      "ticket:update-link-relations",
      "ticket:update-subscription",
      "ticket:add-internal-note",
      "ticket:add-customer-reply",
      "lookup:link-targets",
      "lookup:assignable-users",
      "lookup:current-user",
      "lookup:groups",
      "lookup:tags",
      "notifications:list",
      "notifications:mark-read",
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
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=10&expand=true&full=true&query=NOT+%28state.name%3A%22merged%22%29",
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

  it("defensively omits merged tickets from provider list payloads", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: [rawTicket, { ...rawTicket, id: 43, state: "merged" }],
    });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 10,
    });

    expect(result?.tickets.map((ticket) => ticket.externalId)).toEqual(["42"]);
    expect(result?.loadedCount).toBe(1);
  });

  it("uses the Zammad search endpoint for provider-backed sorting", async () => {
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
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=10&expand=true&full=true&query=NOT+%28state.name%3A%22merged%22%29&sort_by=updated_at&order_by=desc",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
          "User-Agent": "Resolvrr/1.0",
        }),
      }),
    );
    expect(result?.tickets[0]?.externalId).toBe("42");
  });

  it("requests and maps Zammad search total counts when requested", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: {
        record_ids: [42],
        total_count: 216,
        assets: { Ticket: { "42": rawTicket } },
      },
    });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 25,
      count: { includeTotal: true },
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=25&expand=true&full=true&query=NOT+%28state.name%3A%22merged%22%29&with_total_count=true",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
          "User-Agent": "Resolvrr/1.0",
        }),
      }),
    );
    expect(result).toMatchObject({
      loadedCount: 1,
      totalCount: 216,
      nextCursor: "2",
    });
  });

  it("omits the next cursor when a count proves the current page is complete", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: {
        record_ids: [42],
        total_count: 1,
        assets: { Ticket: { "42": rawTicket } },
      },
    });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 1,
      count: { includeTotal: true },
    });

    expect(result?.loadedCount).toBe(1);
    expect(result?.totalCount).toBe(1);
    expect(result?.nextCursor).toBeUndefined();
  });

  it("returns provider-backed state buckets with full bucket counts", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          { id: 1, name: "merged" },
          { id: 2, name: "open" },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          record_ids: [42],
          total_count: 11,
          assets: { Ticket: { "42": rawTicket } },
        },
      });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: { states: ["open"] },
      pageSize: 10,
      count: { includeTotal: true },
      group: { key: "state" },
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/ticket_states",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=10&expand=true&full=true&query=%28state.name%3A%22open%22%29+AND+NOT+%28state.name%3A%22merged%22%29&with_total_count=true",
      expect.any(Object),
    );
    expect(result).toMatchObject({
      loadedCount: 1,
      totalCount: 11,
      buckets: [
        {
          key: "state",
          value: "open",
          label: "Open",
          loadedCount: 1,
          totalCount: 11,
          nextCursor: "2",
        },
      ],
    });
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
