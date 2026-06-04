import { SavedViewVisibility as DbSavedViewVisibility } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import {
  savedViewSeedDismissalPreferenceKey,
  savedViewQueryFromStorage,
  savedViewStorageFromQuery,
  type SavedViewVisibility,
} from "@/core/saved-views";
import type {
  CreateSavedViewInput,
  SavedViewPreference,
  SavedViewsRepository,
  StoredSavedView,
} from "@/features/saved-views/repository";

const savedViewSelect = {
  id: true,
  ownerUserId: true,
  helpdeskConnectionId: true,
  name: true,
  visibility: true,
  iconName: true,
  colorName: true,
  filterJson: true,
  seedKey: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SavedViewSelect;

function toDbVisibility(visibility: SavedViewVisibility): DbSavedViewVisibility {
  return visibility === "shared"
    ? DbSavedViewVisibility.SHARED
    : DbSavedViewVisibility.PERSONAL;
}

function toDomainVisibility(
  visibility: DbSavedViewVisibility,
): SavedViewVisibility {
  return visibility === DbSavedViewVisibility.SHARED ? "shared" : "personal";
}

function toPreference(
  preference: SavedViewPreference | undefined,
): SavedViewPreference | undefined {
  return preference
    ? {
        position: preference.position,
        isDefault: preference.isDefault,
      }
    : undefined;
}

function toStoredSavedView(
  view: {
    id: string;
    ownerUserId: string;
    helpdeskConnectionId: string | null;
    name: string;
    visibility: DbSavedViewVisibility;
    iconName: string | null;
    colorName: string | null;
    filterJson: Prisma.JsonValue;
    seedKey: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
    preferences?: SavedViewPreference[];
  },
): StoredSavedView {
  const query = savedViewQueryFromStorage(view.filterJson);

  return {
    id: view.id,
    ownerUserId: view.ownerUserId,
    ...(view.helpdeskConnectionId
      ? { helpdeskConnectionId: view.helpdeskConnectionId }
      : {}),
    name: view.name,
    visibility: toDomainVisibility(view.visibility),
    filter: query.filter,
    query,
    ...(query.sort ? { sort: query.sort } : {}),
    ...(query.group ? { group: query.group } : {}),
    ...(view.iconName ? { iconName: view.iconName } : {}),
    ...(view.colorName ? { colorName: view.colorName } : {}),
    ...(view.seedKey ? { seedKey: view.seedKey } : {}),
    isSystem: view.isSystem,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    ...(view.preferences?.[0]
      ? { preference: toPreference(view.preferences[0]) }
      : {}),
  };
}

function visibleViewWhere(
  userId: string,
  helpdeskConnectionId: string | undefined,
): Prisma.SavedViewWhereInput {
  return {
    helpdeskConnectionId: helpdeskConnectionId ?? "__missing-connection__",
    OR: [
      { ownerUserId: userId },
      { visibility: DbSavedViewVisibility.SHARED },
    ],
  };
}

function sortedViews(views: StoredSavedView[]) {
  return views.sort(
    (left, right) =>
      (left.preference?.position ?? Number.MAX_SAFE_INTEGER) -
        (right.preference?.position ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name),
  );
}

function dismissedSeedKeys(value: Prisma.JsonValue | null | undefined): string[] {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "seedKeys" in value &&
    Array.isArray(value.seedKeys)
  ) {
    return value.seedKeys.filter(
      (seedKey): seedKey is string => typeof seedKey === "string",
    );
  }

  return [];
}

export const prismaSavedViewsRepository: SavedViewsRepository = {
  async listForUser(userId, helpdeskConnectionId) {
    const views = await prisma.savedView.findMany({
      where: visibleViewWhere(userId, helpdeskConnectionId),
      select: {
        ...savedViewSelect,
        preferences: {
          where: { userId },
          select: { position: true, isDefault: true },
          take: 1,
        },
      },
    });

    return sortedViews(views.map(toStoredSavedView));
  },

  async findForUser(userId, savedViewId, helpdeskConnectionId) {
    const view = await prisma.savedView.findFirst({
      where: { id: savedViewId, ...visibleViewWhere(userId, helpdeskConnectionId) },
      select: {
        ...savedViewSelect,
        preferences: {
          where: { userId },
          select: { position: true, isDefault: true },
          take: 1,
        },
      },
    });

    return view ? toStoredSavedView(view) : null;
  },

  async create(input: CreateSavedViewInput) {
    const createView = async (client: Pick<typeof prisma, "savedView">) =>
      client.savedView.create({
        data: {
          ownerUserId: input.ownerUserId,
          helpdeskConnectionId: input.helpdeskConnectionId,
          name: input.name,
          visibility: toDbVisibility(input.visibility),
          iconName: input.iconName,
          colorName: input.colorName,
          seedKey: input.seedKey,
          isSystem: input.isSystem ?? false,
          filterJson: savedViewStorageFromQuery(
            input.query,
          ) as Prisma.InputJsonValue,
          preferences: input.preference
            ? {
                create: {
                  userId: input.ownerUserId,
                  position: input.preference.position,
                  isDefault: input.preference.isDefault,
                },
              }
            : undefined,
        },
        select: {
          ...savedViewSelect,
          preferences: {
            where: { userId: input.ownerUserId },
            select: { position: true, isDefault: true },
            take: 1,
          },
        },
      });

    if (!input.preference?.isDefault) {
      return toStoredSavedView(await createView(prisma));
    }

    return prisma.$transaction(async (tx) => {
      await tx.userSavedViewPreference.updateMany({
        where: {
          userId: input.ownerUserId,
          isDefault: true,
          savedView: {
            helpdeskConnectionId: input.helpdeskConnectionId,
          },
        },
        data: { isDefault: false },
      });

      return toStoredSavedView(await createView(tx));
    });
  },

  async update(userId, savedViewId, helpdeskConnectionId, input) {
    const view = await prisma.savedView.findFirst({
      where: {
        id: savedViewId,
        helpdeskConnectionId,
        OR: [
          { ownerUserId: userId },
          { visibility: DbSavedViewVisibility.SHARED },
        ],
      },
      select: { id: true },
    });
    if (!view) {
      return null;
    }

    const updated = await prisma.savedView.update({
      where: { id: savedViewId },
      data: {
        ...(input.visibility === "personal"
          ? { ownerUserId: input.ownerUserId }
          : {}),
        name: input.name,
        visibility: toDbVisibility(input.visibility),
        iconName: input.iconName,
        colorName: input.colorName,
        filterJson: savedViewStorageFromQuery(input.query) as Prisma.InputJsonValue,
      },
      select: {
        ...savedViewSelect,
        preferences: {
          where: { userId },
          select: { position: true, isDefault: true },
          take: 1,
        },
      },
    });

    return toStoredSavedView(updated);
  },

  async deleteForUser(userId, savedViewId, helpdeskConnectionId) {
    const view = await prisma.savedView.findFirst({
      where: {
        id: savedViewId,
        helpdeskConnectionId,
        OR: [
          { ownerUserId: userId },
          { visibility: DbSavedViewVisibility.SHARED },
        ],
      },
      select: {
        ...savedViewSelect,
        preferences: {
          where: { userId },
          select: { position: true, isDefault: true },
          take: 1,
        },
      },
    });
    if (!view) {
      return null;
    }

    await prisma.savedView.delete({ where: { id: savedViewId } });
    return toStoredSavedView(view);
  },

  async setDefaultForUser(userId, savedViewId, helpdeskConnectionId) {
    const view = await prisma.savedView.findFirst({
      where: {
        id: savedViewId,
        helpdeskConnectionId,
        OR: [
          { ownerUserId: userId },
          { visibility: DbSavedViewVisibility.SHARED },
        ],
      },
      select: { id: true },
    });
    if (!view) {
      return false;
    }

    await prisma.$transaction([
      prisma.userSavedViewPreference.updateMany({
        where: {
          userId,
          isDefault: true,
          savedView: { helpdeskConnectionId },
        },
        data: { isDefault: false },
      }),
      prisma.userSavedViewPreference.upsert({
        where: { userId_savedViewId: { userId, savedViewId } },
        create: { userId, savedViewId, position: 0, isDefault: true },
        update: { isDefault: true },
      }),
    ]);

    return true;
  },

  async reorderForUser(userId, helpdeskConnectionId, savedViewIds) {
    const visibleViews = await this.listForUser(userId, helpdeskConnectionId);
    const visibleById = new Map(visibleViews.map((view) => [view.id, view]));
    const orderedIds = [
      ...savedViewIds.filter((id) => visibleById.has(id)),
      ...visibleViews
        .map((view) => view.id)
        .filter((id) => !savedViewIds.includes(id)),
    ];

    await prisma.$transaction(
      orderedIds.map((savedViewId, position) =>
        prisma.userSavedViewPreference.upsert({
          where: { userId_savedViewId: { userId, savedViewId } },
          create: { userId, savedViewId, position, isDefault: false },
          update: { position },
        }),
      ),
    );

    return this.listForUser(userId, helpdeskConnectionId);
  },

  async findSeedForUser(userId, helpdeskConnectionId, seedKey) {
    const view = await prisma.savedView.findFirst({
      where: {
        helpdeskConnectionId,
        seedKey,
        ownerUserId: userId,
      },
      select: {
        ...savedViewSelect,
        preferences: {
          where: { userId },
          select: { position: true, isDefault: true },
          take: 1,
        },
      },
    });

    return view ? toStoredSavedView(view) : null;
  },

  async isSeedDismissed(userId, helpdeskConnectionId, seedKey) {
    const preference = await prisma.uiPreference.findUnique({
      where: {
        userId_helpdeskConnectionId_key: {
          userId,
          helpdeskConnectionId,
          key: savedViewSeedDismissalPreferenceKey,
        },
      },
      select: { valueJson: true },
    });

    return dismissedSeedKeys(preference?.valueJson).includes(seedKey);
  },

  async dismissSeed(userId, helpdeskConnectionId, seedKey) {
    const preference = await prisma.uiPreference.findUnique({
      where: {
        userId_helpdeskConnectionId_key: {
          userId,
          helpdeskConnectionId,
          key: savedViewSeedDismissalPreferenceKey,
        },
      },
      select: { valueJson: true },
    });
    const seedKeys = [...new Set([...dismissedSeedKeys(preference?.valueJson), seedKey])];

    await prisma.uiPreference.upsert({
      where: {
        userId_helpdeskConnectionId_key: {
          userId,
          helpdeskConnectionId,
          key: savedViewSeedDismissalPreferenceKey,
        },
      },
      create: {
        userId,
        helpdeskConnectionId,
        key: savedViewSeedDismissalPreferenceKey,
        valueJson: { seedKeys },
      },
      update: { valueJson: { seedKeys } },
    });
  },
};
