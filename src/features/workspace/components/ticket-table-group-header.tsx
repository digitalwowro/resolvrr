"use client";

import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceTicketGroupKey } from "@/features/tickets/workspace-adapter";
import { PriorityCell, StateCell } from "./ticket-table-cells";
import type { TicketTableGroup } from "./ticket-table-types";

type TicketTableGroupHeaderProps = {
  firstGroup: boolean;
  group: TicketTableGroup;
  groupBy: WorkspaceTicketGroupKey;
  groupLoadMoreError?: { groupId: string; reason: string };
  loadingGroupId?: string;
  onLoadMoreGroup?(group: TicketTableGroup): void;
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
        monochrome
        priority={group.value === "unknown" ? undefined : rowPriorityKey(group)}
      />
    );
  }

  if (groupBy === "state") {
    return (
      <StateCell
        label={group.label}
        monochrome
        state={group.value === "unknown" ? undefined : rowStateKey(group)}
      />
    );
  }

  return group.label;
}

function groupCountLabel(group: TicketTableGroup) {
  const loaded = group.loadedCount ?? group.rows.length;
  return group.totalCount === undefined ? `${loaded}` : `${loaded}/${group.totalCount}`;
}

export function TicketTableGroupHeader({
  firstGroup,
  group,
  groupBy,
  groupLoadMoreError,
  loadingGroupId,
  onLoadMoreGroup,
}: TicketTableGroupHeaderProps) {
  return (
    <div className="contents" key={`group-${group.id}`} role="row">
      <div
        aria-label={`${group.label} ${groupCountLabel(group)}`}
        className={cn(
          "flex h-8 items-center gap-2 border-b border-slate-700 bg-slate-700 px-3 text-sm font-semibold text-white",
          firstGroup ? null : "border-t border-slate-700",
        )}
        role="cell"
        style={{ gridColumn: "1 / -1" }}
      >
        <span className="inline-flex items-center gap-1.5">
          {groupLabel(group, groupBy)}
        </span>
        <span className="text-white/75">{groupCountLabel(group)}</span>
        {groupLoadMoreError?.groupId === group.id ? (
          <span className="ml-auto text-xs text-red-100" role="alert">
            Could not load more tickets.
          </span>
        ) : null}
        {group.nextCursor && onLoadMoreGroup ? (
          <Button
            className="ml-auto h-6 border-white/30 bg-white/10 px-2 text-xs text-white hover:bg-white/20"
            loading={loadingGroupId === group.id}
            onClick={() => onLoadMoreGroup(group)}
            type="button"
            variant="secondary"
          >
            Load more
          </Button>
        ) : null}
      </div>
    </div>
  );
}
