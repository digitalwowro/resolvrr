import type { ProviderLookupOption } from "@/core/providers";
import {
  isSavedViewColorName,
  type SavedViewColorName,
  type SavedViewCondition,
  type SavedViewVisibility,
} from "@/core/saved-views";
import type { StoredSavedView } from "./repository";
import type { SavedViewManageInput, SavedViewMutationCode } from "./service";

export type SavedViewSettingsView = {
  id: string;
  name: string;
  visibility: SavedViewVisibility;
  iconName?: string;
  colorName?: SavedViewColorName;
  seedKey?: string;
  isDefault: boolean;
  position: number;
  conditions: SavedViewCondition[];
};

export type SavedViewSettingsData = {
  views: SavedViewSettingsView[];
  defaultSavedViewId?: string;
  ownerOptions: ProviderLookupOption[];
  groupOptions: ProviderLookupOption[];
  currentUser?: ProviderLookupOption;
  canManageShared: boolean;
};

export type SavedViewSettingsActionResult = {
  ok: boolean;
  code: SavedViewMutationCode;
  data: SavedViewSettingsData;
};

export type SaveWorkspaceSavedViewAction = (
  input: SavedViewManageInput,
) => Promise<SavedViewSettingsActionResult>;

export type DeleteWorkspaceSavedViewAction = (
  savedViewId: string,
) => Promise<SavedViewSettingsActionResult>;

export type SetDefaultWorkspaceSavedViewAction = (
  savedViewId: string,
) => Promise<SavedViewSettingsActionResult>;

export type ReorderWorkspaceSavedViewsAction = (
  savedViewIds: string[],
) => Promise<SavedViewSettingsActionResult>;

export type LoadWorkspaceSavedViewsSettingsAction =
  () => Promise<SavedViewSettingsData>;

export function savedViewSettingsDataFromStored({
  canManageShared,
  currentUser,
  groupOptions,
  ownerOptions,
  views,
}: {
  views: StoredSavedView[];
  ownerOptions?: ProviderLookupOption[];
  groupOptions?: ProviderLookupOption[];
  currentUser?: ProviderLookupOption;
  canManageShared: boolean;
}): SavedViewSettingsData {
  return {
    views: views.map((view, index) => ({
      id: view.id,
      name: view.name,
      visibility: view.visibility,
      ...(view.iconName ? { iconName: view.iconName } : {}),
      ...(isSavedViewColorName(view.colorName) ? { colorName: view.colorName } : {}),
      ...(view.seedKey ? { seedKey: view.seedKey } : {}),
      isDefault: Boolean(view.preference?.isDefault),
      position: view.preference?.position ?? index,
      conditions: view.query.conditions ?? [],
    })),
    defaultSavedViewId: views.find((view) => view.preference?.isDefault)?.id,
    ownerOptions: ownerOptions ?? [],
    groupOptions: groupOptions ?? [],
    ...(currentUser ? { currentUser } : {}),
    canManageShared,
  };
}
