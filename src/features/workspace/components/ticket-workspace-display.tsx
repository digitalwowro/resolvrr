"use client";

import { useMemo, useState } from "react";
import { workspaceTicketTabs } from "@/features/tickets/workspace-adapter";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { useTicketListPager } from "./use-ticket-list-pager";
import { useTicketWorkspaceAutoRefresh } from "./use-ticket-workspace-auto-refresh";
import { mergeTicketTabs } from "./ticket-tabs-merge";
import { tabLinkTarget } from "./ticket-workspace-link-targets";
import { TicketWorkspaceContent } from "./ticket-workspace-content";
import {
  activeTicketSummaryFromWorkspace,
  isProviderGroupedListActive,
} from "./ticket-workspace-display-derived";
import {
  filterLoadedTicketGroups,
  filterLoadedTickets,
  normalizedWorkspaceSearch,
} from "./ticket-workspace-display-filters";
import {
  TicketWorkspaceDetailArea,
  TicketWorkspaceListArea,
} from "./ticket-workspace-work-area";
import type { TicketWorkspaceDisplayProps } from "./ticket-workspace-display-types";
import {
  WorkspaceHeaderChrome,
  WorkspaceTabsChrome,
} from "./ticket-workspace-chrome";
import { useTicketWorkspaceSavedViewSelection } from "./use-ticket-workspace-saved-view-selection";

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
  summarizeTicketAction,
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
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
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
  const normalizedSearchQuery = normalizedWorkspaceSearch(workspaceSearchQuery);
  const searchFilteredRows = useMemo(
    () => filterLoadedTickets(listPager.rows, normalizedSearchQuery),
    [listPager.rows, normalizedSearchQuery],
  );
  const searchFilteredGroups = useMemo(
    () => filterLoadedTicketGroups(listPager.groups, normalizedSearchQuery),
    [listPager.groups, normalizedSearchQuery],
  );
  const searchActive = normalizedSearchQuery.length > 0;
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
    rows: searchFilteredRows,
    initialWorkspaceOpenTabsState,
    saveWorkspaceOpenTabsStateAction,
    selectedTicketId,
    ticketTabs: pagedTicketTabs,
  });
  const providerGroupedActive = isProviderGroupedListActive({
    groupBy,
    listGroupBy: listPager.groupBy,
    listGroups: listPager.groups,
    providerGroupingEnabled,
  });
  const tableGroupedRows = providerGroupedActive
    ? searchFilteredGroups
    : groupedRows;
  const tableRows = providerGroupedActive ? searchFilteredRows : sortedRows;
  const recentlyViewedLinkTargets = recentTicketTabs.map(tabLinkTarget);
  const activeTicketSummary = activeTicketSummaryFromWorkspace({
    activeTicketId,
    openTicketTabs,
    tableRows,
  });
  const {
    activeSavedView,
    handleSavedViewChange,
    savedViewOptions,
  } = useTicketWorkspaceSavedViewSelection({
    clearRowSelection,
    handleGroupByChange,
    listPager,
    savedViews,
  });

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

  function handleRefreshList() {
    refreshList();
    void listPager.silentRefreshCurrentPage();
  }

  const workArea =
    listActive ? (
      <TicketWorkspaceListArea
        activeTicketId={activeTicketId}
        allSelected={allSelected}
        canLoadMore={
          !searchActive && !providerGroupedActive && listPager.canLoadMore
        }
        columns={columns}
        emptyMessage={
          searchActive ? "No loaded tickets match this filter." : undefined
        }
        groupedRows={tableGroupedRows}
        groupBy={groupBy}
        groupLoadMoreError={listPager.groupError}
        loadingGroupId={listPager.loadingGroupId}
        loadingMore={listPager.loading}
        loadMoreError={listPager.errorReason}
        loadedCount={searchActive ? tableRows.length : listPager.loadedCount}
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
        rows={tableRows}
        savedViewOptions={savedViewOptions}
        selectedRowIds={selectedRowIds}
        selectedSavedViewId={listPager.savedViewId}
        sortingEnabled={sortingEnabled && !providerGroupedActive}
        sortDirectionFor={sortDirectionFor}
        totalCount={searchActive ? undefined : listPager.totalCount}
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
        summarizeTicketAction={summarizeTicketAction}
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
        onSearchQueryChange={setWorkspaceSearchQuery}
        onTabOrientationChange={setTabOrientation}
        recentTickets={recentTicketTabs}
        searchQuery={workspaceSearchQuery}
        setActiveConnectionAction={setActiveConnectionAction}
        tabOrientation={tabOrientation}
        userEmail={userEmail}
      />
      <TicketWorkspaceContent
        listActive={listActive}
        tabOrientation={tabOrientation}
        tabsPanel={tabsPanel}
        workArea={workArea}
      />
    </>
  );
}
