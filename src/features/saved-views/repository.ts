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
  helpdeskConnectionId?: string;
  seedKey?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  preference?: SavedViewPreference;
};

export type CreateSavedViewInput = {
  ownerUserId: string;
  helpdeskConnectionId?: string;
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
    helpdeskConnectionId?: string,
  ): Promise<StoredSavedView[]>;
  findForUser(
    userId: string,
    savedViewId: string,
    helpdeskConnectionId?: string,
  ): Promise<StoredSavedView | null>;
  create(input: CreateSavedViewInput): Promise<StoredSavedView>;
  update(
    userId: string,
    savedViewId: string,
    helpdeskConnectionId: string,
    input: Omit<CreateSavedViewInput, "ownerUserId" | "helpdeskConnectionId" | "preference" | "seedKey" | "isSystem">,
  ): Promise<StoredSavedView | null>;
  deleteForUser(
    userId: string,
    savedViewId: string,
    helpdeskConnectionId: string,
  ): Promise<StoredSavedView | null>;
  setDefaultForUser(
    userId: string,
    savedViewId: string,
    helpdeskConnectionId: string,
  ): Promise<boolean>;
  reorderForUser(
    userId: string,
    helpdeskConnectionId: string,
    savedViewIds: string[],
  ): Promise<StoredSavedView[]>;
  findSeedForUser(
    userId: string,
    helpdeskConnectionId: string,
    seedKey: string,
  ): Promise<StoredSavedView | null>;
  isSeedDismissed(
    userId: string,
    helpdeskConnectionId: string,
    seedKey: string,
  ): Promise<boolean>;
  dismissSeed(
    userId: string,
    helpdeskConnectionId: string,
    seedKey: string,
  ): Promise<void>;
};
