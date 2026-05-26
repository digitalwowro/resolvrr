"use client";

import type { DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type { LoadWorkspaceTicketListPageAction } from "@/features/tickets/list-page-action-result";
import type {
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import {
  type WorkspaceTicketColumn,
  type WorkspaceTicketDetail,
  type WorkspaceTicketRow,
  type WorkspaceTicketTab,
  workspaceTicketTabs,
} from "@/features/tickets/workspace-adapter";
import { TicketDetail } from "./ticket-detail";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { ticketGroupOptions } from "./ticket-table-grouping";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { useTicketListPager } from "./use-ticket-list-pager";
import { WorkspaceControls } from "./workspace-controls";
import {
  DetailLoadingState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";

type TicketWorkspaceDisplayProps = {
  columns: WorkspaceTicketColumn[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  nextListCursor?: string;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  selectedTicketId?: string;
  tabs: WorkspaceTicketTab[];
  totalListCount?: number;
  updateTicketMetadataAction(
    formData: FormData,
  ): Promise<TicketMetadataMutationActionState>;
};

const savedViewOptions: DropdownOption[] = [
  { value: "all-tickets", label: "All tickets" },
];

export function TicketWorkspaceDisplay({
  columns,
  detail,
  detailResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  metadataMutationCapabilities,
  nextListCursor,
  refreshTicketDetailAfterMetadataSave,
  rows,
  selectedTicketId,
  tabs: ticketTabs,
  totalListCount,
  updateTicketMetadataAction,
}: TicketWorkspaceDisplayProps) {
  const listPager = useTicketListPager({
    initialRows: rows,
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
    loadTicketDetailAction,
    refreshTicketDetailAfterMetadataSave,
    rows: listPager.rows,
    selectedTicketId,
    ticketTabs: pagedTicketTabs,
  });

  const workArea =
    listActive ? (
      <TicketTable
        key="work-area"
        activeTicketId={activeTicketId}
        columns={columns}
        groupedRows={groupBy === "none" ? undefined : groupedRows}
        groupBy={groupBy}
        onRowSelect={showTicketFromRow}
        onSort={toggleSort}
        onToggleRow={toggleRow}
        canLoadMore={groupBy === "none" && listPager.canLoadMore}
        loadMoreError={listPager.errorReason}
        loadedCount={listPager.loadedCount}
        loadingMore={listPager.loading}
        onLoadMore={listPager.loadMore}
        roundedTop={tabOrientation === "vertical"}
        rows={sortedRows}
        selectedRowIds={selectedRowIds}
        sortDirectionFor={sortDirectionFor}
        totalCount={listPager.totalCount}
        visibleColumns={visibleColumnSet}
      />
    ) : activeDetail?.status === "unavailable" ? (
      <DetailUnavailableState key="work-area" reason={activeDetail.reason} />
    ) : activeDetail?.status === "available" ? (
      <TicketDetail
        key="work-area"
        detail={activeDetail.detail}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onMetadataSaved={updateOpenTicketTabMetadata}
        onMetadataSavedDetailRefresh={refreshSavedTicketDetail}
        onReturnToListAfterUpdate={returnActiveTicketToList}
        roundedTop={tabOrientation === "vertical"}
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
      allSelected={allSelected}
      columns={columns}
      groupBy={groupBy}
      groupOptions={ticketGroupOptions}
      listControlsEnabled={listActive}
      onColumnToggle={toggleColumn}
      onGroupByChange={handleGroupByChange}
      onRefresh={refreshList}
      onSelectAll={toggleSelectAll}
      onTabOrientationChange={setTabOrientation}
      partiallySelected={partiallySelected}
      savedViewOptions={savedViewOptions}
      selectedSavedViewId="all-tickets"
      tabOrientation={tabOrientation}
      visibleColumns={visibleColumnSet}
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
      savedViewLabel="All tickets"
      tabs={openTicketTabs}
    />
  );

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        tabOrientation === "horizontal" && "flex-col",
      )}
    >
      {tabOrientation === "vertical" ? tabsPanel : null}
      <div
        key="workspace-content"
        className="flex min-w-0 flex-1 flex-col overflow-hidden px-4"
      >
        {controls}
        {tabOrientation === "horizontal" ? tabsPanel : null}
        {workArea}
      </div>
    </section>
  );
}

function mergeTicketTabs(
  initialTabs: WorkspaceTicketTab[],
  rowTabs: WorkspaceTicketTab[],
) {
  const tabsById = new Map(initialTabs.map((tab) => [tab.id, tab]));
  for (const tab of rowTabs) {
    tabsById.set(tab.id, tab);
  }
  return [...tabsById.values()];
}
