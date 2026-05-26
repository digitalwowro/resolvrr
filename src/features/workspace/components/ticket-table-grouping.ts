import type { DropdownOption, SortDirection } from "@/components/ui";
import { ticketPriorityDefinitions } from "@/core/tickets";
import type {
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets/workspace-adapter";
import type { TicketTableGroup } from "./ticket-table";

const priorityOrder = ["high", "medium", "low"];
const stateOrder = [
  "new",
  "open",
  "pending_reminder",
  "pending_close",
  "closed",
];

export const ticketGroupOptions: DropdownOption[] = [
  { value: "none", label: "No grouping" },
  { value: "priority", label: "Priority" },
  { value: "state", label: "State" },
  { value: "owner", label: "Owner" },
  { value: "customer", label: "Customer" },
  { value: "group", label: "Group" },
];

function rowSortValue(row: WorkspaceTicketRow, sortKey: WorkspaceTicketSortKey) {
  if (sortKey === "priority") {
    return row.priorityKey ? ticketPriorityDefinitions[row.priorityKey].rank : 0;
  }

  if (sortKey === "state") {
    return row.stateKey
      ? stateOrder.indexOf(row.stateKey)
      : Number.MAX_SAFE_INTEGER;
  }

  return row[sortKey];
}

export function sortTicketRows(
  rows: WorkspaceTicketRow[],
  sortKey: WorkspaceTicketSortKey,
  direction: SortDirection,
) {
  const sign = direction === "ascending" ? 1 : -1;

  return [...rows].sort((first, second) => {
    const firstValue = rowSortValue(first, sortKey);
    const secondValue = rowSortValue(second, sortKey);

    if (typeof firstValue === "number" && typeof secondValue === "number") {
      return (firstValue - secondValue) * sign;
    }

    return String(firstValue).localeCompare(String(secondValue)) * sign;
  });
}

function groupValue(row: WorkspaceTicketRow, groupBy: WorkspaceTicketGroupKey) {
  if (groupBy === "priority") {
    return {
      id: row.priorityKey ?? "unknown",
      label: row.priorityKey ? row.priority : "Unknown",
      value: row.priorityKey ?? "unknown",
    };
  }

  if (groupBy === "state") {
    return {
      id: row.stateKey ?? "unknown",
      label: row.stateKey ? row.state : "Unknown",
      value: row.stateKey ?? "unknown",
    };
  }

  const label =
    groupBy === "owner"
      ? row.owner
      : groupBy === "customer"
        ? row.customer
        : row.group;
  return { id: label, label, value: label };
}

function groupSortValue(groupBy: WorkspaceTicketGroupKey, value: string) {
  if (groupBy === "priority") {
    const index = priorityOrder.indexOf(value);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  if (groupBy === "state") {
    const index = stateOrder.indexOf(value);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  return value;
}

export function groupTicketRows(
  rows: WorkspaceTicketRow[],
  groupBy: WorkspaceTicketGroupKey,
  sortKey: WorkspaceTicketSortKey,
  direction: SortDirection,
): TicketTableGroup[] {
  if (groupBy === "none") {
    return [{ id: "all", label: "All tickets", value: "all", rows }];
  }

  const grouped = new Map<
    string,
    { label: string; value: string; rows: WorkspaceTicketRow[] }
  >();
  for (const row of rows) {
    const group = groupValue(row, groupBy);
    const existing = grouped.get(group.id);
    grouped.set(group.id, {
      label: group.label,
      value: group.value,
      rows: [...(existing?.rows ?? []), row],
    });
  }

  return [...grouped.entries()]
    .sort(([, first], [, second]) => {
      const firstValue = groupSortValue(groupBy, first.value);
      const secondValue = groupSortValue(groupBy, second.value);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return firstValue - secondValue;
      }

      return String(firstValue).localeCompare(String(secondValue));
    })
    .map(([id, group]) => ({
      id: `${groupBy}-${id}`,
      label: group.label,
      value: group.value,
      rows: sortTicketRows(group.rows, sortKey, direction),
    }));
}
