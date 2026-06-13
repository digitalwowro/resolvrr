import type { WorkspaceTicketGroupKey } from "@/features/tickets/workspace-adapter";
import { PriorityCell, StateCell } from "./ticket-table-cells";
import type { TicketTableGroup } from "./ticket-table-types";

type TicketTableGroupHeaderProps = {
  group: TicketTableGroup;
  groupBy: WorkspaceTicketGroupKey;
  groupLoadMoreError?: { groupId: string; reason: string };
};

function rowPriorityKey(group: TicketTableGroup) {
  return group.rows.find((row) => row.priorityKey === group.value)?.priorityKey;
}

function rowStateKey(group: TicketTableGroup) {
  return group.rows.find((row) => row.stateKey === group.value)?.stateKey;
}

function groupLabel(group: TicketTableGroup, groupBy: WorkspaceTicketGroupKey) {
  if (groupBy === "priority") {
    return (
      <PriorityCell
        label={group.label}
        priority={group.value === "unknown" ? undefined : rowPriorityKey(group)}
        variant="pill"
      />
    );
  }

  if (groupBy === "state") {
    return (
      <StateCell
        label={group.label}
        state={group.value === "unknown" ? undefined : rowStateKey(group)}
      />
    );
  }

  return group.label;
}

export function TicketTableGroupHeader({
  group,
  groupBy,
  groupLoadMoreError,
}: TicketTableGroupHeaderProps) {
  return (
    <div className="contents" key={`group-${group.id}`} role="row">
      <div
        aria-label={`${group.label} group`}
        className="col-span-full flex h-10 items-center gap-2 border-b border-slate-200 bg-white px-3 text-sm font-semibold text-black"
        role="cell"
      >
        <span className="inline-flex items-center gap-1.5">
          {groupLabel(group, groupBy)}
        </span>
        {groupLoadMoreError?.groupId === group.id ? (
          <span className="ml-auto text-xs text-red-600" role="alert">
            Could not load more tickets.
          </span>
        ) : null}
      </div>
    </div>
  );
}
