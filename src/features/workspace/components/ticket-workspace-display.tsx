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
import type { TicketWorkspaceDisplayProps } from "./ticket-workspace-display-types";
import { WorkspaceHeaderChrome, WorkspaceTabsChrome } from "./ticket-workspace-chrome";
import { useTicketWorkspaceSavedViewSelection } from "./use-ticket-workspace-saved-view-selection";
import { clearPersistedCommunicationDrafts } from "./ticket-communication-draft-persistence";
import { TicketWorkspaceDisplayWorkArea } from "./ticket-workspace-display-work-area";
import { TicketMergeNotice } from "./ticket-merge-notice";
import { hiddenTaskbarSyncCount, TaskbarSyncNotice } from "./taskbar-sync-notice";
import { useSynchronizedTicketWorkspaceActions } from "./use-synchronized-ticket-workspace-actions";
import { isCompleteListSortKey } from "./ticket-table-grouping";

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
  rephraseStyleOptions,
  rows,
  searchTicketLinkTargetsAction,
  rewriteDraftAction,
  savedViews,
  summarizeTicketAction,
  synchronizeWorkspaceTaskbarAction,
  initialTicketAiSummary,
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
  saveWorkspaceSelectedSavedViewAction,
  selectedSavedViewId,
  selectedTicketId,
  setActiveConnectionAction,
  tabs: ticketTabs,
  totalListCount,
  updateTicketMetadataAction,
  userAvatarDataUrl,
  userDisplayName,
  userEmail,
  userFirstName,
  userId,
  workspaceId,
  helpdeskConnectionId,
  identityVersion,
  userLastName,
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
  function handleListSortChange(sort: Parameters<typeof listPager.reloadFirstPage>[0]) {
    if (sort && isCompleteListSortKey(sort.key)) {
      void listPager.applyCompleteListSort(sort);
      return;
    }
    void listPager.reloadFirstPage(sort);
  }
  const displayState = useTicketWorkspaceDisplayState({
    columns,
    detail,
    detailResult,
    localSortEnabled: !providerSortEnabled && !listPager.hasMorePages,
    loadTicketDetailAction,
    onProviderSortChange: handleListSortChange,
    providerSortEnabled,
    refreshTicketDetailAfterMetadataSave,
    rows: searchFilteredRows,
    initialWorkspaceOpenTabsState,
    saveWorkspaceOpenTabsStateAction,
    selectedTicketId,
    ticketTabs: pagedTicketTabs,
    workspaceId,
  });
  const {
    activeTicketId,
    closeTicket,
    clearRowSelection,
    groupBy,
    groupedRows,
    handleGroupByChange,
    isActiveTicketDetailStale,
    listActive,
    openTicketTabs,
    recentTicketTabs,
    refreshActiveTicketDetail,
    refreshTicketDetailById,
    refreshList,
    setTabOrientation,
    sortedRows,
    tabOrientation,
  } = displayState;
  const providerGroupedActive = isProviderGroupedListActive({
    groupBy,
    listGroupBy: listPager.groupBy,
    listGroups: listPager.groups,
    providerGroupingEnabled,
  });
  const tableGroupedRows = providerGroupedActive ? searchFilteredGroups : groupedRows;
  const tableRows = providerGroupedActive ? searchFilteredRows : sortedRows;
  const recentlyViewedLinkTargets = recentTicketTabs.map(tabLinkTarget);
  const activeTicketSummary = activeTicketSummaryFromWorkspace({
    activeTicketId,
    openTicketTabs,
    tableRows,
  });
  const { activeSavedView, handleSavedViewChange, savedViewOptions } =
    useTicketWorkspaceSavedViewSelection({
    clearRowSelection,
    handleGroupByChange,
    listPager,
    saveWorkspaceSelectedSavedViewAction,
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

  function handleCloseTicket(ticketId: string) {
    if (userId && workspaceId && helpdeskConnectionId && identityVersion) {
      void clearPersistedCommunicationDrafts({
        ticketExternalId: ticketId,
        userId,
        workspaceId,
        helpdeskConnectionId,
        identityVersion,
      });
    }
    closeTicket(ticketId);
  }

  const synchronized = useSynchronizedTicketWorkspaceActions({
    action: synchronizeWorkspaceTaskbarAction,
    displayState,
    loadTicketDetailAction,
    onExplicitClose: handleCloseTicket,
    scope: userId && workspaceId && helpdeskConnectionId && identityVersion
      ? { userId, workspaceId, helpdeskConnectionId, identityVersion }
      : undefined,
    ticketTabs: pagedTicketTabs,
  });
  const workArea = (
    <TicketWorkspaceDisplayWorkArea
      activeTicketSummary={activeTicketSummary}
      columns={columns}
      communicationCapabilities={communicationCapabilities}
      displayState={synchronized.displayState}
      handleRefreshList={handleRefreshList}
      handleSavedViewChange={handleSavedViewChange}
      handleWorkspaceGroupByChange={handleWorkspaceGroupByChange}
      initialTicketAiSummary={initialTicketAiSummary}
      listPager={listPager}
      metadataMutationCapabilities={metadataMutationCapabilities}
      providerGroupedActive={providerGroupedActive}
      providerGroupingEnabled={providerGroupingEnabled}
      recentlyViewedLinkTargets={recentlyViewedLinkTargets}
      rephraseStyleOptions={rephraseStyleOptions}
      rewriteDraftAction={rewriteDraftAction}
      savedViewOptions={savedViewOptions}
      searchActive={searchActive}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      summarizeTicketAction={summarizeTicketAction}
      tableGroupedRows={tableGroupedRows}
      tableRows={tableRows}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userId={userId}
      workspaceId={workspaceId}
      helpdeskConnectionId={helpdeskConnectionId}
      identityVersion={identityVersion}
    />
  );

  const tabsPanel = (
    <WorkspaceTabsChrome
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={synchronized.closeTicket}
      onReorderTicket={synchronized.reorderOpenTicketTabs}
      onSelectList={synchronized.showList}
      onSelectTicket={synchronized.showOpenTicket}
      orientation={tabOrientation}
      savedViewLabel={activeSavedView?.label ?? "All tickets"}
      tabs={openTicketTabs}
      unsynchronizedTicketIds={synchronized.unsynchronizedIds}
    />
  );

  return (
    <>
      <TicketMergeNotice message={displayState.mergeNotice} />
      <TaskbarSyncNotice
        conflictIds={synchronized.draftConflictIds}
        hiddenUnsynchronizedCount={hiddenTaskbarSyncCount(openTicketTabs, synchronized.unsynchronizedIds)}
        incompatible={synchronized.incompatible}
        onCloseConflict={synchronized.closeDraftConflict}
        selectionUnsynchronized={synchronized.selectionUnsynchronized}
      />
      <WorkspaceHeaderChrome
        activeTicketId={activeTicketId}
        connections={connections}
        loadNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={logoutAction}
        markNotificationsReadAction={markWorkspaceNotificationsReadAction}
        onOpenNotificationTicket={synchronized.showNotificationTicket}
        onOpenSettings={onOpenSettings}
        onRefreshTicket={refreshTicketDetailById}
        onSearchQueryChange={setWorkspaceSearchQuery}
        onTabOrientationChange={setTabOrientation}
        recentTickets={recentTicketTabs}
        searchQuery={workspaceSearchQuery}
        setActiveConnectionAction={setActiveConnectionAction}
        tabOrientation={tabOrientation}
        userAvatarDataUrl={userAvatarDataUrl}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userFirstName={userFirstName}
        userLastName={userLastName}
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
