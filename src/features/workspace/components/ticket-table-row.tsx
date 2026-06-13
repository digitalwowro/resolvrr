"use client";

import { Checkbox } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketRow,
} from "@/features/tickets/workspace-adapter";
import { PriorityCell, StateCell } from "./ticket-table-cells";
import { TicketGridCell } from "./ticket-table-grid";

type TicketTableRowProps = {
  activeTicketId?: string;
  columns: WorkspaceTicketColumn[];
  groupBoundaryAfter?: boolean;
  index: number;
  onRowSelect(ticketId: string): void;
  onToggleRow(ticketId: string): void;
  row: WorkspaceTicketRow;
  rowCount: number;
  selectedRowIds: Set<string>;
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
    return (
      <PriorityCell
        label={row.priority}
        priority={row.priorityKey}
        variant="pill"
      />
    );
  }
  if (column === "pendingTill") {
    return row.pendingTill;
  }

  return row.updatedAt;
}

export function TicketTableRow({
  activeTicketId,
  columns,
  groupBoundaryAfter = false,
  index,
  onRowSelect,
  onToggleRow,
  row,
  rowCount,
  selectedRowIds,
}: TicketTableRowProps) {
  const active = row.id === activeTicketId;
  const cellBorderClass =
    groupBoundaryAfter
      ? "border-slate-200"
      : index === rowCount - 1
        ? "border-b-0"
        : "";
  const rowCellClass = active ? "bg-slate-50" : "bg-white group-hover:bg-slate-50";

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
      <TicketGridCell className={cn("whitespace-nowrap", rowCellClass, cellBorderClass)}>
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
      {columns.map((column) => (
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
