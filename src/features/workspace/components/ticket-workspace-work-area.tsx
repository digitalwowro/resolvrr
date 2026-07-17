"use client";

import type { DropdownOption, SortDirection } from "@/components/ui";
import type { WorkspaceTicketDetailLoadResult } from "@/features/tickets/detail-action-result";
import type { WorkspaceTicketLinkTarget } from "@/features/tickets/link-target-search-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type {
  AiRephraseStyleOption,
  RewriteDraftAction,
  SummarizeWorkspaceTicketAction,
} from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { TicketAiSummaryResult } from "@/features/ai";
import type { InitialTicketAiSummary } from "@/features/workspace/ticket-detail-hydration";
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
  DetailRetiredState,
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
  completeSortError?: boolean;
  completeSortProgress?: {
    loadedCount: number;
    sortKey: WorkspaceTicketSortKey;
    totalCount?: number;
  };
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
  completeSortError,
  completeSortProgress,
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
        columns={columns}
        groupBy={groupBy}
        groupOptions={ticketGroupOptions(providerGroupingEnabled)}
        onColumnToggle={onColumnToggle}
        onGroupByChange={onGroupByChange}
        onRefresh={onRefresh}
        onSavedViewChange={onSavedViewChange}
        refreshing={refreshing}
        savedViewOptions={savedViewOptions}
        selectedSavedViewId={selectedSavedViewId}
        visibleColumns={visibleColumns}
      />
      {completeSortProgress ? (
        <p className="border-x border-slate-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800" role="status">
          Loading all tickets to sort by {completeSortProgress.sortKey === "owner" ? "Owner" : "Customer"}… {completeSortProgress.loadedCount}
          {completeSortProgress.totalCount !== undefined
            ? ` of ${completeSortProgress.totalCount}`
            : ""}
        </p>
      ) : completeSortError ? (
        <p className="border-x border-slate-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          The complete ticket list could not be loaded, so the requested sort was not applied.
        </p>
      ) : null}
      <TicketTable
        activeTicketId={activeTicketId}
        allSelected={allSelected}
        columns={columns}
        emptyMessage={emptyMessage}
        groupedRows={groupBy === "none" ? undefined : groupedRows}
        groupBy={groupBy}
        onRowSelect={onRowSelect}
        onSelectAll={onSelectAll}
        onSort={onSort}
        onToggleRow={onToggleRow}
        partiallySelected={partiallySelected}
        canLoadMore={canLoadMore}
        groupLoadMoreError={groupLoadMoreError}
        loadingGroupId={loadingGroupId}
        loadMoreError={loadMoreError}
        loadedCount={loadedCount}
        loadingMore={loadingMore}
        onLoadMoreGroup={onLoadMoreGroup}
        onLoadMore={onLoadMore}
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

export type TicketWorkspaceDetailAreaProps = {
  activeDetail?: TicketDetailLoadState;
  activeTicketId?: string;
  activeTicketSummary?: TicketDetailLoadingSummary;
  communicationCapabilities: TicketCommunicationCapabilities;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  onMetadataSaved: Parameters<typeof TicketDetail>[0]["onMetadataSaved"];
  onMetadataSavedDetailRefresh(ticketId: string): void;
  onTicketAiSummaryAvailable(
    ticketId: string,
    summary: InitialTicketAiSummary,
  ): void;
  onRefresh(): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  rephraseStyleOptions?: AiRephraseStyleOption[];
  refreshing: boolean;
  roundedTop: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  rewriteDraftAction?: RewriteDraftAction;
  summarizeTicketAction: SummarizeWorkspaceTicketAction;
  initialTicketAiSummary?: {
    result: Extract<TicketAiSummaryResult, { status: "available" }>;
    ticketId: string;
  };
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userId?: string;
  workspaceId?: string;
  helpdeskConnectionId?: string;
  identityVersion?: string;
};

export function TicketWorkspaceDetailArea({
  activeDetail,
  activeTicketId,
  activeTicketSummary,
  communicationCapabilities,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onTicketAiSummaryAvailable,
  onRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  rephraseStyleOptions,
  refreshing,
  roundedTop,
  searchTicketLinkTargetsAction,
  rewriteDraftAction,
  summarizeTicketAction,
  initialTicketAiSummary,
  updateTicketMetadataAction,
  userId,
  workspaceId,
  helpdeskConnectionId,
  identityVersion,
}: TicketWorkspaceDetailAreaProps) {
  if (activeDetail?.status === "retired") {
    return <DetailRetiredState key="work-area" />;
  }

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
        onTicketAiSummaryAvailable={onTicketAiSummaryAvailable}
        onRefresh={onRefresh}
        onReturnToListAfterUpdate={onReturnToListAfterUpdate}
        recentlyViewedLinkTargets={recentlyViewedLinkTargets}
        rephraseStyleOptions={rephraseStyleOptions}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        rewriteDraftAction={rewriteDraftAction}
        summarizeTicketAction={summarizeTicketAction}
        initialTicketAiSummary={initialTicketAiSummary}
        refreshing={refreshing}
        updateTicketMetadataAction={updateTicketMetadataAction}
        userId={userId}
        workspaceId={workspaceId}
        helpdeskConnectionId={helpdeskConnectionId}
        identityVersion={identityVersion}
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
