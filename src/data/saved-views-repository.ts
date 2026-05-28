import { SavedViewVisibility as DbSavedViewVisibility } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import {
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
    isSystem: view.isSystem,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    ...(view.preferences?.[0]
      ? { preference: toPreference(view.preferences[0]) }
      : {}),
  };
}

function connectionFilter(helpdeskConnectionId: string | undefined) {
  return helpdeskConnectionId
    ? {
        OR: [
          { helpdeskConnectionId },
          { helpdeskConnectionId: null },
        ],
      }
    : {};
}

export const prismaSavedViewsRepository: SavedViewsRepository = {
  async listForUser(userId, helpdeskConnectionId) {
    const views = await prisma.savedView.findMany({
      where: {
        AND: [
          {
            OR: [
              { ownerUserId: userId },
              { visibility: DbSavedViewVisibility.SHARED },
            ],
          },
          connectionFilter(helpdeskConnectionId),
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

    return views
      .map(toStoredSavedView)
      .sort(
        (left, right) =>
          (left.preference?.position ?? Number.MAX_SAFE_INTEGER) -
            (right.preference?.position ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name),
      );
  },

  async findForUser(userId, savedViewId) {
    const view = await prisma.savedView.findFirst({
      where: {
        id: savedViewId,
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
        where: { userId: input.ownerUserId, isDefault: true },
        data: { isDefault: false },
      });

      return toStoredSavedView(await createView(tx));
    });
  },

  async setDefaultForUser(userId, savedViewId) {
    const view = await prisma.savedView.findFirst({
      where: {
        id: savedViewId,
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
        where: { userId, isDefault: true },
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
};
