"use client";

import type { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import type { useTicketListPager } from "./use-ticket-list-pager";
import type { TicketWorkspaceDisplayProps } from "./ticket-workspace-display-types";
import {
  TicketWorkspaceDetailArea,
  type TicketWorkspaceDetailAreaProps,
  TicketWorkspaceListArea,
  type TicketWorkspaceListAreaProps,
} from "./ticket-workspace-work-area";

type TicketWorkspaceDisplayWorkAreaProps = {
  activeTicketSummary: TicketWorkspaceDetailAreaProps["activeTicketSummary"];
  columns: TicketWorkspaceDisplayProps["columns"];
  communicationCapabilities: TicketWorkspaceDisplayProps["communicationCapabilities"];
  displayState: ReturnType<typeof useTicketWorkspaceDisplayState>;
  handleRefreshList(): void;
  handleSavedViewChange: TicketWorkspaceListAreaProps["onSavedViewChange"];
  handleWorkspaceGroupByChange: TicketWorkspaceListAreaProps["onGroupByChange"];
  initialTicketAiSummary: TicketWorkspaceDisplayProps["initialTicketAiSummary"];
  listPager: ReturnType<typeof useTicketListPager>;
  metadataMutationCapabilities: TicketWorkspaceDisplayProps["metadataMutationCapabilities"];
  providerGroupedActive: boolean;
  providerGroupingEnabled: boolean;
  recentlyViewedLinkTargets: TicketWorkspaceDetailAreaProps["recentlyViewedLinkTargets"];
  rephraseStyleOptions: TicketWorkspaceDisplayProps["rephraseStyleOptions"];
  rewriteDraftAction: TicketWorkspaceDisplayProps["rewriteDraftAction"];
  savedViewOptions: TicketWorkspaceListAreaProps["savedViewOptions"];
  searchActive: boolean;
  searchTicketLinkTargetsAction: TicketWorkspaceDisplayProps["searchTicketLinkTargetsAction"];
  summarizeTicketAction: TicketWorkspaceDisplayProps["summarizeTicketAction"];
  tableGroupedRows: TicketWorkspaceListAreaProps["groupedRows"];
  tableRows: TicketWorkspaceListAreaProps["rows"];
  updateTicketMetadataAction: TicketWorkspaceDisplayProps["updateTicketMetadataAction"];
  userId: TicketWorkspaceDisplayProps["userId"];
  workspaceId: TicketWorkspaceDisplayProps["workspaceId"];
};

export function TicketWorkspaceDisplayWorkArea({
  activeTicketSummary,
  columns,
  communicationCapabilities,
  displayState,
  handleRefreshList,
  handleSavedViewChange,
  handleWorkspaceGroupByChange,
  initialTicketAiSummary,
  listPager,
  metadataMutationCapabilities,
  providerGroupedActive,
  providerGroupingEnabled,
  recentlyViewedLinkTargets,
  rephraseStyleOptions,
  rewriteDraftAction,
  savedViewOptions,
  searchActive,
  searchTicketLinkTargetsAction,
  summarizeTicketAction,
  tableGroupedRows,
  tableRows,
  updateTicketMetadataAction,
  userId,
  workspaceId,
}: TicketWorkspaceDisplayWorkAreaProps) {
  if (displayState.listActive) {
    return (
      <TicketWorkspaceListArea
        activeTicketId={displayState.activeTicketId}
        allSelected={displayState.allSelected}
        canLoadMore={
          !searchActive && !providerGroupedActive && listPager.canLoadMore
        }
        columns={columns}
        emptyMessage={
          searchActive ? "No loaded tickets match this filter." : undefined
        }
        groupedRows={tableGroupedRows}
        groupBy={displayState.groupBy}
        groupLoadMoreError={listPager.groupError}
        loadingGroupId={listPager.loadingGroupId}
        loadingMore={listPager.loading}
        loadMoreError={listPager.errorReason}
        loadedCount={searchActive ? tableRows.length : listPager.loadedCount}
        onColumnToggle={displayState.toggleColumn}
        onGroupByChange={handleWorkspaceGroupByChange}
        onLoadMore={listPager.loadMore}
        onLoadMoreGroup={listPager.loadMoreGroup}
        onRefresh={handleRefreshList}
        onRowSelect={displayState.showTicketFromRow}
        onSavedViewChange={handleSavedViewChange}
        onSelectAll={displayState.toggleSelectAll}
        onSort={displayState.toggleSort}
        onToggleRow={displayState.toggleRow}
        partiallySelected={displayState.partiallySelected}
        providerGroupingEnabled={providerGroupingEnabled}
        refreshing={listPager.silentRefreshing}
        rows={tableRows}
        savedViewOptions={savedViewOptions}
        selectedRowIds={displayState.selectedRowIds}
        selectedSavedViewId={listPager.savedViewId}
        sortingEnabled={displayState.sortingEnabled && !providerGroupedActive}
        sortDirectionFor={displayState.sortDirectionFor}
        totalCount={searchActive ? undefined : listPager.totalCount}
        visibleColumns={displayState.visibleColumnSet}
      />
    );
  }

  return (
    <TicketWorkspaceDetailArea
      activeDetail={displayState.activeDetail}
      activeTicketId={displayState.activeTicketId}
      activeTicketSummary={activeTicketSummary}
      communicationCapabilities={communicationCapabilities}
      metadataMutationCapabilities={metadataMutationCapabilities}
      onMetadataSaved={displayState.updateOpenTicketTabMetadata}
      onMetadataSavedDetailRefresh={displayState.refreshSavedTicketDetail}
      onRefresh={displayState.refreshActiveTicketDetail}
      onReturnToListAfterUpdate={displayState.returnActiveTicketToList}
      recentlyViewedLinkTargets={recentlyViewedLinkTargets}
      rephraseStyleOptions={rephraseStyleOptions}
      roundedTop={displayState.tabOrientation === "vertical"}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      rewriteDraftAction={rewriteDraftAction}
      summarizeTicketAction={summarizeTicketAction}
      initialTicketAiSummary={initialTicketAiSummary}
      refreshing={displayState.ticketDetailRefreshing}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userId={userId}
      workspaceId={workspaceId}
    />
  );
}
