"use client";

import { Checkbox, StatusBadge, TableHeaderCell } from "@/components/ui";
import type { SortDirection } from "@/components/ui";
import type {
  StaticColumnKey,
  StaticSortKey,
  StaticTicketPriority,
  StaticTicketRow,
  StaticTicketState,
} from "../static-types";

type TicketTableProps = {
  rows: StaticTicketRow[];
  visibleColumns: Set<StaticColumnKey>;
  selectedRowIds: Set<string>;
  activeTicketId: string;
  sortKey: StaticSortKey;
  sortDirection: SortDirection;
  onSort(key: StaticSortKey): void;
  onRowSelect(ticketId: string): void;
  onToggleRow(ticketId: string): void;
};

const stateTone: Record<StaticTicketState, "success" | "warning" | "danger" | "info"> = {
  open: "info",
  pending: "warning",
  escalated: "danger",
  resolved: "success",
};

const priorityTone: Record<
  StaticTicketPriority,
  "neutral" | "warning" | "danger"
> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

function sortDirectionFor(
  key: StaticSortKey,
  sortKey: StaticSortKey,
  direction: SortDirection,
) {
  return key === sortKey ? direction : undefined;
}

export function TicketTable({
  rows,
  visibleColumns,
  selectedRowIds,
  activeTicketId,
  sortKey,
  sortDirection,
  onSort,
  onRowSelect,
  onToggleRow,
}: TicketTableProps) {
  return (
    <div className="min-h-0 overflow-auto bg-white">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="h-9 w-9 border-b border-slate-200 bg-slate-50 px-2" />
            <TableHeaderCell
              className="min-w-80"
              label="Ticket"
              onResizeStep={() => undefined}
              onSort={() => onSort("ticket")}
              sortDirection={sortDirectionFor("ticket", sortKey, sortDirection)}
            />
            {visibleColumns.has("requester") ? (
              <TableHeaderCell label="Requester" />
            ) : null}
            {visibleColumns.has("workspace") ? (
              <TableHeaderCell label="Workspace" />
            ) : null}
            {visibleColumns.has("state") ? <TableHeaderCell label="State" /> : null}
            {visibleColumns.has("priority") ? (
              <TableHeaderCell
                label="Priority"
                onSort={() => onSort("priority")}
                sortDirection={sortDirectionFor("priority", sortKey, sortDirection)}
              />
            ) : null}
            {visibleColumns.has("assignee") ? (
              <TableHeaderCell label="Assignee" />
            ) : null}
            {visibleColumns.has("updated") ? (
              <TableHeaderCell
                label="Updated"
                onSort={() => onSort("updated")}
                sortDirection={sortDirectionFor("updated", sortKey, sortDirection)}
              />
            ) : null}
            {visibleColumns.has("sla") ? (
              <TableHeaderCell
                label="SLA"
                onSort={() => onSort("sla")}
                sortDirection={sortDirectionFor("sla", sortKey, sortDirection)}
              />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = row.id === activeTicketId;

            return (
              <tr
                className={active ? "bg-indigo-50/60" : "bg-white hover:bg-slate-50"}
                key={row.id}
              >
                <td className="border-b border-slate-100 px-2 py-2 align-top">
                  <Checkbox
                    checked={selectedRowIds.has(row.id)}
                    className="items-center [&>span]:sr-only"
                    label={`Select ${row.ticketNumber}`}
                    name={`select-${row.id}`}
                    onChange={() => onToggleRow(row.id)}
                  />
                </td>
                <td className="max-w-md border-b border-slate-100 px-2 py-2 align-top">
                  <button
                    className="block w-full rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => onRowSelect(row.id)}
                    type="button"
                  >
                    <span className="font-medium text-slate-950">
                      {row.ticketNumber} {row.subject}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {row.preview}
                    </span>
                  </button>
                </td>
                {visibleColumns.has("requester") ? (
                  <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.requester}
                  </td>
                ) : null}
                {visibleColumns.has("workspace") ? (
                  <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.workspace}
                  </td>
                ) : null}
                {visibleColumns.has("state") ? (
                  <td className="border-b border-slate-100 px-2 py-2">
                    <StatusBadge label={row.state} tone={stateTone[row.state]} />
                  </td>
                ) : null}
                {visibleColumns.has("priority") ? (
                  <td className="border-b border-slate-100 px-2 py-2">
                    <StatusBadge
                      label={row.priority}
                      tone={priorityTone[row.priority]}
                    />
                  </td>
                ) : null}
                {visibleColumns.has("assignee") ? (
                  <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.assignee}
                  </td>
                ) : null}
                {visibleColumns.has("updated") ? (
                  <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.updated}
                  </td>
                ) : null}
                {visibleColumns.has("sla") ? (
                  <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.sla}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
