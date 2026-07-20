"use client";

import type { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import type { useTicketListPager } from "./use-ticket-list-pager";
import type { TicketWorkspaceDisplayProps } from "./ticket-workspace-display-types";
import type { useTicketSearchController } from "./use-ticket-search-controller";
import {
  TicketWorkspaceDetailArea,
  type TicketWorkspaceDetailAreaProps,
} from "./ticket-workspace-work-area";
import {
  TicketWorkspaceListArea,
  type TicketWorkspaceListAreaProps,
} from "./ticket-workspace-list-area";
import { TicketWorkspaceSearchArea } from "./ticket-workspace-search-area";

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
  ticketSearch: ReturnType<typeof useTicketSearchController>;
  searchTicketLinkTargetsAction: TicketWorkspaceDisplayProps["searchTicketLinkTargetsAction"];
  summarizeTicketAction: TicketWorkspaceDisplayProps["summarizeTicketAction"];
  tableGroupedRows: TicketWorkspaceListAreaProps["groupedRows"];
  tableRows: TicketWorkspaceListAreaProps["rows"];
  updateTicketMetadataAction: TicketWorkspaceDisplayProps["updateTicketMetadataAction"];
  userId: TicketWorkspaceDisplayProps["userId"];
  workspaceId: TicketWorkspaceDisplayProps["workspaceId"];
  helpdeskConnectionId: TicketWorkspaceDisplayProps["helpdeskConnectionId"];
  identityVersion: TicketWorkspaceDisplayProps["identityVersion"];
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
  ticketSearch,
  searchTicketLinkTargetsAction,
  summarizeTicketAction,
  tableGroupedRows,
  tableRows,
  updateTicketMetadataAction,
  userId,
  workspaceId,
  helpdeskConnectionId,
  identityVersion,
}: TicketWorkspaceDisplayWorkAreaProps) {
  if (displayState.listActive) {
    if (ticketSearch.detailedActive) {
      return (
        <TicketWorkspaceSearchArea
          activeTicketId={displayState.activeTicketId}
          allSelected={displayState.allSelected}
          canLoadMore={ticketSearch.canLoadMore}
          columns={columns}
          error={ticketSearch.detailedError}
          insetContent={displayState.tabOrientation === "vertical"}
          loading={ticketSearch.detailedLoading}
          loadedCount={ticketSearch.detailedRows.length}
          onClear={ticketSearch.clear}
          onLoadMore={ticketSearch.loadMore}
          onRefresh={ticketSearch.refresh}
          onRowSelect={displayState.showTicketFromRow}
          onSelectAll={displayState.toggleSelectAll}
          onSort={ticketSearch.toggleSort}
          onToggleRow={displayState.toggleRow}
          partiallySelected={displayState.partiallySelected}
          query={ticketSearch.detailedQuery || ticketSearch.query}
          rows={ticketSearch.detailedRows}
          selectedRowIds={displayState.selectedRowIds}
          sortingEnabled
          sortDirectionFor={ticketSearch.sortDirectionFor}
          totalCount={ticketSearch.detailedTotalCount}
          visibleColumns={displayState.visibleColumnSet}
        />
      );
    }
    return (
      <TicketWorkspaceListArea
        activeTicketId={displayState.activeTicketId}
        allSelected={displayState.allSelected}
        canLoadMore={!providerGroupedActive && listPager.canLoadMore}
        columns={columns}
        completeSortError={listPager.completeSortError}
        completeSortProgress={listPager.completeSortProgress}
        groupedRows={tableGroupedRows}
        groupBy={displayState.groupBy}
        groupLoadMoreError={listPager.groupError}
        insetContent={displayState.tabOrientation === "vertical"}
        loadingGroupId={listPager.loadingGroupId}
        loadingMore={listPager.loading}
        loadMoreError={listPager.errorReason}
        loadedCount={listPager.loadedCount}
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
        sortingEnabled={
          displayState.sortingEnabled &&
          !providerGroupedActive &&
          !listPager.loading
        }
        sortDirectionFor={displayState.sortDirectionFor}
        totalCount={listPager.totalCount}
        visibleColumns={displayState.visibleColumnSet}
      />
    );
  }

  const hydratedInitialTicketAiSummary =
    displayState.activeDetail?.status === "available"
      ? displayState.activeDetail.initialTicketAiSummary ??
        (displayState.activeDetail.summaryHydrated
          ? undefined
          : initialTicketAiSummary)
      : initialTicketAiSummary;

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
      initialTicketAiSummary={hydratedInitialTicketAiSummary}
      onTicketAiSummaryAvailable={displayState.setTicketAiSummary}
      refreshing={displayState.ticketDetailRefreshing}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userId={userId}
      workspaceId={workspaceId}
      helpdeskConnectionId={helpdeskConnectionId}
      identityVersion={identityVersion}
    />
  );
}
