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

  it("advertises implemented read and metadata mutation capabilities", () => {
    expect(zammadProviderPlugin.capabilities).toEqual([
      "ticket:list",
      "ticket:count",
      "ticket:sort",
      "ticket:group",
      "ticket:group-count",
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
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=10&expand=true&full=true&query=*&sort_by=updated_at&order_by=desc",
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
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=25&expand=true&full=true&query=*&with_total_count=true",
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
        data: [{ id: 2, name: "open" }],
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
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=10&expand=true&full=true&query=state.name%3A%22open%22&with_total_count=true",
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
