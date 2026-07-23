"use client";
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
import type { TicketWorkspaceDisplayProps } from "./ticket-workspace-display-types";
import { WorkspaceHeaderChrome, WorkspaceTabsChrome } from "./ticket-workspace-chrome";
import { useTicketWorkspaceSavedViewSelection } from "./use-ticket-workspace-saved-view-selection";
import { TicketWorkspaceDisplayWorkArea } from "./ticket-workspace-display-work-area";
import { TicketMergeNotice } from "./ticket-merge-notice";
import { TicketTabImportNotice } from "./ticket-tab-import-notice";
import { useTicketTabImport } from "./use-ticket-tab-import";
import { isCompleteListSortKey } from "./ticket-table-grouping";
import { useTicketSearchController } from "./use-ticket-search-controller";
import { workspaceTicketSearchProps } from "./ticket-workspace-search-props";
import { ticketWorkspaceScope } from "./ticket-workspace-scope";
import { useCommunicationDraftCloseGuard } from "./use-communication-draft-close-guard";

export function TicketWorkspaceDisplay({
  connections,
  columns,
  communicationCapabilities,
  detail,
  detailResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  searchWorkspaceTicketsAction,
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
  importWorkspaceTicketTabsAction,
  hydrateWorkspaceTabImportAction,
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
  const persistenceScope = ticketWorkspaceScope(
    userId, workspaceId, helpdeskConnectionId, identityVersion,
  );
  const listPager = useTicketListPager({
    initialSavedViewId: selectedSavedViewId,
    initialRows: rows,
    initialGroups: initialListGroups,
    initialNextCursor: nextListCursor,
    initialTotalCount: totalListCount,
    loadTicketListPageAction,
  });
  const ticketSearch = useTicketSearchController({
    action: searchWorkspaceTicketsAction,
    scope: persistenceScope,
  });
  const pagedTicketTabs = mergeTicketTabs(
    ticketTabs,
    workspaceTicketTabs([
      ...listPager.rows,
      ...ticketSearch.quickRows,
      ...ticketSearch.detailedRows,
    ]),
  );
  const searchActive = ticketSearch.detailedActive;
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
    rows: searchActive ? ticketSearch.detailedRows : listPager.rows,
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
    importOpenTicketTabs,
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
  const providerGroupedActive = !searchActive && isProviderGroupedListActive({
    groupBy,
    listGroupBy: listPager.groupBy,
    listGroups: listPager.groups,
    providerGroupingEnabled,
  });
  const tableGroupedRows = providerGroupedActive ? listPager.groups : groupedRows;
  const tableRows = searchActive
    ? ticketSearch.detailedRows
    : providerGroupedActive
      ? listPager.rows
      : sortedRows;
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
    isListRefreshAvailable: Boolean(loadTicketListPageAction) && !searchActive,
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
    if (searchActive) {
      ticketSearch.refresh();
      return;
    }
    refreshList();
    void listPager.silentRefreshCurrentPage();
  }

  const communicationDraftCloseGuard =
    useCommunicationDraftCloseGuard(closeTicket);
  const tabImport = useTicketTabImport({
    action: importWorkspaceTicketTabsAction,
    hydrateAction: hydrateWorkspaceTabImportAction,
    helpdeskConnectionId,
    identityVersion,
    importOpenTicketTabs,
    openTicketTabs,
    workspaceId,
  });
  const headerSearch = workspaceTicketSearchProps({
    controller: ticketSearch,
    onSelectTicket: displayState.showTicketFromRow,
    onSubmit: () => {
      clearRowSelection();
      ticketSearch.submitDetailed();
      displayState.showList();
    },
  });
  const workArea = (
    <TicketWorkspaceDisplayWorkArea
      activeTicketSummary={activeTicketSummary}
      columns={columns}
      communicationCapabilities={communicationCapabilities}
      displayState={displayState}
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
      ticketSearch={ticketSearch}
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
      onCloseTicket={communicationDraftCloseGuard.requestClose}
      onReorderTicket={displayState.reorderOpenTicketTabs}
      onSelectList={displayState.showList}
      onSelectTicket={displayState.showOpenTicket}
      orientation={tabOrientation}
      savedViewLabel={searchActive ? "Search" : activeSavedView?.label ?? "All tickets"}
      tabs={openTicketTabs}
    />
  );

  return (
    <>
      {communicationDraftCloseGuard.dialog(communicationDraftCloseGuard.requestClose)}
      <TicketMergeNotice message={displayState.mergeNotice} />
      <TicketTabImportNotice notice={tabImport.notice} />
      <WorkspaceHeaderChrome
        activeTicketId={activeTicketId}
        connections={connections}
        loadNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={logoutAction}
        markNotificationsReadAction={markWorkspaceNotificationsReadAction}
        onOpenNotificationTicket={displayState.showNotificationTicket}
        onOpenSettings={onOpenSettings}
        onRefreshTicket={refreshTicketDetailById}
        onSyncTabs={tabImport.available ? tabImport.importTabs : undefined}
        onTabOrientationChange={setTabOrientation}
        recentTickets={recentTicketTabs}
        ticketSearch={headerSearch}
        setActiveConnectionAction={setActiveConnectionAction}
        tabOrientation={tabOrientation}
        syncingTabs={tabImport.loading}
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
