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
  preference?: SavedViewPreference;
};

export type SavedViewsRepository = {
  listForUser(
    userId: string,
    helpdeskConnectionId?: string,
  ): Promise<StoredSavedView[]>;
  create(input: CreateSavedViewInput): Promise<StoredSavedView>;
  setDefaultForUser(userId: string, savedViewId: string): Promise<boolean>;
};
