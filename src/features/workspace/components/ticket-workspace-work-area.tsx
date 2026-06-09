"use client";

import type { DropdownOption, SortDirection } from "@/components/ui";
import type { WorkspaceTicketDetailLoadResult } from "@/features/tickets/detail-action-result";
import type { WorkspaceTicketLinkTarget } from "@/features/tickets/link-target-search-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type { SummarizeWorkspaceTicketAction } from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { TicketDetail, TicketDetailLoadingShell } from "./ticket-detail";
import { TicketListToolbar } from "./ticket-list-toolbar";
import { TicketTable, type TicketTableGroup } from "./ticket-table";
import { ticketGroupOptions } from "./ticket-table-grouping";
import {
  DetailLoadingState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";

type TicketDetailLoadState =
  | WorkspaceTicketDetailLoadResult
  | { status: "loading" };

type TicketDetailLoadingSummary = WorkspaceTicketTab &
  Partial<Pick<WorkspaceTicketRow, "createdAt" | "providerUrl" | "updatedAt">>;

export type TicketWorkspaceListAreaProps = {
  activeTicketId?: string;
  allSelected: boolean;
  canLoadMore: boolean;
  columns: WorkspaceTicketColumn[];
  emptyMessage?: string;
  groupBy: WorkspaceTicketGroupKey;
  groupedRows?: TicketTableGroup[];
  groupLoadMoreError?: { groupId: string; reason: string };
  loadingGroupId?: string;
  loadingMore: boolean;
  loadMoreError?: string;
  loadedCount: number;
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  onGroupByChange(groupBy: WorkspaceTicketGroupKey): void;
  onLoadMore(): void;
  onLoadMoreGroup(group: TicketTableGroup): void;
  onRefresh(): void;
  onRowSelect(ticketId: string): void;
  onSavedViewChange(savedViewId: string): void | Promise<void>;
  onSelectAll(): void;
  onSort(key: WorkspaceTicketSortKey): void;
  onToggleRow(ticketId: string): void;
  partiallySelected: boolean;
  providerGroupingEnabled: boolean;
  refreshing: boolean;
  roundedTop: boolean;
  rows: WorkspaceTicketRow[];
  savedViewOptions: DropdownOption[];
  selectedRowIds: Set<string>;
  selectedSavedViewId: string;
  sortingEnabled: boolean;
  sortDirectionFor(key: WorkspaceTicketSortKey): SortDirection | undefined;
  totalCount?: number;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export function TicketWorkspaceListArea({
  activeTicketId,
  allSelected,
  canLoadMore,
  columns,
  emptyMessage,
  groupBy,
  groupedRows,
  groupLoadMoreError,
  loadingGroupId,
  loadingMore,
  loadMoreError,
  loadedCount,
  onColumnToggle,
  onGroupByChange,
  onLoadMore,
  onLoadMoreGroup,
  onRefresh,
  onRowSelect,
  onSavedViewChange,
  onSelectAll,
  onSort,
  onToggleRow,
  partiallySelected,
  providerGroupingEnabled,
  refreshing,
  roundedTop,
  rows,
  savedViewOptions,
  selectedRowIds,
  selectedSavedViewId,
  sortingEnabled,
  sortDirectionFor,
  totalCount,
  visibleColumns,
}: TicketWorkspaceListAreaProps) {
  return (
    <div key="work-area" className="flex min-h-0 flex-1 flex-col">
      <TicketListToolbar
        allSelected={allSelected}
        columns={columns}
        groupBy={groupBy}
        groupOptions={ticketGroupOptions(providerGroupingEnabled)}
        onColumnToggle={onColumnToggle}
        onGroupByChange={onGroupByChange}
        onRefresh={onRefresh}
        onSavedViewChange={onSavedViewChange}
        onSelectAll={onSelectAll}
        partiallySelected={partiallySelected}
        refreshing={refreshing}
        roundedTop={roundedTop}
        savedViewOptions={savedViewOptions}
        selectedSavedViewId={selectedSavedViewId}
        visibleColumns={visibleColumns}
      />
      <TicketTable
        activeTicketId={activeTicketId}
        columns={columns}
        emptyMessage={emptyMessage}
        groupedRows={groupBy === "none" ? undefined : groupedRows}
        groupBy={groupBy}
        onRowSelect={onRowSelect}
        onSort={onSort}
        onToggleRow={onToggleRow}
        canLoadMore={canLoadMore}
        groupLoadMoreError={groupLoadMoreError}
        loadingGroupId={loadingGroupId}
        loadMoreError={loadMoreError}
        loadedCount={loadedCount}
        loadingMore={loadingMore}
        onLoadMoreGroup={onLoadMoreGroup}
        onLoadMore={onLoadMore}
        roundedTop={false}
        rows={rows}
        selectedRowIds={selectedRowIds}
        sortingEnabled={sortingEnabled}
        sortDirectionFor={sortDirectionFor}
        totalCount={totalCount}
        visibleColumns={visibleColumns}
      />
    </div>
  );
}

type TicketWorkspaceDetailAreaProps = {
  activeDetail?: TicketDetailLoadState;
  activeTicketId?: string;
  activeTicketSummary?: TicketDetailLoadingSummary;
  communicationCapabilities: TicketCommunicationCapabilities;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  onMetadataSaved: Parameters<typeof TicketDetail>[0]["onMetadataSaved"];
  onMetadataSavedDetailRefresh(ticketId: string): void;
  onRefresh(): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  refreshing: boolean;
  roundedTop: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  summarizeTicketAction: SummarizeWorkspaceTicketAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
};

export function TicketWorkspaceDetailArea({
  activeDetail,
  activeTicketId,
  activeTicketSummary,
  communicationCapabilities,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  refreshing,
  roundedTop,
  searchTicketLinkTargetsAction,
  summarizeTicketAction,
  updateTicketMetadataAction,
}: TicketWorkspaceDetailAreaProps) {
  if (activeDetail?.status === "unavailable") {
    return <DetailUnavailableState key="work-area" reason={activeDetail.reason} />;
  }

  if (activeDetail?.status === "available") {
    return (
      <TicketDetail
        key={`work-area-${activeDetail.detail.id}`}
        detail={activeDetail.detail}
        communicationCapabilities={communicationCapabilities}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onMetadataSaved={onMetadataSaved}
        onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
        onRefresh={onRefresh}
        onReturnToListAfterUpdate={onReturnToListAfterUpdate}
        recentlyViewedLinkTargets={recentlyViewedLinkTargets}
        roundedTop={roundedTop}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        summarizeTicketAction={summarizeTicketAction}
        refreshing={refreshing}
        updateTicketMetadataAction={updateTicketMetadataAction}
      />
    );
  }

  if (!activeTicketId) {
    return <EmptyDetailState key="work-area" />;
  }

  return activeTicketSummary ? (
    <TicketDetailLoadingShell
      key="work-area"
      roundedTop={roundedTop}
      ticket={activeTicketSummary}
    />
  ) : (
    <DetailLoadingState key="work-area" />
  );
}
