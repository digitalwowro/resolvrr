import { describe, expect, it, vi } from "vitest";
import type { StoredSavedView } from "@/features/saved-views";
import { savedViewTicketListQuery } from "@/app/workspace/workspace-page-helpers";

vi.mock("@/data/saved-view-selection-repository", () => ({
  prismaSavedViewSelectionRepository: {},
}));

vi.mock("@/data/workspace-tabs-repository", () => ({
  prismaWorkspaceTabsRepository: {},
}));

function savedView(
  query: StoredSavedView["query"],
): StoredSavedView {
  return {
    id: "view-1",
    name: "View",
    ownerUserId: "user-1",
    visibility: "personal",
    isSystem: false,
    query,
    filter: query.filter,
    group: query.group,
    sort: query.sort,
    createdAt: new Date("2026-07-20T00:00:00Z"),
    updatedAt: new Date("2026-07-20T00:00:00Z"),
  };
}

describe("workspace page list query", () => {
  it("requests 100 tickets for ungrouped List views", () => {
    expect(savedViewTicketListQuery(undefined)).toEqual({ pageSize: 100 });
    expect(
      savedViewTicketListQuery(savedView({ filter: { states: ["open"] } })),
    ).toMatchObject({
      filter: { states: ["open"] },
      pageSize: 100,
    });
  });

  it("keeps provider-backed grouped buckets bounded", () => {
    expect(
      savedViewTicketListQuery(
        savedView({
          filter: {},
          group: { key: "state" },
        }),
      ),
    ).toMatchObject({
      count: { includeTotal: true },
      group: { key: "state" },
      pageSize: 25,
    });
  });
});
