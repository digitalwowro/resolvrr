import { SavedViewVisibility as DbSavedViewVisibility } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  savedViewQueryFromStorage,
  type SavedViewVisibility,
} from "@/core/saved-views";
import type { SavedViewPreference, StoredSavedView } from "@/features/saved-views/repository";

export const savedViewSelect = {
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

export function toDbVisibility(
  visibility: SavedViewVisibility,
): DbSavedViewVisibility {
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

export function toStoredSavedView(
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

export function visibleViewWhere(
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

export function sortedViews(views: StoredSavedView[]) {
  return views.sort(
    (left, right) =>
      (left.preference?.position ?? Number.MAX_SAFE_INTEGER) -
        (right.preference?.position ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name),
  );
}

export function dismissedSeedKeys(
  value: Prisma.JsonValue | null | undefined,
): string[] {
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
