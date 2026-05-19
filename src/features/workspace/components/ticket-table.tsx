"use client";

import {
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import { Checkbox, TableHeaderCell } from "@/components/ui";
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

const stateClass: Record<StaticTicketState, string> = {
  New: "text-sky-700",
  Open: "text-indigo-700",
  "Pending Reminder": "text-amber-700",
  "Pending Close": "text-slate-600",
  Closed: "text-emerald-700",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: Circle,
  Open: CircleDot,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

const priorityClass: Record<StaticTicketPriority, string> = {
  Low: "bg-slate-400",
  Medium: "bg-amber-500",
  High: "bg-rose-500",
};

function sortDirectionFor(
  key: StaticSortKey,
  sortKey: StaticSortKey,
  direction: SortDirection,
) {
  return key === sortKey ? direction : undefined;
}

function StateCell({ state }: { state: StaticTicketState }) {
  const Icon = stateIcon[state];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${stateClass[state]}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {state}
    </span>
  );
}

function PriorityCell({ priority }: { priority: StaticTicketPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${priorityClass[priority]}`}
      />
      {priority}
    </span>
  );
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
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="h-8 w-9 border-b border-slate-200 bg-slate-50 px-2" />
            <TableHeaderCell
              className="w-24"
              label="#"
              onSort={() => onSort("number")}
              sortDirection={sortDirectionFor("number", sortKey, sortDirection)}
            />
            <TableHeaderCell
              className="min-w-80"
              label="Title"
              onSort={() => onSort("title")}
              sortDirection={sortDirectionFor("title", sortKey, sortDirection)}
            />
            {visibleColumns.has("customer") ? (
              <TableHeaderCell className="min-w-40" label="Customer" />
            ) : null}
            {visibleColumns.has("owner") ? (
              <TableHeaderCell className="min-w-36" label="Owner" />
            ) : null}
            {visibleColumns.has("state") ? (
              <TableHeaderCell className="w-36" label="State" />
            ) : null}
            {visibleColumns.has("priority") ? (
              <TableHeaderCell
                className="w-28"
                label="Priority"
                onSort={() => onSort("priority")}
                sortDirection={sortDirectionFor("priority", sortKey, sortDirection)}
              />
            ) : null}
            {visibleColumns.has("pendingTill") ? (
              <TableHeaderCell
                className="w-36"
                label="Pending till"
                onSort={() => onSort("pendingTill")}
                sortDirection={sortDirectionFor("pendingTill", sortKey, sortDirection)}
              />
            ) : null}
            {visibleColumns.has("updatedAt") ? (
              <TableHeaderCell
                className="w-28"
                label="Updated at"
                onSort={() => onSort("updatedAt")}
                sortDirection={sortDirectionFor("updatedAt", sortKey, sortDirection)}
              />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = row.id === activeTicketId;

            return (
              <tr
                aria-selected={active}
                className={active ? "bg-slate-50" : "bg-white hover:bg-slate-50"}
                key={row.id}
              >
                <td className="border-b border-slate-100 px-2 py-1.5 align-middle">
                  <Checkbox
                    checked={selectedRowIds.has(row.id)}
                    className="items-center [&>span]:sr-only"
                    label={`Select ${row.number}`}
                    name={`select-${row.id}`}
                    onChange={() => onToggleRow(row.id)}
                  />
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600">
                  {row.number}
                </td>
                <td className="max-w-xl border-b border-slate-100 px-2 py-1.5">
                  <button
                    className="block w-full rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => onRowSelect(row.id)}
                    type="button"
                  >
                    <span className="block truncate font-medium text-slate-950">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {row.preview}
                    </span>
                  </button>
                </td>
                {visibleColumns.has("customer") ? (
                  <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                    {row.customer}
                  </td>
                ) : null}
                {visibleColumns.has("owner") ? (
                  <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                    {row.owner}
                  </td>
                ) : null}
                {visibleColumns.has("state") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5">
                    <StateCell state={row.state} />
                  </td>
                ) : null}
                {visibleColumns.has("priority") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5">
                    <PriorityCell priority={row.priority} />
                  </td>
                ) : null}
                {visibleColumns.has("pendingTill") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-xs text-slate-700">
                    {row.pendingTill}
                  </td>
                ) : null}
                {visibleColumns.has("updatedAt") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-xs text-slate-700">
                    {row.updatedAt}
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
