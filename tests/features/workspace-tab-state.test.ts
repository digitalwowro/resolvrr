import { describe, expect, it } from "vitest";
import {
  workspaceOpenTabsLimit,
  workspaceOpenTabsStateFromStorage,
  workspaceOpenTabsStateVersion,
} from "@/features/workspace/workspace-tab-state";
import { row } from "./ticket-workspace-test-utils";

describe("workspace open tabs state", () => {
  it("ignores invalid stored tab state", () => {
    expect(workspaceOpenTabsStateFromStorage("not-json")).toBeUndefined();
    expect(
      workspaceOpenTabsStateFromStorage({
        version: 0,
        activePane: "list",
        openTabs: [],
        recentTabs: [],
        tabOrientation: "horizontal",
        updatedAt: "2026-06-02T00:00:00.000Z",
      }),
    ).toBeUndefined();
  });

  it("caps and deduplicates stored tabs", () => {
    const stored = workspaceOpenTabsStateFromStorage({
      version: workspaceOpenTabsStateVersion,
      activePane: "list",
      openTabs: [
        row,
        row,
        ...Array.from({ length: workspaceOpenTabsLimit + 2 }, (_, index) => ({
          ...row,
          id: `ticket-${index + 10}`,
          number: `#${index + 10}`,
        })),
      ],
      recentTabs: [],
      tabOrientation: "vertical",
      updatedAt: "2026-06-02T00:00:00.000Z",
    });

    expect(stored?.openTabs).toHaveLength(workspaceOpenTabsLimit);
    expect(stored?.openTabs[0]?.id).toBe("ticket-1");
    expect(stored?.openTabs[1]?.id).toBe("ticket-10");
    expect(stored?.tabOrientation).toBe("vertical");
  });

  it("removes legacy tabs without selectable state keys", () => {
    const stored = workspaceOpenTabsStateFromStorage({
      version: workspaceOpenTabsStateVersion,
      activePane: "merged-ticket",
      openTabs: [
        row,
        {
          ...row,
          id: "merged-ticket",
          number: "#99",
          state: "Unknown",
          stateKey: undefined,
        },
      ],
      recentTabs: [
        { ...row, id: "merged-ticket", state: "Unknown", stateKey: "merged" },
      ],
      tabOrientation: "horizontal",
      updatedAt: "2026-07-14T00:00:00.000Z",
    });

    expect(stored?.openTabs.map((tab) => tab.id)).toEqual([row.id]);
    expect(stored?.recentTabs).toEqual([]);
  });
});
