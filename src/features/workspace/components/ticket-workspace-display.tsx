"use client";

import { useCallback, useEffect } from "react";
import type { DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  allTicketsSavedViewId,
} from "@/features/saved-views/workspace";
import {
  workspaceTicketTabs,
} from "@/features/tickets/workspace-adapter";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { useTicketListPager } from "./use-ticket-list-pager";
import { useTicketWorkspaceAutoRefresh } from "./use-ticket-workspace-auto-refresh";
import { mergeTicketTabs } from "./ticket-tabs-merge";
import { tabLinkTarget } from "./ticket-workspace-link-targets";
import {
  TicketWorkspaceDetailArea,
  TicketWorkspaceListArea,
} from "./ticket-workspace-work-area";
import type { TicketWorkspaceDisplayProps } from "./ticket-workspace-display-types";
import {
  WorkspaceHeaderChrome,
  WorkspaceTabsChrome,
} from "./ticket-workspace-chrome";

export function TicketWorkspaceDisplay({
  connections,
  columns,
  communicationCapabilities,
  detail,
  detailResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  loadWorkspaceNotificationsAction,
  logoutAction,
  markWorkspaceNotificationsReadAction,
  onOpenSettings,
  metadataMutationCapabilities,
  initialListGroups,
  nextListCursor,
  providerGroupingEnabled,
  providerSortEnabled,
  refreshTicketDetailAfterMetadataSave,
  rows,
  searchTicketLinkTargetsAction,
  savedViews,
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
  selectedSavedViewId,
  selectedTicketId,
  setActiveConnectionAction,
  tabs: ticketTabs,
  totalListCount,
  updateTicketMetadataAction,
  userEmail,
}: TicketWorkspaceDisplayProps) {
  const listPager = useTicketListPager({
    initialSavedViewId: selectedSavedViewId,
    initialRows: rows,
    initialGroups: initialListGroups,
    initialNextCursor: nextListCursor,
    initialTotalCount: totalListCount,
    loadTicketListPageAction,
  });
  const pagedTicketTabs = mergeTicketTabs(
    ticketTabs,
    workspaceTicketTabs(listPager.rows),
  );
  const {
    activeDetail,
    activeTicketId,
    allSelected,
    closeTicket,
    clearRowSelection,
    groupBy,
    groupedRows,
    handleGroupByChange,
    isActiveTicketDetailStale,
    listActive,
    openTicketTabs,
    partiallySelected,
    recentTicketTabs,
    refreshActiveTicketDetail,
    refreshTicketDetailById,
    refreshList,
    refreshSavedTicketDetail,
    reorderOpenTicketTabs,
    returnActiveTicketToList,
    selectedRowIds,
    setTabOrientation,
    showList,
    showNotificationTicket,
    showOpenTicket,
    showTicketFromRow,
    sortDirectionFor,
    sortingEnabled,
    sortedRows,
    tabOrientation,
    ticketDetailRefreshing,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort,
    updateOpenTicketTabMetadata,
    visibleColumnSet,
  } = useTicketWorkspaceDisplayState({
    columns,
    detail,
    detailResult,
    localSortEnabled: !providerSortEnabled && !listPager.hasMorePages,
    loadTicketDetailAction,
    onProviderSortChange: listPager.reloadFirstPage,
    providerSortEnabled,
    refreshTicketDetailAfterMetadataSave,
    rows: listPager.rows,
    initialWorkspaceOpenTabsState,
    saveWorkspaceOpenTabsStateAction,
    selectedTicketId,
    ticketTabs: pagedTicketTabs,
  });
  const providerGroupedActive =
    providerGroupingEnabled &&
    (groupBy === "state" || groupBy === "priority") &&
    listPager.groupBy === groupBy &&
    listPager.groups !== undefined;
  const tableGroupedRows = providerGroupedActive ? listPager.groups : groupedRows;
  const tableRows = providerGroupedActive ? listPager.rows : sortedRows;
  const recentlyViewedLinkTargets = recentTicketTabs.map(tabLinkTarget);
  const activeTicketSummary = activeTicketId
    ? tableRows.find((ticket) => ticket.id === activeTicketId) ??
      openTicketTabs.find((ticket) => ticket.id === activeTicketId)
    : undefined;
  const savedViewOptions: DropdownOption[] = savedViews.map((savedView) => ({
    value: savedView.id,
    label: savedView.disabledReason
      ? `${savedView.label} (${savedView.disabledLabel ?? "unsupported"})`
      : savedView.label,
    disabled: Boolean(savedView.disabledReason),
  }));
  const activeSavedView =
    savedViews.find((savedView) => savedView.id === listPager.savedViewId) ??
    savedViews.find((savedView) => savedView.id === allTicketsSavedViewId);

  useTicketWorkspaceAutoRefresh({
    activeTicketId,
    isActiveTicketDetailStale,
    isListRefreshAvailable: Boolean(loadTicketListPageAction),
    isListStale: listPager.isListStale,
    listActive,
    refreshActiveTicketDetail,
    silentRefreshCurrentPage: listPager.silentRefreshCurrentPage,
  });

  function handleWorkspaceGroupByChange(nextGroupBy: typeof groupBy) {
    handleGroupByChange(nextGroupBy);
    if (
      providerGroupingEnabled &&
      (nextGroupBy === "state" || nextGroupBy === "priority")
    ) {
      listPager.reloadGroupedFirstPage(nextGroupBy);
      return;
    }
    if (providerGroupedActive || listPager.groupBy) {
      listPager.reloadFirstPage();
    }
  }

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

  function handleRefreshList() {
    refreshList();
    void listPager.silentRefreshCurrentPage();
  }

  const workArea =
    listActive ? (
      <TicketWorkspaceListArea
        activeTicketId={activeTicketId}
        allSelected={allSelected}
        canLoadMore={!providerGroupedActive && listPager.canLoadMore}
        columns={columns}
        groupedRows={tableGroupedRows}
        groupBy={groupBy}
        groupLoadMoreError={listPager.groupError}
        loadingGroupId={listPager.loadingGroupId}
        loadingMore={listPager.loading}
        loadMoreError={listPager.errorReason}
        loadedCount={listPager.loadedCount}
        onColumnToggle={toggleColumn}
        onGroupByChange={handleWorkspaceGroupByChange}
        onLoadMore={listPager.loadMore}
        onLoadMoreGroup={listPager.loadMoreGroup}
        onRefresh={handleRefreshList}
        onRowSelect={showTicketFromRow}
        onSavedViewChange={handleSavedViewChange}
        onSelectAll={toggleSelectAll}
        onSort={toggleSort}
        onToggleRow={toggleRow}
        partiallySelected={partiallySelected}
        providerGroupingEnabled={providerGroupingEnabled}
        refreshing={listPager.silentRefreshing}
        roundedTop={tabOrientation === "vertical"}
        rows={tableRows}
        savedViewOptions={savedViewOptions}
        selectedRowIds={selectedRowIds}
        selectedSavedViewId={listPager.savedViewId}
        sortingEnabled={sortingEnabled && !providerGroupedActive}
        sortDirectionFor={sortDirectionFor}
        totalCount={listPager.totalCount}
        visibleColumns={visibleColumnSet}
      />
    ) : (
      <TicketWorkspaceDetailArea
        activeDetail={activeDetail}
        activeTicketId={activeTicketId}
        activeTicketSummary={activeTicketSummary}
        communicationCapabilities={communicationCapabilities}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onMetadataSaved={updateOpenTicketTabMetadata}
        onMetadataSavedDetailRefresh={refreshSavedTicketDetail}
        onRefresh={refreshActiveTicketDetail}
        onReturnToListAfterUpdate={returnActiveTicketToList}
        recentlyViewedLinkTargets={recentlyViewedLinkTargets}
        roundedTop={tabOrientation === "vertical"}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        refreshing={ticketDetailRefreshing}
        updateTicketMetadataAction={updateTicketMetadataAction}
      />
    );

  const tabsPanel = (
    <WorkspaceTabsChrome
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={closeTicket}
      onReorderTicket={reorderOpenTicketTabs}
      onSelectList={showList}
      onSelectTicket={showOpenTicket}
      orientation={tabOrientation}
      savedViewLabel={activeSavedView?.label ?? "All tickets"}
      tabs={openTicketTabs}
    />
  );

  return (
    <>
      <WorkspaceHeaderChrome
        activeTicketId={activeTicketId}
        connections={connections}
        loadNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={logoutAction}
        markNotificationsReadAction={markWorkspaceNotificationsReadAction}
        onOpenNotificationTicket={showNotificationTicket}
        onOpenSettings={onOpenSettings}
        onRefreshTicket={refreshTicketDetailById}
        onTabOrientationChange={setTabOrientation}
        recentTickets={recentTicketTabs}
        setActiveConnectionAction={setActiveConnectionAction}
        tabOrientation={tabOrientation}
        userEmail={userEmail}
      />
      <section
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden pt-4",
          tabOrientation === "horizontal" && "flex-col",
        )}
      >
        {tabOrientation === "vertical" ? tabsPanel : null}
        <div
          key="workspace-content"
          className="flex min-w-0 flex-1 flex-col overflow-hidden px-4"
        >
          {tabOrientation === "horizontal" ? tabsPanel : null}
          {workArea}
        </div>
      </section>
    </>
  );
}
