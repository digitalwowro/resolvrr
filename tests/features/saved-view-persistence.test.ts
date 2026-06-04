import { describe, expect, it, vi } from "vitest";
import {
  savedViewQueryFromStorage,
  savedViewStorageFromQuery,
} from "@/core/saved-views";
import {
  createSavedView,
  validateSavedViewQuery,
  type CreateSavedViewInput,
  type SavedViewsRepository,
  type StoredSavedView,
} from "@/features/saved-views";

function repository(onCreate: (input: CreateSavedViewInput) => void) {
  const create = vi.fn(async (input: CreateSavedViewInput): Promise<StoredSavedView> => {
    onCreate(input);
    return {
      id: "view-1",
      ownerUserId: input.ownerUserId,
      ...(input.helpdeskConnectionId
        ? { helpdeskConnectionId: input.helpdeskConnectionId }
        : {}),
      name: input.name,
      visibility: input.visibility,
      filter: input.query.filter,
      query: input.query,
      ...(input.query.sort ? { sort: input.query.sort } : {}),
      ...(input.query.group ? { group: input.query.group } : {}),
      isSystem: false,
      createdAt: new Date("2026-05-28T00:00:00Z"),
      updatedAt: new Date("2026-05-28T00:00:00Z"),
      ...(input.preference ? { preference: input.preference } : {}),
    };
  });

  return {
    repo: {
      listForUser: async () => [],
      findForUser: async () => null,
      create,
      update: async () => null,
      deleteForUser: async () => null,
      setDefaultForUser: async () => true,
      reorderForUser: async () => [],
      findSeedForUser: async () => null,
      isSeedDismissed: async () => false,
      dismissSeed: async () => undefined,
    } satisfies SavedViewsRepository,
    create,
  };
}

describe("saved view persistence", () => {
  it("stores only provider-neutral saved-view query defaults and preferences", async () => {
    let captured: CreateSavedViewInput | undefined;
    const { repo } = repository((input) => {
      captured = input;
    });

    const result = await createSavedView(
      repo,
      ["ticket:list", "ticket:sort", "ticket:group", "search:full-text"],
      {
        userId: "user-1",
        helpdeskConnectionId: "connection-1",
        name: "Open high priority",
        query: {
          cursor: "provider-cursor",
          count: { includeTotal: true },
          filter: {
            states: ["open", "provider_raw_state"] as never,
            priorities: ["high"],
            ownerExternalIds: ["owner-1", "owner-1"],
            searchText: "  billing  ",
            providerRawQuery: "raw-provider-query",
          } as never,
          group: { key: "state" },
          sort: { key: "priority", direction: "ascending" },
        },
        preference: { position: 2, isDefault: true },
      },
    );

    expect(result.status).toBe("saved");
    expect(captured).toMatchObject({
      ownerUserId: "user-1",
      helpdeskConnectionId: "connection-1",
      name: "Open high priority",
      preference: { position: 2, isDefault: true },
      query: {
        filter: {
          states: ["open"],
          priorities: ["high"],
          ownerExternalIds: ["owner-1"],
          searchText: "billing",
        },
        group: { key: "state" },
        sort: { key: "priority", direction: "ascending" },
      },
    });
    expect(captured?.query).not.toHaveProperty("cursor");
    expect(captured?.query).not.toHaveProperty("count");
    expect(captured?.query.filter).not.toHaveProperty("providerRawQuery");
  });

  it.each([
    [
      { filter: { searchText: "billing" } },
      "full-text-search-unsupported",
    ],
    [
      { sort: { key: "priority" as const, direction: "ascending" as const } },
      "sort-unsupported",
    ],
    [{ group: { key: "state" as const } }, "grouping-unsupported"],
  ])("rejects unsupported saved-view query defaults %s", async (query, kind) => {
    const { repo, create } = repository(() => undefined);

    const result = await createSavedView(repo, ["ticket:list"], {
      userId: "user-1",
      name: "Unsupported view",
      query,
    });

    expect(result).toMatchObject({
      status: "rejected",
      rejection: { kind },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("drops raw or malformed sort and group values before persistence", async () => {
    let captured: CreateSavedViewInput | undefined;
    const { repo } = repository((input) => {
      captured = input;
    });

    const result = await createSavedView(
      repo,
      ["ticket:list", "ticket:sort", "ticket:group"],
      {
        userId: "user-1",
        name: "Malformed view",
        query: {
          filter: { states: ["open"] },
          group: { key: "provider_raw_group" } as never,
          sort: {
            direction: "sideways",
            key: "provider_raw_sort",
          } as never,
        },
      },
    );

    expect(result.status).toBe("saved");
    expect(captured?.query).toEqual({
      filter: { states: ["open"] },
    });
  });

  it("round-trips versioned and legacy saved-view filter storage", () => {
    const versioned = savedViewStorageFromQuery({
      filter: { states: ["open"], tagNames: ["vip"] },
      group: { key: "priority" },
      sort: { key: "updatedAt", direction: "descending" },
    });

    expect(savedViewQueryFromStorage(versioned)).toEqual({
      filter: { states: ["open"], tagNames: ["vip"] },
      group: { key: "priority" },
      sort: { key: "updatedAt", direction: "descending" },
    });
    expect(
      savedViewQueryFromStorage({
        states: ["closed", "provider_raw"],
        providerRawQuery: "raw-provider-query",
      }),
    ).toEqual({ filter: { states: ["closed"] } });
    expect(
      savedViewQueryFromStorage({
        version: 1,
        filter: { priorities: ["high"] },
        group: { key: "provider_raw_group" },
        sort: { key: "provider_raw_sort", direction: "sideways" },
      }),
    ).toEqual({ filter: { priorities: ["high"] } });
  });

  it("exposes saved-view guardrails without persisting anything", () => {
    expect(
      validateSavedViewQuery(["ticket:list"], {
        group: { key: "state" },
      }),
    ).toMatchObject({
      status: "unsupported",
      rejection: { kind: "grouping-unsupported" },
    });
  });
});
