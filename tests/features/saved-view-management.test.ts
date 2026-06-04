import { describe, expect, it, vi } from "vitest";
import {
  compileSavedViewConditions,
  deleteManagedSavedView,
  ensureMyWorkSavedView,
  myWorkSavedViewConditions,
  saveManagedSavedView,
  type CreateSavedViewInput,
  type SavedViewsRepository,
  type StoredSavedView,
} from "@/features/saved-views";

function storedView(overrides: Partial<StoredSavedView> = {}): StoredSavedView {
  return {
    id: "view-1",
    ownerUserId: "user-1",
    helpdeskConnectionId: "connection-1",
    name: "My work",
    visibility: "personal",
    filter: { states: ["open"] },
    query: { filter: { states: ["open"] } },
    isSystem: false,
    createdAt: new Date("2026-06-04T00:00:00Z"),
    updatedAt: new Date("2026-06-04T00:00:00Z"),
    ...overrides,
  };
}

function repository(initialViews: StoredSavedView[] = []) {
  const views = [...initialViews];
  const setDefaultForUser = vi.fn(async (_userId: string, savedViewId: string) => {
    for (const view of views) {
      view.preference = {
        position: view.preference?.position ?? 0,
        isDefault: view.id === savedViewId,
      };
    }
    return views.some((view) => view.id === savedViewId);
  });
  const create = vi.fn(async (input: CreateSavedViewInput) => {
    const view = storedView({
      id: `view-${views.length + 1}`,
      ownerUserId: input.ownerUserId,
      helpdeskConnectionId: input.helpdeskConnectionId,
      name: input.name,
      visibility: input.visibility,
      filter: input.query.filter,
      query: input.query,
      seedKey: input.seedKey,
      preference: input.preference,
    });
    views.push(view);
    return view;
  });

  return {
    views,
    create,
    repo: {
      listForUser: async () => views,
      findForUser: async (_userId, savedViewId) =>
        views.find((view) => view.id === savedViewId) ?? null,
      create,
      update: async () => null,
      deleteForUser: async (_userId, savedViewId) => {
        const index = views.findIndex((view) => view.id === savedViewId);
        if (index === -1) {
          return null;
        }
        return views.splice(index, 1)[0] ?? null;
      },
      setDefaultForUser,
      reorderForUser: async () => views,
      findSeedForUser: async (_userId, _connectionId, seedKey) =>
        views.find((view) => view.seedKey === seedKey) ?? null,
      isSeedDismissed: async () => false,
      dismissSeed: async () => undefined,
    } satisfies SavedViewsRepository,
    setDefaultForUser,
  };
}

describe("saved view management", () => {
  it("compiles My work to owner Myself and State is not Closed", () => {
    expect(
      compileSavedViewConditions({
        conditions: myWorkSavedViewConditions(),
        currentUser: { externalId: "77", label: "Za Mad" },
      }),
    ).toMatchObject({
      filter: {
        ownerExternalIds: ["77"],
        excludedStates: ["closed"],
      },
    });
  });

  it("seeds only My work when it is missing and not dismissed", async () => {
    const { repo, create } = repository();

    const views = await ensureMyWorkSavedView(
      repo,
      ["ticket:list"],
      "user-1",
      "connection-1",
      { externalId: "77", label: "Za Mad" },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My work",
        seedKey: "my-work",
        preference: { position: 0, isDefault: true },
        query: expect.objectContaining({
          filter: { ownerExternalIds: ["77"], excludedStates: ["closed"] },
        }),
      }),
    );
    expect(views).toHaveLength(1);
  });

  it("sets an existing My work seed as default when no default is valid", async () => {
    const { repo, create, setDefaultForUser } = repository([
      storedView({
        id: "view-1",
        seedKey: "my-work",
        preference: { position: 0, isDefault: false },
      }),
    ]);

    const views = await ensureMyWorkSavedView(
      repo,
      ["ticket:list"],
      "user-1",
      "connection-1",
      { externalId: "77", label: "Za Mad" },
    );

    expect(create).not.toHaveBeenCalled();
    expect(setDefaultForUser).toHaveBeenCalledWith("user-1", "view-1", "connection-1");
    expect(views[0]?.preference?.isDefault).toBe(true);
  });

  it("treats All owners as no owner condition and does not persist it", async () => {
    let captured: CreateSavedViewInput | undefined;
    const { repo } = repository();
    vi.mocked(repo.create).mockImplementationOnce(async (input) => {
      captured = input;
      return storedView({ query: input.query, filter: input.query.filter });
    });

    const result = await saveManagedSavedView(
      repo,
      ["ticket:list"],
      "user-1",
      "USER",
      "connection-1",
      { externalId: "77", label: "Za Mad" },
      {
        name: "Any owner",
        visibility: "personal",
        iconName: "briefcase-business",
        colorName: "blue",
        conditions: [
          {
            id: "owner",
            field: "owner",
            operator: "is",
            values: [{ kind: "owner-preset", value: "all" }],
          },
          {
            id: "state",
            field: "state",
            operator: "is",
            values: [{ kind: "state", value: "open" }],
          },
        ],
      },
    );

    expect(result.ok).toBe(true);
    expect(captured?.query).toEqual({
      filter: { states: ["open"] },
      conditions: [
        {
          id: "state",
          field: "state",
          operator: "is",
          values: [{ kind: "state", value: "open" }],
        },
      ],
    });
  });

  it("rejects an All owners-only view because it would be an All tickets clone", async () => {
    const { repo } = repository();

    await expect(
      saveManagedSavedView(
        repo,
        ["ticket:list"],
        "user-1",
        "USER",
        "connection-1",
        { externalId: "77", label: "Za Mad" },
        {
          name: "Any owner",
          visibility: "personal",
          iconName: "briefcase-business",
          colorName: "blue",
          conditions: [
            {
              id: "owner",
              field: "owner",
              operator: "is",
              values: [{ kind: "owner-preset", value: "all" }],
            },
          ],
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid-conditions",
    });
  });

  it("prevents deleting the current default view", async () => {
    const { repo } = repository([
      storedView({ id: "view-1", preference: { position: 0, isDefault: true } }),
    ]);

    await expect(
      deleteManagedSavedView(
        repo,
        "user-1",
        "USER",
        "connection-1",
        "view-1",
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "default-delete-blocked",
    });
  });

  it("blocks agent-created shared workspace views", async () => {
    const { repo } = repository();

    await expect(
      saveManagedSavedView(
        repo,
        ["ticket:list"],
        "user-1",
        "USER",
        "connection-1",
        { externalId: "77", label: "Za Mad" },
        {
          name: "Shared queue",
          visibility: "shared",
          colorName: "blue",
          iconName: "briefcase-business",
          conditions: myWorkSavedViewConditions(),
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "permission-denied",
    });
  });
});
