"use client";

import type { DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  allTicketsSavedViewId,
  type WorkspaceSavedView,
} from "@/features/saved-views";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
} from "@/features/tickets/list-page-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  TicketCommunicationCapabilities,
  TicketCustomerReplyActionState,
  TicketCustomerReplyPayload,
  TicketInternalNoteActionState,
  TicketInternalNotePayload,
} from "@/features/tickets/communication-model";
import {
  type WorkspaceTicketColumn,
  type WorkspaceTicketDetail,
  type WorkspaceTicketRow,
  type WorkspaceTicketTab,
  workspaceTicketTabs,
} from "@/features/tickets/workspace-adapter";
import { TicketDetail } from "./ticket-detail";
import { TicketListToolbar } from "./ticket-list-toolbar";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { ticketGroupOptions } from "./ticket-table-grouping";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { useTicketListPager } from "./use-ticket-list-pager";
import { WorkspaceControls } from "./workspace-controls";
import {
  type WorkspaceMenuConnection,
  type WorkspaceProfileAction,
  WorkspaceHeader,
} from "./workspace-header";
import {
  DetailLoadingState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";
import { mergeTicketTabs } from "./ticket-tabs-merge";

type TicketWorkspaceDisplayProps = {
  actions: WorkspaceProfileAction[];
  connections: WorkspaceMenuConnection[];
  columns: WorkspaceTicketColumn[];
  communicationCapabilities: TicketCommunicationCapabilities;
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  logoutAction(formData: FormData): void | Promise<void>;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  initialListGroups?: WorkspaceTicketListGroup[];
  nextListCursor?: string;
  providerGroupingEnabled: boolean;
  providerSortEnabled: boolean;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  savedViews: WorkspaceSavedView[];
  selectedSavedViewId: string;
  selectedTicketId?: string;
  setActiveConnectionAction(formData: FormData): void | Promise<void>;
  tabs: WorkspaceTicketTab[];
  totalListCount?: number;
  addTicketCustomerReplyAction(request: TicketCustomerReplyPayload): Promise<TicketCustomerReplyActionState>;
  addTicketInternalNoteAction(request: TicketInternalNotePayload): Promise<TicketInternalNoteActionState>;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
};

export function TicketWorkspaceDisplay({
  actions,
  connections,
  columns,
  communicationCapabilities,
  detail,
  detailResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  logoutAction,
  metadataMutationCapabilities,
  initialListGroups,
  nextListCursor,
  providerGroupingEnabled,
  providerSortEnabled,
  refreshTicketDetailAfterMetadataSave,
  rows,
  searchTicketLinkTargetsAction,
  savedViews,
  selectedSavedViewId,
  selectedTicketId,
  setActiveConnectionAction,
  tabs: ticketTabs,
  totalListCount,
  addTicketCustomerReplyAction,
  addTicketInternalNoteAction,
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
    groupBy,
    groupedRows,
    handleGroupByChange,
    listActive,
    openTicketTabs,
    partiallySelected,
    refreshList,
    refreshSavedTicketDetail,
    returnActiveTicketToList,
    selectedRowIds,
    setTabOrientation,
    showList,
    showOpenTicket,
    showTicketFromRow,
    sortDirectionFor,
    sortingEnabled,
    sortedRows,
    tabOrientation,
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

  async function handleSavedViewChange(nextSavedViewId: string) {
    const result = await listPager.reloadSavedView(nextSavedViewId);
    if (result.status !== "available") {
      return;
    }
    handleGroupByChange(result.groupBy ?? "none");
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
          onRefresh={refreshList}
          onSavedViewChange={handleSavedViewChange}
          onSelectAll={toggleSelectAll}
          partiallySelected={partiallySelected}
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
        addTicketCustomerReplyAction={addTicketCustomerReplyAction}
        addTicketInternalNoteAction={addTicketInternalNoteAction}
        communicationCapabilities={communicationCapabilities}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onMetadataSaved={updateOpenTicketTabMetadata}
        onMetadataSavedDetailRefresh={refreshSavedTicketDetail}
        onReturnToListAfterUpdate={returnActiveTicketToList}
        roundedTop={tabOrientation === "vertical"}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        updateTicketMetadataAction={updateTicketMetadataAction}
      />
    ) : activeTicketId ? (
      <DetailLoadingState key="work-area" />
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

  const tabsPanel = (
    <TicketTabsPanel
      key="tabs"
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={closeTicket}
      onSelectList={showList}
      onSelectTicket={showOpenTicket}
      orientation={tabOrientation}
      savedViewLabel={activeSavedView?.label ?? "All tickets"}
      tabs={openTicketTabs}
    />
  );

  return (
    <>
      <WorkspaceHeader
        actions={actions}
        connections={connections}
        controls={controls}
        logoutAction={logoutAction}
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
