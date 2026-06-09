"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { allTicketsSavedViewId } from "@/features/saved-views/workspace";
import type { WorkspaceTicketListGroup } from "@/features/tickets/list-page-action-result";
import { workspaceTicketTabs } from "@/features/tickets/workspace-adapter";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
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

function normalizedWorkspaceSearch(query: string) {
  return query.trim().toLocaleLowerCase();
}

function ticketMatchesWorkspaceSearch(
  ticket: WorkspaceTicketRow,
  normalizedQuery: string,
) {
  return [
    ticket.number,
    ticket.title,
    ticket.customer,
    ticket.owner,
    ticket.group,
    ticket.state,
    ticket.priority,
  ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

function filterLoadedTickets(
  rows: WorkspaceTicketRow[],
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) =>
    ticketMatchesWorkspaceSearch(row, normalizedQuery),
  );
}

function filterLoadedTicketGroups(
  groups: WorkspaceTicketListGroup[] | undefined,
  normalizedQuery: string,
) {
  if (!groups || !normalizedQuery) {
    return groups;
  }

  return groups.flatMap((group) => {
    const rows = filterLoadedTickets(group.rows, normalizedQuery);
    return rows.length > 0
      ? [
          {
            id: group.id,
            key: group.key,
            label: group.label,
            value: group.value,
            rows,
            loadedCount: rows.length,
          },
        ]
      : [];
  });
}

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
  const providerGroupedActive =
    providerGroupingEnabled &&
    (groupBy === "state" || groupBy === "priority") &&
    listPager.groupBy === groupBy &&
    listPager.groups !== undefined;
  const tableGroupedRows = providerGroupedActive
    ? searchFilteredGroups
    : groupedRows;
  const tableRows = providerGroupedActive ? searchFilteredRows : sortedRows;
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
        onTabOrientationChange={setTabOrientation}
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
        tabOrientation={tabOrientation}
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
        recentTickets={recentTicketTabs}
        searchQuery={workspaceSearchQuery}
        setActiveConnectionAction={setActiveConnectionAction}
        userEmail={userEmail}
      />
      <section
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          tabOrientation === "horizontal" && "flex-col",
          tabOrientation === "vertical" && "pt-4",
        )}
      >
        {tabOrientation === "vertical" ? tabsPanel : null}
        {tabOrientation === "horizontal" ? (
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 pb-2 pt-4">
            {tabsPanel}
          </div>
        ) : null}
        {listActive || tabOrientation === "vertical" ? (
          <div
            key="workspace-content"
            className="flex min-w-0 flex-1 flex-col overflow-hidden px-4"
          >
            {workArea}
          </div>
        ) : (
          workArea
        )}
      </section>
    </>
  );
}
