import { createElement } from "react";
import type { DropdownOption } from "@/components/ui";
import {
  allTicketsSavedViewId,
  type WorkspaceSavedView,
} from "@/features/saved-views/workspace";
import { ViewIcon } from "./workspace-settings-views-utils";

export function workspaceSavedViewOptions(
  savedViews: WorkspaceSavedView[],
): DropdownOption[] {
  return savedViews.map((savedView) => ({
    value: savedView.id,
    label: savedView.disabledReason
      ? `${savedView.label} (${savedView.disabledLabel ?? "unsupported"})`
      : savedView.label,
    icon: createElement(ViewIcon, { iconName: savedView.iconName }),
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
