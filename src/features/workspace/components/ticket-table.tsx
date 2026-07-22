"use client";

import { Checkbox, Tooltip, type SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets/workspace-adapter";
import {
  ticketGridBodyScrollerClass,
  ticketGridColumnOrder,
  ticketGridHeaderWrapperClass,
  ticketGridTableClass,
  ticketGridTemplateClass,
  TicketGridHeaderCell,
  TicketGridStaticHeaderCell,
} from "./ticket-table-grid";
import { TicketTableGroupHeader } from "./ticket-table-group-header";
import {
  LoadMoreTongue,
  countLabel,
  groupCountLabel,
} from "./ticket-table-load-more";
import { TicketTableRow } from "./ticket-table-row";
import type { TicketTableGroup } from "./ticket-table-types";

type TicketTableProps = {
  activeTicketId?: string;
  allSelected: boolean;
  columns: WorkspaceTicketColumn[];
  emptyMessage?: string;
  groupedRows?: TicketTableGroup[];
  groupBy: WorkspaceTicketGroupKey;
  onRowSelect(ticketId: string): void;
  onSort(key: WorkspaceTicketSortKey): void;
  onToggleRow(ticketId: string): void;
  onSelectAll(): void;
  partiallySelected: boolean;
  canLoadMore?: boolean;
  groupLoadMoreError?: { groupId: string; reason: string };
  loadedCount?: number;
  loadingGroupId?: string;
  loadingMore?: boolean;
  loadMoreError?: string;
  onLoadMoreGroup?(group: TicketTableGroup): void;
  onLoadMore?(): void;
  rows: WorkspaceTicketRow[];
  selectedRowIds: Set<string>;
  sortingEnabled?: boolean;
  sortEnabledFor?(key: WorkspaceTicketSortKey): boolean;
  sortDirectionFor(key: WorkspaceTicketSortKey): SortDirection | undefined;
  totalCount?: number;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export type { TicketTableGroup } from "./ticket-table-types";

export function TicketTable({
  activeTicketId,
  allSelected,
  columns,
  emptyMessage = "No tickets were returned by the active helpdesk workspace.",
  groupedRows,
  groupBy,
  onRowSelect,
  onSelectAll,
  onSort,
  onToggleRow,
  partiallySelected,
  canLoadMore = false,
  groupLoadMoreError,
  loadedCount,
  loadingGroupId,
  loadingMore = false,
  loadMoreError,
  onLoadMoreGroup,
  onLoadMore,
  rows,
  selectedRowIds,
  sortingEnabled = true,
  sortEnabledFor,
  sortDirectionFor,
  totalCount,
  visibleColumns,
}: TicketTableProps) {
  const columnByKey = new Map(columns.map((column) => [column.key, column]));
  const visibleColumnList = ticketGridColumnOrder.flatMap((columnKey) => {
    const column = columnByKey.get(columnKey);
    return column && visibleColumns.has(columnKey) ? [column] : [];
  });
  const templateClass = ticketGridTemplateClass(
    visibleColumnList.map((column) => column.key),
  );
  const groups = groupedRows ?? [{ id: "all", label: "", value: "", rows }];
  const rowCount = groups.reduce((total, group) => total + group.rows.length, 0);
  let rowIndex = 0;
  const hasUngroupedLoadMore =
    groupBy === "none" && (canLoadMore || loadingMore) && Boolean(onLoadMore);

  function sortHandler(key: WorkspaceTicketSortKey) {
    return sortingEnabled &&
      groupBy !== key &&
      (sortEnabledFor?.(key) ?? true)
      ? () => onSort(key)
      : undefined;
  }

  function sortDirection(key: WorkspaceTicketSortKey) {
    return sortingEnabled &&
      groupBy !== key &&
      (sortEnabledFor?.(key) ?? true)
      ? sortDirectionFor(key)
      : undefined;
  }

  if (rows.length === 0) {
    return (
      <section
        aria-label="Tickets"
        className={cn(
          ticketGridTableClass,
          "border-x border-t border-slate-200 p-6 text-sm text-slate-600",
        )}
      >
        {emptyMessage}
      </section>
    );
  }

  const ungroupedLoadMoreCount = countLabel({
    loadedCount,
    rowCount: rows.length,
    totalCount,
  });
  const ungroupedLoadMoreTongue =
    hasUngroupedLoadMore && onLoadMore ? (
      <LoadMoreTongue
        ariaLabel={`Show more tickets (${ungroupedLoadMoreCount})`}
        count={ungroupedLoadMoreCount}
        key="load-more"
        loading={loadingMore}
        onClick={onLoadMore}
        reserveBottomSpace
      />
    ) : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Tickets"
        className={cn(ticketGridTableClass, "flex flex-col")}
        role="table"
      >
        <div className={ticketGridHeaderWrapperClass}>
          <div
            className={cn("grid w-full min-w-0", templateClass)}
            role="rowgroup"
          >
            <div className="contents" role="row">
              <TicketGridStaticHeaderCell>
                <Tooltip content="Select all tickets" side="bottom">
                  <Checkbox
                    checked={allSelected}
                    className="h-6 !items-center"
                    checkboxClassName="!size-5"
                    checkIconClassName="!size-3"
                    hideLabel
                    indeterminate={partiallySelected}
                    label="Select all tickets"
                    name="workspace-select-all"
                    onChange={onSelectAll}
                  />
                </Tooltip>
              </TicketGridStaticHeaderCell>
              <TicketGridHeaderCell
                label="#"
                onSort={sortHandler("number")}
                sortDirection={sortDirection("number")}
              />
              <TicketGridHeaderCell
                label="Title"
                onSort={sortHandler("title")}
                sortDirection={sortDirection("title")}
              />
              {visibleColumnList.map((column) => (
                <TicketGridHeaderCell
                  key={column.key}
                  label={column.label}
                  onSort={sortHandler(column.key)}
                  sortDirection={sortDirection(column.key)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className={ticketGridBodyScrollerClass}>
          <div
            className={cn("grid w-full min-w-0", templateClass)}
            role="rowgroup"
          >
            {groups.flatMap((group, groupIndex) => {
              const lastGroup = groupIndex === groups.length - 1;
              const groupHeader =
                groupBy === "none" ? null : (
                  <TicketTableGroupHeader
                    group={group}
                    groupBy={groupBy}
                    groupLoadMoreError={groupLoadMoreError}
                    key={`group-${group.id}`}
                  />
                );
              const renderedRows = group.rows.map((row, rowGroupIndex) => (
                <TicketTableRow
                  activeTicketId={activeTicketId}
                  columns={visibleColumnList}
                  groupBoundaryAfter={
                    rowGroupIndex === group.rows.length - 1 &&
                    ((groupBy !== "none" &&
                      (!lastGroup || Boolean(group.nextCursor && onLoadMoreGroup))) ||
                      hasUngroupedLoadMore)
                  }
                  index={rowIndex++}
                  key={row.id}
                  onRowSelect={onRowSelect}
                  onToggleRow={onToggleRow}
                  row={row}
                  rowCount={rowCount}
                  selectedRowIds={selectedRowIds}
                />
              ));
              const loadMoreTongue =
                groupBy === "none" || !group.nextCursor || !onLoadMoreGroup
                  ? null
                  : (
                    <LoadMoreTongue
                      ariaLabel={`Show more ${group.label} tickets (${groupCountLabel(group)})`}
                      count={groupCountLabel(group)}
                      key={`group-load-more-${group.id}`}
                      loading={loadingGroupId === group.id}
                      onClick={() => onLoadMoreGroup(group)}
                      reserveBottomSpace={lastGroup}
                    />
                  );

              if (!groupHeader) {
                return renderedRows;
              }

              return loadMoreTongue
                ? [groupHeader, ...renderedRows, loadMoreTongue]
                : [groupHeader, ...renderedRows];
            })}
            {ungroupedLoadMoreTongue}
          </div>
        </div>
      </div>
      {loadMoreError ? (
        <div
          className="border-x border-t border-slate-200 bg-white px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          Could not load more tickets.
        </div>
      ) : null}
    </section>
  );
}
