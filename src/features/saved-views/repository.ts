import type {
  SavedView,
  SavedViewQuery,
  SavedViewVisibility,
} from "@/core/saved-views";

export type SavedViewPreference = {
  position: number;
  isDefault: boolean;
};

export type StoredSavedView = SavedView & {
  ownerUserId: string;
  workspaceId?: string;
  seedKey?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  preference?: SavedViewPreference;
};

export type CreateSavedViewInput = {
  ownerUserId: string;
  workspaceId?: string;
  name: string;
  visibility: SavedViewVisibility;
  iconName?: string;
  colorName?: string;
  query: SavedViewQuery;
  seedKey?: string;
  isSystem?: boolean;
  preference?: SavedViewPreference;
};

export type SavedViewsRepository = {
  listForUser(
    userId: string,
    workspaceId?: string,
  ): Promise<StoredSavedView[]>;
  findForUser(
    userId: string,
    savedViewId: string,
    workspaceId?: string,
  ): Promise<StoredSavedView | null>;
  create(input: CreateSavedViewInput): Promise<StoredSavedView>;
  update(
    userId: string,
    savedViewId: string,
    workspaceId: string,
    input: Omit<CreateSavedViewInput, "workspaceId" | "preference" | "seedKey" | "isSystem">,
  ): Promise<StoredSavedView | null>;
  deleteForUser(
    userId: string,
    savedViewId: string,
    workspaceId: string,
  ): Promise<StoredSavedView | null>;
  setDefaultForUser(
    userId: string,
    savedViewId: string,
    workspaceId: string,
  ): Promise<boolean>;
  reorderForUser(
    userId: string,
    workspaceId: string,
    savedViewIds: string[],
  ): Promise<StoredSavedView[]>;
  findSeedForUser(
    userId: string,
    workspaceId: string,
    seedKey: string,
  ): Promise<StoredSavedView | null>;
  isSeedDismissed(
    userId: string,
    workspaceId: string,
    seedKey: string,
  ): Promise<boolean>;
  dismissSeed(
    userId: string,
    workspaceId: string,
    seedKey: string,
  ): Promise<void>;
};
