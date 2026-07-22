import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProviderRegistry } from "@/providers";
import { loadWorkspaceTicketList } from "@/features/tickets";
import {
  connection,
  encryptionKey,
  mockValidatedBaseUrl,
  provider,
  repository,
} from "./ticket-service-test-helpers";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

describe("ticket read service query handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("normalizes canonical list query and returns count and bucket metadata", async () => {
    const listTickets = vi.fn(async () => ({
      tickets: [],
      loadedCount: 0,
      totalCount: 12,
      buckets: [
        {
          key: "state" as const,
          value: "open",
          label: "Open",
          tickets: [],
          loadedCount: 0,
          totalCount: 12,
        },
      ],
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    }));

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:count",
            "ticket:sort",
            "ticket:group",
            "ticket:group-count",
          ],
          listTickets,
        }),
      ]),
      encryptionKey,
      "user-1",
      {
        filter: { states: ["open"] },
        pageSize: 5,
        cursor: "cursor-1",
        sort: { key: "priority", direction: "ascending" },
        count: { includeTotal: true },
        group: { key: "state" },
      },
    );

    expect(listTickets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        filter: { states: ["open"] },
        pageSize: 5,
        cursor: "cursor-1",
        sort: { key: "priority", direction: "ascending" },
        count: { includeTotal: true },
        group: { key: "state" },
      }),
    );
    expect(result).toMatchObject({
      status: "available",
      queryCapabilities: {
        totalCount: true,
        providerSort: true,
        providerGrouping: true,
        groupedTotalCount: true,
        fullTextSearch: false,
        maxPageSize: 100,
        unsupportedCombinations: [],
      },
      loadedCount: 0,
      totalCount: 12,
      buckets: [{ key: "state", value: "open", totalCount: 12 }],
    });
  });

  it("requests provider totals automatically for ungrouped count-capable lists", async () => {
    const listTickets = vi.fn(async () => ({
      tickets: [],
      loadedCount: 0,
      totalCount: 42,
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    }));

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail", "ticket:count"],
          listTickets,
        }),
      ]),
      encryptionKey,
      "user-1",
    );

    expect(listTickets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ count: { includeTotal: true } }),
    );
    expect(result).toMatchObject({
      status: "available",
      loadedCount: 0,
      totalCount: 42,
    });
  });

  it("returns an unsupported query state before calling providers without query capabilities", async () => {
    const listTickets = vi.fn(provider().listTickets);

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
      { count: { includeTotal: true } },
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "unsupported-query",
      queryRejection: { kind: "count-unsupported" },
    });
    expect(listTickets).not.toHaveBeenCalled();
  });

  it("constrains oversized page requests before provider dispatch", async () => {
    const listTickets = vi.fn(provider().listTickets);

    await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
      { pageSize: 500 },
    );

    expect(listTickets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ pageSize: 100 }),
    );
  });

  it("dispatches only canonical list query fields to provider plugins", async () => {
    const listTickets = vi.fn(provider().listTickets);

    await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
      {
        pageSize: 10,
        zammadQuery: "state.name:open",
        rawProviderParams: { state_id: 2 },
      } as unknown as Parameters<typeof loadWorkspaceTicketList>[4],
    );

    const dispatchedQuery = listTickets.mock.calls[0]?.[1];

    expect(dispatchedQuery).toEqual({
      filter: {},
      pageSize: 10,
      sort: { key: "updatedAt", direction: "descending" },
    });
    expect("zammadQuery" in dispatchedQuery).toBe(false);
    expect("rawProviderParams" in dispatchedQuery).toBe(false);
  });
});
