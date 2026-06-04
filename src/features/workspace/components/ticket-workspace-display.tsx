"use client";

import { useCallback, useEffect } from "react";
import type { DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  allTicketsSavedViewId,
  type WorkspaceSavedView,
} from "@/features/saved-views/workspace";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
} from "@/features/tickets/list-page-action-result";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  TicketCommunicationCapabilities,
} from "@/features/tickets/communication-model";
import type {
  SaveWorkspaceOpenTabsStateAction,
  WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type {
  LoadWorkspaceNotificationsAction,
  MarkWorkspaceNotificationsReadAction,
} from "@/features/notifications";
import type { HelpdeskConnectionActionResult } from "@/features/helpdesk-connections";
import {
  type WorkspaceTicketColumn,
  type WorkspaceTicketDetail,
  type WorkspaceTicketRow,
  type WorkspaceTicketTab,
  workspaceTicketTabs,
} from "@/features/tickets/workspace-adapter";
import { TicketDetail, TicketDetailLoadingShell } from "./ticket-detail";
import { TicketListToolbar } from "./ticket-list-toolbar";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { ticketGroupOptions } from "./ticket-table-grouping";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { useTicketListPager } from "./use-ticket-list-pager";
import { WorkspaceControls } from "./workspace-controls";
import {
  type WorkspaceMenuConnection,
  WorkspaceHeader,
} from "./workspace-header";
import {
  DetailLoadingState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";
import { mergeTicketTabs } from "./ticket-tabs-merge";
import type { WorkspaceSettingsSection } from "./workspace-settings-dialog";
import { WorkspaceNotifications } from "./workspace-notifications";

const ticketDetailSilentRefreshMs = 60_000;
const ticketListSilentRefreshMs = 120_000;

type TicketWorkspaceDisplayProps = {
  connections: WorkspaceMenuConnection[];
  columns: WorkspaceTicketColumn[];
  communicationCapabilities: TicketCommunicationCapabilities;
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  loadWorkspaceNotificationsAction: LoadWorkspaceNotificationsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markWorkspaceNotificationsReadAction: MarkWorkspaceNotificationsReadAction;
  onOpenSettings(section: WorkspaceSettingsSection): void;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  initialListGroups?: WorkspaceTicketListGroup[];
  nextListCursor?: string;
  providerGroupingEnabled: boolean;
  providerSortEnabled: boolean;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  savedViews: WorkspaceSavedView[];
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedSavedViewId: string;
  selectedTicketId?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  tabs: WorkspaceTicketTab[];
  totalListCount?: number;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
};

function stripTicketNumberPrefix(number: string) {
  return number.replace(/^#/u, "");
}

function tabLinkTarget(tab: WorkspaceTicketTab): WorkspaceTicketLinkTarget {
  return {
    customer: tab.customer,
    externalId: tab.id,
    number: stripTicketNumberPrefix(tab.number),
    priority: tab.priorityKey,
    state: tab.stateKey,
    title: tab.title,
  };
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

  useEffect(() => {
    if (!listActive || !loadTicketListPageAction) {
      return;
    }

    function refreshVisibleListIfStale() {
      if (document.hidden || !listPager.isListStale(ticketListSilentRefreshMs)) {
        return;
      }
      void listPager.silentRefreshCurrentPage();
    }

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void listPager.silentRefreshCurrentPage();
      }
    }, ticketListSilentRefreshMs);
    document.addEventListener("visibilitychange", refreshVisibleListIfStale);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshVisibleListIfStale);
    };
  }, [listActive, listPager, loadTicketListPageAction]);

  useEffect(() => {
    if (!activeTicketId) {
      return;
    }

    function refreshVisibleTicketIfStale() {
      if (
        document.hidden ||
        !isActiveTicketDetailStale(ticketDetailSilentRefreshMs)
      ) {
        return;
      }
      refreshActiveTicketDetail();
    }

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        refreshActiveTicketDetail();
      }
    }, ticketDetailSilentRefreshMs);
    document.addEventListener("visibilitychange", refreshVisibleTicketIfStale);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        refreshVisibleTicketIfStale,
      );
    };
  }, [activeTicketId, isActiveTicketDetailStale, refreshActiveTicketDetail]);

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
      <div key="work-area" className="flex min-h-0 flex-1 flex-col">
        <TicketListToolbar
          allSelected={allSelected}
          columns={columns}
          groupBy={groupBy}
          groupOptions={ticketGroupOptions(providerGroupingEnabled)}
          onColumnToggle={toggleColumn}
          onGroupByChange={handleWorkspaceGroupByChange}
          onRefresh={handleRefreshList}
          onSavedViewChange={handleSavedViewChange}
          onSelectAll={toggleSelectAll}
          partiallySelected={partiallySelected}
          refreshing={listPager.silentRefreshing}
          roundedTop={tabOrientation === "vertical"}
          savedViewOptions={savedViewOptions}
          selectedSavedViewId={listPager.savedViewId}
          visibleColumns={visibleColumnSet}
        />
        <TicketTable
          activeTicketId={activeTicketId}
          columns={columns}
          groupedRows={groupBy === "none" ? undefined : tableGroupedRows}
          groupBy={groupBy}
          onRowSelect={showTicketFromRow}
          onSort={toggleSort}
          onToggleRow={toggleRow}
          canLoadMore={!providerGroupedActive && listPager.canLoadMore}
          groupLoadMoreError={listPager.groupError}
          loadingGroupId={listPager.loadingGroupId}
          loadMoreError={listPager.errorReason}
          loadedCount={listPager.loadedCount}
          loadingMore={listPager.loading}
          onLoadMoreGroup={listPager.loadMoreGroup}
          onLoadMore={listPager.loadMore}
          roundedTop={false}
          rows={tableRows}
          selectedRowIds={selectedRowIds}
          sortingEnabled={sortingEnabled && !providerGroupedActive}
          sortDirectionFor={sortDirectionFor}
          totalCount={listPager.totalCount}
          visibleColumns={visibleColumnSet}
        />
      </div>
    ) : activeDetail?.status === "unavailable" ? (
      <DetailUnavailableState key="work-area" reason={activeDetail.reason} />
    ) : activeDetail?.status === "available" ? (
      <TicketDetail
        key="work-area"
        detail={activeDetail.detail}
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
    ) : activeTicketId ? (
      activeTicketSummary ? (
        <TicketDetailLoadingShell
          key="work-area"
          roundedTop={tabOrientation === "vertical"}
          ticket={activeTicketSummary}
        />
      ) : (
        <DetailLoadingState key="work-area" />
      )
    ) : (
      <EmptyDetailState key="work-area" />
    );

  const controls = (
    <WorkspaceControls
      key="controls"
      onTabOrientationChange={setTabOrientation}
      tabOrientation={tabOrientation}
    />
  );

  const notifications = (
    <WorkspaceNotifications
      activeTicketId={activeTicketId}
      loadNotificationsAction={loadWorkspaceNotificationsAction}
      markNotificationsReadAction={markWorkspaceNotificationsReadAction}
      onOpenTicket={showNotificationTicket}
      onRefreshTicket={refreshTicketDetailById}
      recentTickets={recentTicketTabs}
    />
  );

  const tabsPanel = (
    <TicketTabsPanel
      key="tabs"
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={closeTicket}
      onSelectList={showList}
      onSelectTicket={showOpenTicket}
      onReorderTicket={reorderOpenTicketTabs}
      orientation={tabOrientation}
      savedViewLabel={activeSavedView?.label ?? "All tickets"}
      tabs={openTicketTabs}
    />
  );

  return (
    <>
      <WorkspaceHeader
        connections={connections}
        controls={controls}
        notifications={notifications}
        logoutAction={logoutAction}
        onOpenSettings={onOpenSettings}
        setActiveConnectionAction={setActiveConnectionAction}
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
