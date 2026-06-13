import { describe, expect, it } from "vitest";
import {
  allTicketsSavedViewId,
  defaultWorkspaceSavedViewId,
  initialWorkspaceSavedViewSelection,
  workspaceSavedViews,
  type StoredSavedView,
} from "@/features/saved-views";
import type { TicketListQueryCapabilities } from "@/core/providers";

const baseCapabilities: TicketListQueryCapabilities = {
  totalCount: true,
  providerSort: true,
  providerGrouping: true,
  groupedTotalCount: true,
  fullTextSearch: true,
  maxPageSize: 50,
  unsupportedCombinations: [],
};

function savedView(
  overrides: Partial<StoredSavedView> = {},
): StoredSavedView {
  return {
    id: "view-1",
    ownerUserId: "user-1",
    name: "Open priority",
    visibility: "personal",
    filter: { states: ["open"] },
    query: { filter: { states: ["open"] } },
    isSystem: false,
    createdAt: new Date("2026-05-29T00:00:00Z"),
    updatedAt: new Date("2026-05-29T00:00:00Z"),
    ...overrides,
  };
}

describe("workspace saved-view performance rules", () => {
  it("skips a default saved view that is too expensive for the active provider", () => {
    const selected = defaultWorkspaceSavedViewId(
      [
        savedView({
          id: "grouped-view",
          query: {
            filter: { states: ["open"] },
            group: { key: "state" },
          },
          group: { key: "state" },
          preference: { position: 0, isDefault: true },
        }),
      ],
      {
        ...baseCapabilities,
        groupedTotalCount: false,
        unsupportedCombinations: ["grouped-total-count"],
      },
    );

    expect(selected).toBe(allTicketsSavedViewId);
  });

  it("keeps a supported default saved view selected", () => {
    const selected = defaultWorkspaceSavedViewId(
      [
        savedView({
          id: "grouped-view",
          query: {
            filter: { priorities: ["high"] },
            group: { key: "priority" },
          },
          group: { key: "priority" },
          preference: { position: 0, isDefault: true },
        }),
      ],
      baseCapabilities,
    );

    expect(selected).toBe("grouped-view");
  });

  it("returns provider-neutral disabled labels for unsupported saved views", () => {
    expect(
      workspaceSavedViews(
        [
          savedView({
            id: "search-view",
            name: "Search view",
            query: { filter: { searchText: "billing" } },
          }),
          savedView({
            id: "grouped-view",
            name: "Grouped view",
            query: {
              filter: { states: ["open"] },
              group: { key: "state" },
            },
          }),
        ],
        {
          ...baseCapabilities,
          fullTextSearch: false,
          groupedTotalCount: false,
          unsupportedCombinations: ["grouped-total-count"],
        },
      ),
    ).toMatchObject([
      {
        id: "search-view",
        disabledLabel: "search unsupported",
        disabledReason: "full-text-search-unsupported",
      },
      {
        id: "grouped-view",
        disabledLabel: "too expensive",
        disabledReason: "grouped-total-count-too-expensive",
      },
    ]);
  });

  it("keeps saved-view icon names for workspace dropdown options", () => {
    expect(
      workspaceSavedViews([
        savedView({
          iconName: "inbox",
        }),
      ]),
    ).toMatchObject([
      {
        id: "view-1",
        iconName: "inbox",
      },
    ]);
  });

  it("blocks the unfiltered All tickets fallback when My work cannot resolve Myself", () => {
    expect(
      initialWorkspaceSavedViewSelection({
        savedViews: [],
        capabilities: baseCapabilities,
        blockUnfilteredFallback: true,
      }),
    ).toEqual({
      status: "blocked",
      reason: "my-work-current-user-unavailable",
    });
  });

  it("blocks All tickets fallback when existing views are unsupported during My work seed failure", () => {
    expect(
      initialWorkspaceSavedViewSelection({
        savedViews: [
          savedView({
            id: "search-view",
            name: "Search view",
            query: { filter: { searchText: "billing" } },
          }),
        ],
        capabilities: {
          ...baseCapabilities,
          fullTextSearch: false,
        },
        blockUnfilteredFallback: true,
      }),
    ).toEqual({
      status: "blocked",
      reason: "my-work-current-user-unavailable",
    });
  });
});
