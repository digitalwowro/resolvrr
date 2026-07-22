"use client";

import { RefreshCw, Search, X } from "lucide-react";
import type { SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets/workspace-adapter";
import { TicketTable } from "./ticket-table";
import { isCompleteListSortKey } from "./ticket-table-grouping";

type TicketWorkspaceSearchAreaProps = {
  activeTicketId?: string;
  allSelected: boolean;
  canLoadMore: boolean;
  columns: WorkspaceTicketColumn[];
  error?: TicketReadUnavailableReason;
  insetContent?: boolean;
  loading: boolean;
  loadedCount: number;
  onClear(): void;
  onLoadMore(): void;
  onRefresh(): void;
  onRowSelect(ticketId: string): void;
  onSelectAll(): void;
  onSort(key: WorkspaceTicketSortKey): void;
  onToggleRow(ticketId: string): void;
  partiallySelected: boolean;
  query: string;
  rows: WorkspaceTicketRow[];
  selectedRowIds: Set<string>;
  sortDirectionFor(key: WorkspaceTicketSortKey): SortDirection | undefined;
  sortingEnabled: boolean;
  totalCount?: number;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

function searchErrorMessage(reason: TicketReadUnavailableReason) {
  if (reason === "invalid-search-query") {
    return "The search syntax is invalid. Refine the query and try again.";
  }
  if (reason === "provider-auth-failed") {
    return "The personal helpdesk connection needs attention.";
  }
  return "Search could not be refreshed. The previous results remain visible.";
}

export function TicketWorkspaceSearchArea({
  activeTicketId,
  allSelected,
  canLoadMore,
  columns,
  error,
  insetContent = false,
  loading,
  loadedCount,
  onClear,
  onLoadMore,
  onRefresh,
  onRowSelect,
  onSelectAll,
  onSort,
  onToggleRow,
  partiallySelected,
  query,
  rows,
  selectedRowIds,
  sortDirectionFor,
  sortingEnabled,
  totalCount,
  visibleColumns,
}: TicketWorkspaceSearchAreaProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className={cn("shrink-0", insetContent && "px-4")}>
        <div className="flex items-center gap-3 bg-white py-4">
          <Search aria-hidden="true" className="size-4 text-indigo-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Search results for “{query}”
            </p>
            <p className="text-xs text-slate-500">
              {totalCount === undefined
                ? `${loadedCount} loaded`
                : `${totalCount} ${totalCount === 1 ? "ticket" : "tickets"}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              aria-label="Clear ticket search"
              className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={onClear}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <p
          className={cn(
            "border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800",
            insetContent && "mx-4",
          )}
          role="alert"
        >
          {searchErrorMessage(error)}
        </p>
      ) : null}
      <div className={cn(
        "flex min-h-0 flex-1 flex-col",
        insetContent && "px-4 pb-4",
      )}>
        <TicketTable
          activeTicketId={activeTicketId}
          allSelected={allSelected}
          canLoadMore={canLoadMore}
          columns={columns}
          emptyMessage={
            loading
              ? "Searching all accessible tickets…"
              : "No accessible tickets match this search."
          }
          groupBy="none"
          loadedCount={loadedCount}
          loadingMore={loading}
          onLoadMore={onLoadMore}
          onRowSelect={onRowSelect}
          onSelectAll={onSelectAll}
          onSort={onSort}
          onToggleRow={onToggleRow}
          partiallySelected={partiallySelected}
          rows={rows}
          selectedRowIds={selectedRowIds}
          sortingEnabled={sortingEnabled && !loading}
          sortEnabledFor={(key) => !isCompleteListSortKey(key)}
          sortDirectionFor={sortDirectionFor}
          totalCount={totalCount}
          visibleColumns={visibleColumns}
        />
      </div>
    </div>
  );
}
