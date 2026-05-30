"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";
import type { SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets/workspace-adapter";
import {
  ticketGridTableClass,
  ticketGridTemplate,
  TicketGridHeaderCell,
  TicketGridStaticHeaderCell,
} from "./ticket-table-grid";
import { TicketTableGroupHeader } from "./ticket-table-group-header";
import { TicketTableRow } from "./ticket-table-row";
import type { TicketTableGroup } from "./ticket-table-types";

type TicketTableProps = {
  activeTicketId?: string;
  columns: WorkspaceTicketColumn[];
  groupedRows?: TicketTableGroup[];
  groupBy: WorkspaceTicketGroupKey;
  onRowSelect(ticketId: string): void;
  onSort(key: WorkspaceTicketSortKey): void;
  onToggleRow(ticketId: string): void;
  canLoadMore?: boolean;
  groupLoadMoreError?: { groupId: string; reason: string };
  loadedCount?: number;
  loadingGroupId?: string;
  loadingMore?: boolean;
  loadMoreError?: string;
  onLoadMoreGroup?(group: TicketTableGroup): void;
  onLoadMore?(): void;
  roundedTop?: boolean;
  rows: WorkspaceTicketRow[];
  selectedRowIds: Set<string>;
  sortingEnabled?: boolean;
  sortDirectionFor(key: WorkspaceTicketSortKey): SortDirection | undefined;
  totalCount?: number;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export type { TicketTableGroup } from "./ticket-table-types";

export function TicketTable({
  activeTicketId,
  columns,
  groupedRows,
  groupBy,
  onRowSelect,
  onSort,
  onToggleRow,
  canLoadMore = false,
  groupLoadMoreError,
  loadedCount,
  loadingGroupId,
  loadingMore = false,
  loadMoreError,
  onLoadMoreGroup,
  onLoadMore,
  roundedTop = true,
  rows,
  selectedRowIds,
  sortingEnabled = true,
  sortDirectionFor,
  totalCount,
  visibleColumns,
}: TicketTableProps) {
  const templateStyle = ticketGridTemplate(visibleColumns);
  const visibleColumnList = columns.filter((column) =>
    visibleColumns.has(column.key),
  );
  const groups = groupedRows ?? [{ id: "all", label: "", value: "", rows }];
  const rowCount = groups.reduce((total, group) => total + group.rows.length, 0);
  let rowIndex = 0;

  function sortHandler(key: WorkspaceTicketSortKey) {
    return sortingEnabled && groupBy !== key ? () => onSort(key) : undefined;
  }

  function sortDirection(key: WorkspaceTicketSortKey) {
    return sortingEnabled && groupBy !== key ? sortDirectionFor(key) : undefined;
  }

  if (rows.length === 0) {
    return (
      <section
        aria-label="Tickets"
        className={cn(
          ticketGridTableClass({ roundedTop }),
          "p-6 text-sm text-slate-600",
        )}
      >
        No tickets were returned by the active helpdesk workspace.
      </section>
    );
  }

  const loadMoreFooter =
    canLoadMore || loadingMore || loadMoreError ? (
      <div className="flex min-h-12 items-center justify-between gap-3 border-x border-t border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        <span>
          {totalCount === undefined
            ? `${loadedCount ?? rows.length} loaded`
            : `${loadedCount ?? rows.length} of ${totalCount} loaded`}
        </span>
        <div className="flex items-center gap-3">
          {loadMoreError ? (
            <span className="text-red-700" role="alert">
              Could not load more tickets.
            </span>
          ) : null}
          {canLoadMore ? (
            <Button
              icon={<ChevronDown aria-hidden="true" className="size-4" />}
              loading={loadingMore}
              onClick={onLoadMore}
              type="button"
            >
              Load more
            </Button>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Tickets"
        className={ticketGridTableClass({ roundedTop })}
        role="table"
      >
        <div className="grid w-full min-w-0" style={templateStyle}>
          <div className="contents" role="rowgroup">
            <div className="contents" role="row">
              <TicketGridStaticHeaderCell />
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
          <div className="contents" role="rowgroup">
            {groups.flatMap((group) => {
              const firstGroup = groups[0]?.id === group.id;
              const groupHeader =
                groupBy === "none" ? null : (
                  <TicketTableGroupHeader
                    firstGroup={firstGroup}
                    group={group}
                    groupBy={groupBy}
                    groupLoadMoreError={groupLoadMoreError}
                    key={`group-${group.id}`}
                    loadingGroupId={loadingGroupId}
                    onLoadMoreGroup={onLoadMoreGroup}
                  />
                );
              const renderedRows = group.rows.map((row) => (
                <TicketTableRow
                  activeTicketId={activeTicketId}
                  columns={visibleColumnList}
                  index={rowIndex++}
                  key={row.id}
                  onRowSelect={onRowSelect}
                  onToggleRow={onToggleRow}
                  row={row}
                  rowCount={rowCount}
                  selectedRowIds={selectedRowIds}
                />
              ));

              return groupHeader ? [groupHeader, ...renderedRows] : renderedRows;
            })}
          </div>
        </div>
      </div>
      {loadMoreFooter}
    </section>
  );
}
