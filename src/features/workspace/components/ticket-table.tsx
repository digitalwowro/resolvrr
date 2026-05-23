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
import { Checkbox } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { SortDirection } from "@/components/ui";
import type {
  StaticColumnKey,
  StaticSortKey,
  StaticTicketPriority,
  StaticTicketRow,
  StaticTicketState,
} from "../static-types";
import {
  ticketGridTemplate,
  ticketGridTableClass,
  TicketGridCell,
  TicketGridHeaderCell,
  TicketGridStaticHeaderCell,
} from "./ticket-table-grid";

type TicketTableProps = {
  rows: StaticTicketRow[];
  visibleColumns: Set<StaticColumnKey>;
  selectedRowIds: Set<string>;
  activeTicketId: string;
  sortDirectionFor(key: StaticSortKey): SortDirection | undefined;
  onSort(key: StaticSortKey): void;
  onRowSelect(ticketId: string): void;
  onToggleRow(ticketId: string): void;
  roundedTop?: boolean;
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
  roundedTop = true,
}: TicketTableProps) {
  const templateStyle = ticketGridTemplate(visibleColumns);

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
              onSort={() => onSort("number")}
              sortDirection={sortDirectionFor("number")}
            />
            <TicketGridHeaderCell
              label="Title"
              onSort={() => onSort("title")}
              sortDirection={sortDirectionFor("title")}
            />
            {visibleColumns.has("customer") ? (
              <TicketGridHeaderCell
                label="Customer"
                onSort={() => onSort("customer")}
                sortDirection={sortDirectionFor("customer")}
              />
            ) : null}
            {visibleColumns.has("owner") ? (
              <TicketGridHeaderCell
                label="Owner"
                onSort={() => onSort("owner")}
                sortDirection={sortDirectionFor("owner")}
              />
            ) : null}
            {visibleColumns.has("state") ? (
              <TicketGridHeaderCell
                label="State"
                onSort={() => onSort("state")}
                sortDirection={sortDirectionFor("state")}
              />
            ) : null}
            {visibleColumns.has("priority") ? (
              <TicketGridHeaderCell
                label="Priority"
                onSort={() => onSort("priority")}
                sortDirection={sortDirectionFor("priority")}
              />
            ) : null}
            {visibleColumns.has("pendingTill") ? (
              <TicketGridHeaderCell
                label="Pending till"
                onSort={() => onSort("pendingTill")}
                sortDirection={sortDirectionFor("pendingTill")}
              />
            ) : null}
            {visibleColumns.has("updatedAt") ? (
              <TicketGridHeaderCell
                label="Updated at"
                onSort={() => onSort("updatedAt")}
                sortDirection={sortDirectionFor("updatedAt")}
              />
            ) : null}
          </div>
        </div>
        <div className="contents" role="rowgroup">
          {rows.map((row, index) => {
            const active = row.id === activeTicketId;
            const cellBorderClass = index === rows.length - 1 ? "border-b-0" : "";
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
                    <span className="block truncate font-semibold">
                      {row.title}
                    </span>
                  </button>
                </TicketGridCell>
                {visibleColumns.has("customer") ? (
                  <TicketGridCell
                    className={cn(
                      "min-w-0 max-w-56",
                      rowCellClass,
                      cellBorderClass,
                    )}
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
          })}
        </div>
      </div>
    </div>
  );
}
