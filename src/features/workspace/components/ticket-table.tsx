"use client";

import { Checkbox } from "@/components/ui";
import type { SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets";
import { PriorityCell, StateCell } from "./ticket-table-cells";
import {
  ticketGridTableClass,
  ticketGridTemplate,
  TicketGridCell,
  TicketGridHeaderCell,
  TicketGridStaticHeaderCell,
} from "./ticket-table-grid";
import { TicketTablePagination } from "./ticket-table-pagination";

type TicketTableProps = {
  activeTicketId?: string;
  columns: WorkspaceTicketColumn[];
  groupedRows?: TicketTableGroup[];
  groupBy: WorkspaceTicketGroupKey;
  loadedCount?: number;
  loadingMore?: boolean;
  loadMoreError?: string;
  nextCursor?: string;
  onLoadMore?(): void;
  onRowSelect(ticketId: string): void;
  onSort(key: WorkspaceTicketSortKey): void;
  onToggleRow(ticketId: string): void;
  roundedTop?: boolean;
  rows: WorkspaceTicketRow[];
  selectedRowIds: Set<string>;
  sortDirectionFor(key: WorkspaceTicketSortKey): SortDirection | undefined;
  totalCount?: number;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export type TicketTableGroup = {
  id: string;
  label: string;
  value: string;
  rows: WorkspaceTicketRow[];
};

function cellValue(row: WorkspaceTicketRow, column: WorkspaceTicketColumnKey) {
  if (column === "customer") {
    return row.customer;
  }
  if (column === "owner") {
    return row.owner;
  }
  if (column === "state") {
    return <StateCell label={row.state} state={row.stateKey} />;
  }
  if (column === "priority") {
    return <PriorityCell label={row.priority} priority={row.priorityKey} />;
  }
  if (column === "pendingTill") {
    return row.pendingTill;
  }

  return row.updatedAt;
}

export function TicketTable({
  activeTicketId,
  columns,
  groupedRows,
  groupBy,
  loadedCount,
  loadingMore = false,
  loadMoreError,
  nextCursor,
  onLoadMore,
  onRowSelect,
  onSort,
  onToggleRow,
  roundedTop = true,
  rows,
  selectedRowIds,
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
  const visibleLoadedCount = loadedCount ?? rowCount;
  let rowIndex = 0;

  function sortHandler(key: WorkspaceTicketSortKey) {
    return groupBy === key ? undefined : () => onSort(key);
  }

  function sortDirection(key: WorkspaceTicketSortKey) {
    return groupBy === key ? undefined : sortDirectionFor(key);
  }

  function groupLabel(group: TicketTableGroup) {
    if (groupBy === "priority") {
      return (
        <PriorityCell
          label={group.label}
          monochrome
          priority={group.value === "unknown" ? undefined : rowPriorityKey(group)}
        />
      );
    }

    if (groupBy === "state") {
      return (
        <StateCell
          label={group.label}
          monochrome
          state={group.value === "unknown" ? undefined : rowStateKey(group)}
        />
      );
    }

    return group.label;
  }

  function renderRow(row: WorkspaceTicketRow, index: number) {
    const active = row.id === activeTicketId;
    const cellBorderClass = index === rowCount - 1 ? "border-b-0" : "";
    const rowCellClass = active
      ? "bg-slate-50"
      : "bg-white group-hover:bg-slate-50";

    return (
      <div
        aria-selected={active}
        className="group contents cursor-pointer"
        key={row.id}
        onClick={() => onRowSelect(row.id)}
        role="row"
      >
        <TicketGridCell
          className={cn(rowCellClass, cellBorderClass)}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selectedRowIds.has(row.id)}
            className="items-center"
            hideLabel
            label={`Select ${row.number}`}
            name={`select-${row.id}`}
            onChange={() => onToggleRow(row.id)}
          />
        </TicketGridCell>
        <TicketGridCell
          className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}
        >
          {row.number}
        </TicketGridCell>
        <TicketGridCell className={cn("min-w-0", rowCellClass, cellBorderClass)}>
          <button
            className="block w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={(event) => {
              event.stopPropagation();
              onRowSelect(row.id);
            }}
            type="button"
          >
            <span className="block truncate font-semibold">{row.title}</span>
            {row.preview ? (
              <span className="block truncate text-xs text-slate-500">
                {row.preview}
              </span>
            ) : null}
          </button>
        </TicketGridCell>
        {visibleColumnList.map((column) => (
          <TicketGridCell
            className={cn("min-w-0", rowCellClass, cellBorderClass)}
            key={column.key}
          >
            <span className="block min-w-0 truncate whitespace-nowrap">
              {cellValue(row, column.key)}
            </span>
          </TicketGridCell>
        ))}
      </div>
    );
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

  return (
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
                <div className="contents" key={`group-${group.id}`} role="row">
                  <div
                    aria-label={`${group.label} ${group.rows.length}`}
                    className={cn(
                      "flex h-8 items-center gap-2 border-b border-slate-700 bg-slate-700 px-3 text-sm font-semibold text-white",
                      firstGroup ? null : "border-t border-slate-700",
                    )}
                    role="cell"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {groupLabel(group)}
                    </span>
                    <span className="text-white/75">{group.rows.length}</span>
                  </div>
                </div>
              );
            const renderedRows = group.rows.map((row) =>
              renderRow(row, rowIndex++),
            );

            return groupHeader ? [groupHeader, ...renderedRows] : renderedRows;
          })}
        </div>
      </div>
      <TicketTablePagination
        loadedCount={visibleLoadedCount}
        loadingMore={loadingMore}
        loadMoreError={loadMoreError}
        nextCursor={nextCursor}
        onLoadMore={onLoadMore}
        totalCount={totalCount}
      />
    </div>
  );
}

function rowPriorityKey(group: TicketTableGroup) {
  return group.rows.find((row) => row.priorityKey === group.value)?.priorityKey;
}

function rowStateKey(group: TicketTableGroup) {
  return group.rows.find((row) => row.stateKey === group.value)?.stateKey;
}
