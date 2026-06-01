"use client";

import { Checkbox } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { SortDirection } from "@/components/ui";
import type {
  StaticColumnKey,
  StaticSortKey,
  StaticTicketGroupKey,
  StaticTicketPriority,
  StaticTicketRow,
  StaticTicketState,
} from "../static-types";
import { PriorityCell, StateCell } from "./ticket-table-cells";
import {
  ticketGridTemplate,
  ticketGridTableClass,
  TicketGridCell,
  TicketGridHeaderCell,
  TicketGridStaticHeaderCell,
} from "./ticket-table-grid";

type TicketTableProps = {
  rows: StaticTicketRow[];
  groupedRows?: TicketTableGroup[];
  groupBy: StaticTicketGroupKey;
  visibleColumns: Set<StaticColumnKey>;
  selectedRowIds: Set<string>;
  activeTicketId: string;
  sortDirectionFor(key: StaticSortKey): SortDirection | undefined;
  onSort(key: StaticSortKey): void;
  onRowSelect(ticketId: string): void;
  onToggleRow(ticketId: string): void;
  roundedTop?: boolean;
};

export type TicketTableGroup = {
  id: string;
  label: string;
  value: string;
  rows: StaticTicketRow[];
};

export function TicketTable({
  rows,
  groupedRows,
  groupBy,
  visibleColumns,
  selectedRowIds,
  activeTicketId,
  sortDirectionFor,
  onSort,
  onRowSelect,
  onToggleRow,
  roundedTop = true,
}: TicketTableProps) {
  const templateStyle = ticketGridTemplate(visibleColumns);
  const groups = groupedRows ?? [{ id: "all", label: "", value: "", rows }];
  const rowCount = groups.reduce((total, group) => total + group.rows.length, 0);
  let rowIndex = 0;

  function sortHandler(key: StaticSortKey) {
    return groupBy === key ? undefined : () => onSort(key);
  }

  function sortDirection(key: StaticSortKey) {
    return groupBy === key ? undefined : sortDirectionFor(key);
  }

  function groupLabel(group: TicketTableGroup) {
    if (groupBy === "priority") {
      return (
        <PriorityCell
          monochrome
          priority={group.value as StaticTicketPriority}
        />
      );
    }

    if (groupBy === "state") {
      return <StateCell monochrome state={group.value as StaticTicketState} />;
    }

    return group.label;
  }

  function renderRow(row: StaticTicketRow, index: number) {
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
          </button>
        </TicketGridCell>
        {visibleColumns.has("customer") ? (
          <TicketGridCell
            className={cn("min-w-0 max-w-56", rowCellClass, cellBorderClass)}
          >
            <span className="block min-w-0 truncate whitespace-nowrap">
              {row.customer}
            </span>
          </TicketGridCell>
        ) : null}
        {visibleColumns.has("owner") ? (
          <TicketGridCell
            className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}
          >
            {row.owner}
          </TicketGridCell>
        ) : null}
        {visibleColumns.has("state") ? (
          <TicketGridCell
            className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}
          >
            <StateCell state={row.state} />
          </TicketGridCell>
        ) : null}
        {visibleColumns.has("priority") ? (
          <TicketGridCell
            className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}
          >
            <PriorityCell priority={row.priority} />
          </TicketGridCell>
        ) : null}
        {visibleColumns.has("pendingTill") ? (
          <TicketGridCell
            className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}
          >
            {row.pendingTill}
          </TicketGridCell>
        ) : null}
        {visibleColumns.has("updatedAt") ? (
          <TicketGridCell
            className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}
          >
            {row.updatedAt}
          </TicketGridCell>
        ) : null}
      </div>
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
            {visibleColumns.has("customer") ? (
              <TicketGridHeaderCell
                label="Customer"
                onSort={sortHandler("customer")}
                sortDirection={sortDirection("customer")}
              />
            ) : null}
            {visibleColumns.has("owner") ? (
              <TicketGridHeaderCell
                label="Owner"
                onSort={sortHandler("owner")}
                sortDirection={sortDirection("owner")}
              />
            ) : null}
            {visibleColumns.has("state") ? (
              <TicketGridHeaderCell
                label="State"
                onSort={sortHandler("state")}
                sortDirection={sortDirection("state")}
              />
            ) : null}
            {visibleColumns.has("priority") ? (
              <TicketGridHeaderCell
                label="Priority"
                onSort={sortHandler("priority")}
                sortDirection={sortDirection("priority")}
              />
            ) : null}
            {visibleColumns.has("pendingTill") ? (
              <TicketGridHeaderCell
                label="Pending till"
                onSort={sortHandler("pendingTill")}
                sortDirection={sortDirection("pendingTill")}
              />
            ) : null}
            {visibleColumns.has("updatedAt") ? (
              <TicketGridHeaderCell
                label="Updated at"
                onSort={sortHandler("updatedAt")}
                sortDirection={sortDirection("updatedAt")}
              />
            ) : null}
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
    </div>
  );
}
