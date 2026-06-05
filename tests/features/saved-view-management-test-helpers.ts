import { vi } from "vitest";
import type {
  CreateSavedViewInput,
  SavedViewsRepository,
  StoredSavedView,
} from "@/features/saved-views";

export function storedView(
  overrides: Partial<StoredSavedView> = {},
): StoredSavedView {
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

export function repository(initialViews: StoredSavedView[] = []) {
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
  const update = vi.fn(
    async (
      _userId: string,
      savedViewId: string,
      _helpdeskConnectionId: string,
      input: Parameters<SavedViewsRepository["update"]>[3],
    ) => {
      const view = views.find((item) => item.id === savedViewId);
      if (!view) {
        return null;
      }
      view.ownerUserId =
        input.visibility === "personal" ? input.ownerUserId : view.ownerUserId;
      view.name = input.name;
      view.visibility = input.visibility;
      view.filter = input.query.filter;
      view.query = input.query;
      if (input.iconName) {
        view.iconName = input.iconName;
      } else {
        delete view.iconName;
      }
      if (input.colorName) {
        view.colorName = input.colorName;
      } else {
        delete view.colorName;
      }
      return view;
    },
  );

  return {
    views,
    create,
    repo: {
      listForUser: async () => views,
      findForUser: async (_userId, savedViewId) =>
        views.find((view) => view.id === savedViewId) ?? null,
      create,
      update,
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
    update,
  };
}
