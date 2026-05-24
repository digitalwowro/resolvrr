import type { DropdownOption, SortDirection } from "@/components/ui";
import type { TicketTableGroup } from "./ticket-table";
import type {
  StaticSortKey,
  StaticTicketGroupKey,
  StaticTicketPriority,
  StaticTicketRow,
  StaticTicketState,
} from "../static-types";

const priorityRank: Record<StaticTicketPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const stateOrder: StaticTicketState[] = [
  "New",
  "Open",
  "Pending Reminder",
  "Pending Close",
  "Closed",
];

const priorityOrder: StaticTicketPriority[] = ["High", "Medium", "Low"];

export const ticketGroupOptions: DropdownOption[] = [
  { value: "none", label: "No grouping" },
  { value: "priority", label: "Priority" },
  { value: "state", label: "State" },
  { value: "owner", label: "Owner" },
  { value: "customer", label: "Customer" },
];

export function sortTicketRows(
  rows: StaticTicketRow[],
  sortKey: StaticSortKey,
  direction: SortDirection,
) {
  const sign = direction === "ascending" ? 1 : -1;

  return [...rows].sort((first, second) => {
    if (sortKey === "priority") {
      return (priorityRank[first.priority] - priorityRank[second.priority]) * sign;
    }

    const firstValue = first[sortKey];
    const secondValue = second[sortKey];
    return firstValue.localeCompare(secondValue) * sign;
  });
}

export function groupTicketRows(
  rows: StaticTicketRow[],
  groupBy: StaticTicketGroupKey,
  sortKey: StaticSortKey,
  direction: SortDirection,
): TicketTableGroup[] {
  if (groupBy === "none") {
    return [{ id: "all", label: "All tickets", value: "all", rows }];
  }

  const grouped = new Map<string, StaticTicketRow[]>();
  for (const row of rows) {
    const value = row[groupBy];
    grouped.set(value, [...(grouped.get(value) ?? []), row]);
  }

  const values = [...grouped.keys()].sort((first, second) => {
    if (groupBy === "priority") {
      return (
        priorityOrder.indexOf(first as StaticTicketPriority) -
        priorityOrder.indexOf(second as StaticTicketPriority)
      );
    }

    if (groupBy === "state") {
      return (
        stateOrder.indexOf(first as StaticTicketState) -
        stateOrder.indexOf(second as StaticTicketState)
      );
    }

    return first.localeCompare(second);
  });

  return values.map((value) => ({
    id: `${groupBy}-${value}`,
    label: value,
    value,
    rows: sortTicketRows(grouped.get(value) ?? [], sortKey, direction),
  }));
}
