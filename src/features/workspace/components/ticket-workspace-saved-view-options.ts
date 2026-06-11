import type { DropdownOption } from "@/components/ui";
import {
  allTicketsSavedViewId,
  type WorkspaceSavedView,
} from "@/features/saved-views/workspace";

export function workspaceSavedViewOptions(
  savedViews: WorkspaceSavedView[],
): DropdownOption[] {
  return savedViews.map((savedView) => ({
    value: savedView.id,
    label: savedView.disabledReason
      ? `${savedView.label} (${savedView.disabledLabel ?? "unsupported"})`
      : savedView.label,
    disabled: Boolean(savedView.disabledReason),
  }));
}

export function activeWorkspaceSavedView(
  savedViews: WorkspaceSavedView[],
  savedViewId: string,
) {
  return savedViews.find((savedView) => savedView.id === savedViewId) ??
    savedViews.find((savedView) => savedView.id === allTicketsSavedViewId);
}
