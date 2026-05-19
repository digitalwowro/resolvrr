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
      <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col className="w-10" />
          <col className="w-24" />
          <col className="w-[28%]" />
          {visibleColumns.has("customer") ? <col className="w-[18%]" /> : null}
          {visibleColumns.has("owner") ? <col className="w-[14%]" /> : null}
          {visibleColumns.has("state") ? <col className="w-40" /> : null}
          {visibleColumns.has("priority") ? <col className="w-28" /> : null}
          {visibleColumns.has("pendingTill") ? <col className="w-36" /> : null}
          {visibleColumns.has("updatedAt") ? <col className="w-36" /> : null}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="h-8 w-9 border-b border-slate-200 bg-slate-50 px-2" />
            <TableHeaderCell
              className="w-24 text-xs"
              label="#"
              onSort={() => onSort("number")}
              sortDirection={sortDirectionFor("number", sortKey, sortDirection)}
            />
            <TableHeaderCell
              className="text-xs"
              label="Title"
              onSort={() => onSort("title")}
              sortDirection={sortDirectionFor("title", sortKey, sortDirection)}
            />
            {visibleColumns.has("customer") ? (
              <TableHeaderCell className="text-xs" label="Customer" />
            ) : null}
            {visibleColumns.has("owner") ? (
              <TableHeaderCell className="text-xs" label="Owner" />
            ) : null}
            {visibleColumns.has("state") ? (
              <TableHeaderCell className="w-40 text-xs" label="State" />
            ) : null}
            {visibleColumns.has("priority") ? (
              <TableHeaderCell
                className="w-28 text-xs"
                label="Priority"
                onSort={() => onSort("priority")}
                sortDirection={sortDirectionFor("priority", sortKey, sortDirection)}
              />
            ) : null}
            {visibleColumns.has("pendingTill") ? (
              <TableHeaderCell
                className="w-36 text-xs"
                label="Pending till"
                onSort={() => onSort("pendingTill")}
                sortDirection={sortDirectionFor("pendingTill", sortKey, sortDirection)}
              />
            ) : null}
            {visibleColumns.has("updatedAt") ? (
              <TableHeaderCell
                className="w-36 text-xs"
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
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-sm font-semibold text-slate-600">
                  {row.number}
                </td>
                <td className="border-b border-slate-100 px-2 py-2">
                  <button
                    className="block w-full rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => onRowSelect(row.id)}
                    type="button"
                  >
                    <span className="block truncate font-semibold text-slate-800">
                      {row.title}
                    </span>
                  </button>
                </td>
                {visibleColumns.has("customer") ? (
                  <td className="truncate border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.customer}
                  </td>
                ) : null}
                {visibleColumns.has("owner") ? (
                  <td className="truncate border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.owner}
                  </td>
                ) : null}
                {visibleColumns.has("state") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2">
                    <StateCell state={row.state} />
                  </td>
                ) : null}
                {visibleColumns.has("priority") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2">
                    <PriorityCell priority={row.priority} />
                  </td>
                ) : null}
                {visibleColumns.has("pendingTill") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-slate-700">
                    {row.pendingTill}
                  </td>
                ) : null}
                {visibleColumns.has("updatedAt") ? (
                  <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-slate-700">
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
