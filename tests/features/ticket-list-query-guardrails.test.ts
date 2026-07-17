import { describe, expect, it } from "vitest";
import { normalizeTicketListQuery } from "@/core/ticket-list-query";
import {
  guardTicketListQuery,
  ticketListQueryCapabilities,
} from "@/features/tickets/list-query-guardrails";

describe("ticket list query guardrails", () => {
  it("derives provider-neutral query capabilities from provider flags", () => {
    expect(
      ticketListQueryCapabilities([
        "ticket:list",
        "ticket:count",
        "ticket:sort",
        "ticket:group",
        "ticket:group-count",
        "search:full-text",
      ]),
    ).toEqual({
      totalCount: true,
      providerSort: true,
      providerGrouping: true,
      groupedTotalCount: true,
      fullTextSearch: true,
      maxPageSize: 50,
      unsupportedCombinations: [],
    });
  });

  it.each([
    [
      { count: { includeTotal: true } },
      "count-unsupported",
      "unsupported-query",
    ],
    [
      { sort: { key: "priority" as const, direction: "ascending" as const } },
      "sort-unsupported",
      "unsupported-query",
    ],
    [{ group: { key: "state" as const } }, "grouping-unsupported", "unsupported-query"],
    [
      { filter: { searchText: "billing" } },
      "full-text-search-unsupported",
      "unsupported-query",
    ],
  ])("rejects unsupported query input %s", (input, kind, reason) => {
    const result = guardTicketListQuery(
      ["ticket:list"],
      normalizeTicketListQuery(input),
      input,
    );

    expect(result).toMatchObject({
      status: "unsupported",
      reason,
      rejection: { kind },
    });
  });

  it("rejects grouped total counts without the expensive-combination flag", () => {
    const input = {
      count: { includeTotal: true },
      group: { key: "state" as const },
    };

    expect(
      guardTicketListQuery(
        ["ticket:list", "ticket:count", "ticket:group"],
        normalizeTicketListQuery(input),
        input,
      ),
    ).toMatchObject({
      status: "unsupported",
      reason: "query-too-expensive",
      rejection: { kind: "grouped-total-count-too-expensive" },
    });
  });

  it("does not require provider sort support for the implicit default sort", () => {
    expect(
      guardTicketListQuery(
        ["ticket:list"],
        normalizeTicketListQuery(),
        {},
      ),
    ).toMatchObject({ status: "supported" });
  });

  it("rejects provider-side relationship ID sorting as display-name sorting", () => {
    const input = {
      sort: { key: "owner" as const, direction: "ascending" as const },
    };

    expect(
      guardTicketListQuery(
        ["ticket:list", "ticket:sort"],
        normalizeTicketListQuery(input),
        input,
      ),
    ).toMatchObject({
      status: "unsupported",
      rejection: { kind: "sort-unsupported" },
    });
  });
});
