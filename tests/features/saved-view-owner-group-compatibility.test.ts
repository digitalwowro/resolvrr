import { describe, expect, it } from "vitest";
import {
  savedViewOwnerGroupScope,
  savedViewOwnersMatchGroups,
} from "@/features/saved-views/owner-group-compatibility";

describe("saved view owner and group compatibility scope", () => {
  it("uses the union of positive groups and resolves Myself", () => {
    expect(savedViewOwnerGroupScope([
      {
        id: "groups",
        field: "group",
        operator: "is",
        values: [
          { kind: "external", externalId: "7", label: "Support" },
          { kind: "external", externalId: "8", label: "Billing" },
        ],
      },
      {
        id: "owners",
        field: "owner",
        operator: "is",
        values: [
          { kind: "external", externalId: "12", label: "Agent Twelve" },
          { kind: "owner-preset", value: "myself" },
        ],
      },
    ], { externalId: "9", label: "Current Agent" })).toEqual({
      groupExternalIds: ["7", "8"],
      ownerExternalIds: ["12", "9"],
      unresolvedMyself: false,
    });
  });

  it("does not narrow owners from negative group conditions", () => {
    expect(savedViewOwnerGroupScope([
      {
        id: "excluded-group",
        field: "group",
        operator: "is_not",
        values: [{ kind: "external", externalId: "7", label: "Support" }],
      },
    ])).toEqual({
      groupExternalIds: [],
      ownerExternalIds: [],
      unresolvedMyself: false,
    });
  });

  it("fails closed when a selected owner is not eligible", async () => {
    const conditions = [
      {
        id: "group",
        field: "group" as const,
        operator: "is" as const,
        values: [{ kind: "external" as const, externalId: "7" }],
      },
      {
        id: "owner",
        field: "owner" as const,
        operator: "is" as const,
        values: [{ kind: "external" as const, externalId: "12" }],
      },
    ];
    await expect(savedViewOwnersMatchGroups({
      conditions,
      lookup: async () => ({
        status: "available",
        cachePolicy: "request",
        options: [{ externalId: "13", label: "Different Agent" }],
      }),
    })).resolves.toBe(false);
  });
});
