"use client";

import { useCallback, useEffect } from "react";
import type { WorkspaceSavedView } from "@/features/saved-views/workspace";
import type { WorkspaceTicketGroupKey } from "@/features/tickets/workspace-adapter";
import {
  activeWorkspaceSavedView,
  workspaceSavedViewOptions,
} from "./ticket-workspace-saved-view-options";

type SavedViewListPager = {
  reloadSavedView(savedViewId: string): Promise<{
    groupBy?: WorkspaceTicketGroupKey;
    status: string;
  }>;
  savedViewId: string;
};

export function useTicketWorkspaceSavedViewSelection({
  clearRowSelection,
  handleGroupByChange,
  listPager,
  savedViews,
}: {
  clearRowSelection(): void;
  handleGroupByChange(groupBy: WorkspaceTicketGroupKey): void;
  listPager: SavedViewListPager;
  savedViews: WorkspaceSavedView[];
}) {
  const handleSavedViewChange = useCallback(async (nextSavedViewId: string) => {
    const result = await listPager.reloadSavedView(nextSavedViewId);
    if (result.status !== "available") {
      return;
    }
    clearRowSelection();
    handleGroupByChange(result.groupBy ?? "none");
  }, [clearRowSelection, handleGroupByChange, listPager]);

  useEffect(() => {
    if (savedViews.some((savedView) => savedView.id === listPager.savedViewId)) {
      return;
    }
    const nextSavedView =
      savedViews.find((savedView) => savedView.isDefault) ?? savedViews[0];
    if (!nextSavedView || nextSavedView.disabledReason) {
      return;
    }
    void handleSavedViewChange(nextSavedView.id);
  }, [handleSavedViewChange, listPager.savedViewId, savedViews]);

  return {
    activeSavedView: activeWorkspaceSavedView(savedViews, listPager.savedViewId),
    handleSavedViewChange,
    savedViewOptions: workspaceSavedViewOptions(savedViews),
  };
}
