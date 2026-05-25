"use client";

import type { DropdownOption } from "@/components/ui";
import type {
  TicketDetailReadResult,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets";
import { TicketDetail } from "./ticket-detail";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { ticketGroupOptions } from "./ticket-table-grouping";
import { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import { WorkspaceControls } from "./workspace-controls";
import {
  DetailLoadingState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";

type TicketWorkspaceDisplayProps = {
  columns: WorkspaceTicketColumn[];
  detail?: WorkspaceTicketDetail;
  detailResult?: TicketDetailReadResult;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
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
  metadataMutationCapabilities,
  rows,
  selectedTicketId,
  tabs: ticketTabs,
  updateTicketMetadataAction,
}: TicketWorkspaceDisplayProps) {
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
    visibleColumnSet,
  } = useTicketWorkspaceDisplayState({
    columns,
    detail,
    detailResult,
    rows,
    selectedTicketId,
    ticketTabs,
  });

  const workArea =
    listActive ? (
      <TicketTable
        activeTicketId={activeTicketId}
        columns={columns}
        groupedRows={groupBy === "none" ? undefined : groupedRows}
        groupBy={groupBy}
        onRowSelect={showTicketFromRow}
        onSort={toggleSort}
        onToggleRow={toggleRow}
        roundedTop={tabOrientation === "vertical"}
        rows={sortedRows}
        selectedRowIds={selectedRowIds}
        sortDirectionFor={sortDirectionFor}
        visibleColumns={visibleColumnSet}
      />
    ) : activeDetail?.result?.status === "unavailable" ? (
      <DetailUnavailableState reason={activeDetail.result.reason} />
    ) : activeDetail?.detail ? (
      <TicketDetail
        detail={activeDetail.detail}
        metadataMutationCapabilities={metadataMutationCapabilities}
        roundedTop={tabOrientation === "vertical"}
        updateTicketMetadataAction={updateTicketMetadataAction}
      />
    ) : activeTicketId ? (
      <DetailLoadingState />
    ) : (
      <EmptyDetailState />
    );

  const controls = (
    <WorkspaceControls
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

  return tabOrientation === "vertical" ? (
    <section className="flex min-h-0 flex-1 overflow-hidden">
      {tabsPanel}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-4">
        {controls}
        {workArea}
      </div>
    </section>
  ) : (
    <>
      <WorkspaceControls
        allSelected={allSelected}
        className="px-4"
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
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
        {tabsPanel}
        {workArea}
      </section>
    </>
  );
}
