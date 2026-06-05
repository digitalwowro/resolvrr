import type { Prisma } from "@/generated/prisma/client";
import { SavedViewVisibility as DbSavedViewVisibility } from "@/generated/prisma/enums";
import { prisma } from "@/data/prisma";
import {
  savedViewSeedDismissalPreferenceKey,
  savedViewStorageFromQuery,
} from "@/core/saved-views";
import type {
  CreateSavedViewInput,
  SavedViewsRepository,
} from "@/features/saved-views/repository";
import {
  dismissedSeedKeys,
  savedViewSelect,
  sortedViews,
  toDbVisibility,
  toStoredSavedView,
  visibleViewWhere,
} from "./saved-views-repository-mappers";

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
