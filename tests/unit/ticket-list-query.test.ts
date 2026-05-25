import { describe, expect, it } from "vitest";
import {
  defaultTicketListQuery,
  normalizeTicketListQuery,
  type TicketListBucket,
  type TicketListQuery,
} from "@/core/ticket-list-query";

describe("ticket list query contract", () => {
  it("defines canonical default paging and sorting", () => {
    expect(defaultTicketListQuery).toEqual({
      filter: {},
      pageSize: 25,
      sort: { key: "updatedAt", direction: "descending" },
    });
  });

  it("normalizes partial query input without provider-specific syntax", () => {
    expect(
      normalizeTicketListQuery({
        cursor: "opaque-cursor",
        filter: { states: ["open"], searchText: "billing" },
        pageSize: 40,
        sort: { key: "priority", direction: "ascending" },
      }),
    ).toEqual({
      cursor: "opaque-cursor",
      filter: { states: ["open"], searchText: "billing" },
      pageSize: 40,
      sort: { key: "priority", direction: "ascending" },
    });
  });

  it("keeps count and group requests provider-neutral", () => {
    const query = normalizeTicketListQuery({
      count: { includeTotal: true },
      group: { key: "state" },
    });

    expect(query).toMatchObject({
      count: { includeTotal: true },
      group: { key: "state" },
    } satisfies Partial<TicketListQuery>);
  });

  it("defines bucket response counts separately from loaded rows", () => {
    const bucket = {
      key: "priority",
      value: "high",
      label: "High",
      tickets: [],
      loadedCount: 0,
      totalCount: 7,
      nextCursor: "next-high",
    } satisfies TicketListBucket;

    expect(bucket.loadedCount).toBe(0);
    expect(bucket.totalCount).toBe(7);
  });

  it("accepts previous limit input only at the service normalization boundary", () => {
    const query = normalizeTicketListQuery({ limit: 10 });

    expect(query.pageSize).toBe(10);
    expect("limit" in query).toBe(false);
  });
});
