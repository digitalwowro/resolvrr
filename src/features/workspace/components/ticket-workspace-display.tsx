"use client";

import type { DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  LoadWorkspaceTicketDetailAction,
  LoadWorkspaceTicketListPageAction,
  TicketListReadResult,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketDetailLoadResult,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets";
import { TicketDetail } from "./ticket-detail";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { ticketGroupOptions } from "./ticket-table-grouping";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { WorkspaceControls } from "./workspace-controls";
import { useTicketListPagination } from "./use-ticket-list-pagination";
import {
  DetailLoadingState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";

type TicketWorkspaceDisplayProps = {
  columns: WorkspaceTicketColumn[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  listResult: TicketListReadResult;
  loadTicketListPageAction: LoadWorkspaceTicketListPageAction;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  selectedTicketId?: string;
  tabs: WorkspaceTicketTab[];
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
  listResult,
  loadTicketListPageAction,
  loadTicketDetailAction,
  metadataMutationCapabilities,
  refreshTicketDetailAfterMetadataSave,
  rows,
  selectedTicketId,
  tabs: ticketTabs,
  updateTicketMetadataAction,
}: TicketWorkspaceDisplayProps) {
  const pagination = useTicketListPagination({
    initialRows: rows,
    initialTabs: ticketTabs,
    initialLoadedCount:
      listResult.status === "available" ? listResult.loadedCount : rows.length,
    initialTotalCount:
      listResult.status === "available" ? listResult.totalCount : undefined,
    initialNextCursor:
      listResult.status === "available" ? listResult.nextCursor : undefined,
    loadTicketListPageAction,
  });
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
    rows: pagination.rows,
    selectedTicketId,
    ticketTabs: pagination.tabs,
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
        onLoadMore={pagination.loadNextPage}
        roundedTop={tabOrientation === "vertical"}
        rows={sortedRows}
        selectedRowIds={selectedRowIds}
        loadingMore={pagination.loadingMore}
        loadedCount={pagination.loadedCount}
        loadMoreError={pagination.error?.reason}
        nextCursor={groupBy === "none" ? pagination.nextCursor : undefined}
        totalCount={pagination.totalCount}
        sortDirectionFor={sortDirectionFor}
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
