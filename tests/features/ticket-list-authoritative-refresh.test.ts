import { describe, expect, it, vi } from "vitest";
import { refreshAuthoritativeTicketList } from "@/features/workspace/components/ticket-list-authoritative-refresh";
import { highRow, row } from "./ticket-workspace-test-utils";

describe("authoritative ticket-list refresh", () => {
  it("re-fetches every loaded page of an expanded provider group", async () => {
    const secondHighRow = {
      ...highRow,
      id: "ticket-3",
      number: "#1003",
      title: "Second high-priority ticket",
    };
    const load = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow, row],
        loadedCount: 2,
        totalCount: 3,
        groups: [
          {
            id: "priority-high",
            key: "priority" as const,
            value: "high",
            label: "High",
            rows: [highRow],
            loadedCount: 1,
            nextCursor: "2",
            totalCount: 2,
          },
          {
            id: "priority-medium",
            key: "priority" as const,
            value: "medium",
            label: "Medium",
            rows: [row],
            loadedCount: 1,
            totalCount: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [secondHighRow],
        loadedCount: 1,
        totalCount: 2,
      });

    const refresh = await refreshAuthoritativeTicketList({
      groupBy: "priority",
      groupPageCounts: new Map([
        ["priority-high", 2],
        ["priority-medium", 1],
      ]),
      load,
      pageCount: 1,
      request: { group: "priority" },
    });

    expect(load.mock.calls).toEqual([
      [{ group: "priority" }],
      [
        {
          bucketValue: "high",
          cursor: "2",
          group: "priority",
        },
      ],
    ]);
    expect(refresh.status).toBe("available");
    if (refresh.status === "available") {
      expect(refresh.result.rows).toEqual([highRow, secondHighRow, row]);
      expect(refresh.loadedGroupPageCounts.get("priority-high")).toBe(2);
    }
  });

  it("keeps the current list untouched when a later page cannot refresh", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [row],
        loadedCount: 1,
        nextCursor: "2",
      })
      .mockResolvedValueOnce({
        status: "unavailable" as const,
        reason: "provider-temporary-failure" as const,
        retryable: true,
      });

    const refresh = await refreshAuthoritativeTicketList({
      groupPageCounts: new Map(),
      load,
      pageCount: 2,
      request: {},
    });

    expect(refresh).toEqual({
      status: "unavailable",
      result: {
        status: "unavailable",
        reason: "provider-temporary-failure",
        retryable: true,
      },
    });
  });
});
