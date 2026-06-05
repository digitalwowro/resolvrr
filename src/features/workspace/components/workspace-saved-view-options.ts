import type { TicketListQueryCapabilities } from "@/core/providers";
import type { SavedViewSettingsData } from "@/features/saved-views/settings-model";
import {
  allTicketsSavedViewId,
  savedViewDisabledLabel,
  savedViewQueryRejection,
  type WorkspaceSavedView,
} from "@/features/saved-views/workspace";
import { compileSavedViewConditions } from "@/features/saved-views/conditions";

export function workspaceSavedViewOptionsFromSettingsData(
  data: SavedViewSettingsData,
  previousOptions: WorkspaceSavedView[],
  capabilities?: TicketListQueryCapabilities,
): WorkspaceSavedView[] {
  if (data.views.length === 0) {
    return [{ id: allTicketsSavedViewId, label: "All tickets" }];
  }

  const previousById = new Map(
    previousOptions.map((option) => [option.id, option]),
  );

  return data.views.map((view) => {
    const previous = previousById.get(view.id);
    const query =
      view.conditions.length > 0
        ? compileSavedViewConditions({
            conditions: view.conditions,
            currentUser: data.currentUser,
          })
        : previous?.query;
    const disabledReason = query
      ? savedViewQueryRejection(query, capabilities)
      : previous?.disabledReason;

    const option: WorkspaceSavedView = {
      ...previous,
      id: view.id,
      label: view.name,
      isDefault: view.isDefault,
      ...(query ? { query } : {}),
    };

    if (disabledReason) {
      return {
        ...option,
        disabledLabel: savedViewDisabledLabel(disabledReason),
        disabledReason,
      };
    }

    delete option.disabledLabel;
    delete option.disabledReason;
    return option;
  });
}
