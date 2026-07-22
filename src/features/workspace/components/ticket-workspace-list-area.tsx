"use client";

import type { DropdownOption, SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets/workspace-adapter";
import { TicketListToolbar } from "./ticket-list-toolbar";
import { TicketTable, type TicketTableGroup } from "./ticket-table";
import { ticketGroupOptions } from "./ticket-table-grouping";

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
  insetContent?: boolean;
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

function completeSortStatus(
  progress: NonNullable<TicketWorkspaceListAreaProps["completeSortProgress"]>,
) {
  const field = progress.sortKey === "owner" ? "Owner" : "Customer";
  const total =
    progress.totalCount === undefined ? "" : ` of ${progress.totalCount}`;
  return `Loading all tickets to sort by ${field}… ${progress.loadedCount}${total}`;
}

export function TicketWorkspaceListArea({
  completeSortError,
  completeSortProgress,
  groupedRows,
  insetContent = false,
  ...props
}: TicketWorkspaceListAreaProps) {
  return (
    <div
      key="work-area"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className={cn("shrink-0", insetContent && "px-4")}>
        <TicketListToolbar
          columns={props.columns}
          groupBy={props.groupBy}
          groupOptions={ticketGroupOptions(props.providerGroupingEnabled)}
          onColumnToggle={props.onColumnToggle}
          onGroupByChange={props.onGroupByChange}
          onRefresh={props.onRefresh}
          onSavedViewChange={props.onSavedViewChange}
          refreshing={props.refreshing}
          savedViewOptions={props.savedViewOptions}
          selectedSavedViewId={props.selectedSavedViewId}
          visibleColumns={props.visibleColumns}
        />
      </div>
      {completeSortProgress ? (
        <p
          className={cn(
            "border-x border-slate-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800",
            insetContent && "mx-4",
          )}
          role="status"
        >
          {completeSortStatus(completeSortProgress)}
        </p>
      ) : completeSortError ? (
        <p
          className={cn(
            "border-x border-slate-200 bg-amber-50 px-3 py-2 text-sm text-amber-800",
            insetContent && "mx-4",
          )}
          role="alert"
        >
          The complete ticket list could not be loaded, so the requested sort
          was not applied.
        </p>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          insetContent && "px-4 pb-4",
        )}
      >
        <TicketTable
          activeTicketId={props.activeTicketId}
          allSelected={props.allSelected}
          canLoadMore={props.canLoadMore}
          columns={props.columns}
          emptyMessage={props.emptyMessage}
          groupedRows={props.groupBy === "none" ? undefined : groupedRows}
          groupBy={props.groupBy}
          groupLoadMoreError={props.groupLoadMoreError}
          loadedCount={props.loadedCount}
          loadingGroupId={props.loadingGroupId}
          loadingMore={props.loadingMore}
          loadMoreError={props.loadMoreError}
          onLoadMore={props.onLoadMore}
          onLoadMoreGroup={props.onLoadMoreGroup}
          onRowSelect={props.onRowSelect}
          onSelectAll={props.onSelectAll}
          onSort={props.onSort}
          onToggleRow={props.onToggleRow}
          partiallySelected={props.partiallySelected}
          rows={props.rows}
          selectedRowIds={props.selectedRowIds}
          sortingEnabled={props.sortingEnabled}
          sortDirectionFor={props.sortDirectionFor}
          totalCount={props.totalCount}
          visibleColumns={props.visibleColumns}
        />
      </div>
    </div>
  );
}
