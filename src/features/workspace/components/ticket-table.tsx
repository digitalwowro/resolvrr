"use client";

import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  PauseCircle,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from "lucide-react";
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableHeadStaticCell,
  TableRoot,
  TableRow,
} from "@/components/ui";
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
  sortDirectionFor(key: StaticSortKey): SortDirection | undefined;
  onSort(key: StaticSortKey): void;
  onRowSelect(ticketId: string): void;
  onToggleRow(ticketId: string): void;
};

const stateClass: Record<StaticTicketState, string> = {
  New: "text-rose-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: CirclePlus,
  Open: Circle,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

const priorityClass: Record<StaticTicketPriority, string> = {
  Low: "text-emerald-600",
  Medium: "text-indigo-600",
  High: "text-rose-600",
};

const priorityIcon: Record<StaticTicketPriority, LucideIcon> = {
  Low: SignalLow,
  Medium: SignalMedium,
  High: SignalHigh,
};

function StateCell({ state }: { state: StaticTicketState }) {
  const Icon = stateIcon[state];

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className={`size-3.5 ${stateClass[state]}`} />
      {state}
    </span>
  );
}

function PriorityCell({ priority }: { priority: StaticTicketPriority }) {
  const Icon = priorityIcon[priority];

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className={`size-3.5 ${priorityClass[priority]}`} />
      {priority}
    </span>
  );
}

export function TicketTable({
  rows,
  visibleColumns,
  selectedRowIds,
  activeTicketId,
  sortDirectionFor,
  onSort,
  onRowSelect,
  onToggleRow,
}: TicketTableProps) {
  return (
    <TableRoot className="rounded-t-none border-t">
      <Table className="min-w-6xl">
        <colgroup>
          <col className="w-9" />
          <col className="w-24" />
          <col />
          {visibleColumns.has("customer") ? <col /> : null}
          {visibleColumns.has("owner") ? <col /> : null}
          {visibleColumns.has("state") ? <col className="w-38" /> : null}
          {visibleColumns.has("priority") ? <col className="w-25" /> : null}
          {visibleColumns.has("pendingTill") ? <col className="w-32" /> : null}
          {visibleColumns.has("updatedAt") ? <col className="w-34" /> : null}
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHeadStaticCell className="w-9" />
            <TableHeaderCell
              className="w-24"
              label="#"
              onSort={() => onSort("number")}
              sortDirection={sortDirectionFor("number")}
            />
            <TableHeaderCell
              label="Title"
              onSort={() => onSort("title")}
              sortDirection={sortDirectionFor("title")}
            />
            {visibleColumns.has("customer") ? (
              <TableHeaderCell
                label="Customer"
                onSort={() => onSort("customer")}
                sortDirection={sortDirectionFor("customer")}
              />
            ) : null}
            {visibleColumns.has("owner") ? (
              <TableHeaderCell
                label="Owner"
                onSort={() => onSort("owner")}
                sortDirection={sortDirectionFor("owner")}
              />
            ) : null}
            {visibleColumns.has("state") ? (
              <TableHeaderCell
                className="w-38"
                label="State"
                onSort={() => onSort("state")}
                sortDirection={sortDirectionFor("state")}
              />
            ) : null}
            {visibleColumns.has("priority") ? (
              <TableHeaderCell
                className="w-25"
                label="Priority"
                onSort={() => onSort("priority")}
                sortDirection={sortDirectionFor("priority")}
              />
            ) : null}
            {visibleColumns.has("pendingTill") ? (
              <TableHeaderCell
                className="w-32"
                label="Pending till"
                onSort={() => onSort("pendingTill")}
                sortDirection={sortDirectionFor("pendingTill")}
              />
            ) : null}
            {visibleColumns.has("updatedAt") ? (
              <TableHeaderCell
                className="w-34"
                label="Updated at"
                onSort={() => onSort("updatedAt")}
                sortDirection={sortDirectionFor("updatedAt")}
              />
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const active = row.id === activeTicketId;

            return (
              <TableRow
                aria-selected={active}
                className={active ? "bg-slate-50" : "bg-white hover:bg-slate-50"}
                key={row.id}
              >
                <TableCell className="align-middle">
                  <Checkbox
                    checked={selectedRowIds.has(row.id)}
                    className="items-center"
                    hideLabel
                    label={`Select ${row.number}`}
                    name={`select-${row.id}`}
                    onChange={() => onToggleRow(row.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.number}
                </TableCell>
                <TableCell className="min-w-0">
                  <button
                    className="block w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => onRowSelect(row.id)}
                    type="button"
                  >
                    <span className="block truncate font-semibold">
                      {row.title}
                    </span>
                  </button>
                </TableCell>
                {visibleColumns.has("customer") ? (
                  <TableCell className="min-w-0 truncate">
                    {row.customer}
                  </TableCell>
                ) : null}
                {visibleColumns.has("owner") ? (
                  <TableCell className="min-w-0 truncate">
                    {row.owner}
                  </TableCell>
                ) : null}
                {visibleColumns.has("state") ? (
                  <TableCell className="whitespace-nowrap">
                    <StateCell state={row.state} />
                  </TableCell>
                ) : null}
                {visibleColumns.has("priority") ? (
                  <TableCell className="whitespace-nowrap">
                    <PriorityCell priority={row.priority} />
                  </TableCell>
                ) : null}
                {visibleColumns.has("pendingTill") ? (
                  <TableCell className="whitespace-nowrap">
                    {row.pendingTill}
                  </TableCell>
                ) : null}
                {visibleColumns.has("updatedAt") ? (
                  <TableCell className="whitespace-nowrap">
                    {row.updatedAt}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableRoot>
  );
}
