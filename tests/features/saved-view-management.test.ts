import { describe, expect, it, vi } from "vitest";
import {
  compileSavedViewConditions,
  ensureMyWorkSavedView,
  ensureMyWorkSavedViewResult,
  myWorkSavedViewConditions,
  saveManagedSavedView,
  type CreateSavedViewInput,
} from "@/features/saved-views";
import { repository, storedView } from "./saved-view-management-test-helpers";

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

  it("reports My work seed unavailable when current user lookup is missing", async () => {
    const { repo, create } = repository();

    await expect(
      ensureMyWorkSavedViewResult(
        repo,
        ["ticket:list"],
        "user-1",
        "connection-1",
        undefined,
      ),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "current-user-unavailable",
      views: [],
    });
    expect(create).not.toHaveBeenCalled();
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

  it("transfers ownership when an admin changes a shared view to personal", async () => {
    const { repo, update, views } = repository([
      storedView({
        id: "shared-view",
        ownerUserId: "creator-user",
        name: "Shared queue",
        visibility: "shared",
      }),
    ]);

    await expect(
      saveManagedSavedView(
        repo,
        ["ticket:list"],
        "admin-user",
        "ADMIN",
        "connection-1",
        { externalId: "77", label: "Za Mad" },
        {
          id: "shared-view",
          name: "Personal queue",
          visibility: "personal",
          colorName: "blue",
          iconName: "briefcase-business",
          conditions: myWorkSavedViewConditions(),
        },
      ),
    ).resolves.toMatchObject({
      ok: true,
      code: "saved",
    });

    expect(update).toHaveBeenCalledWith(
      "admin-user",
      "shared-view",
      "connection-1",
      expect.objectContaining({
        ownerUserId: "admin-user",
        visibility: "personal",
      }),
    );
    expect(views[0]).toMatchObject({
      id: "shared-view",
      ownerUserId: "admin-user",
      visibility: "personal",
    });
  });
});
