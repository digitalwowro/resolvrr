"use client";

import {
  BriefcaseBusiness,
  CircleDot,
  ListChecks,
  RefreshCw,
  Rows3,
  SignalHigh,
  User,
} from "lucide-react";
import {
  Button,
  DropdownSelect,
  SearchableDropdown,
  dropdownIconClass,
  type DropdownOption,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
} from "@/features/tickets/workspace-adapter";
import { TicketColumnVisibilityAction } from "./ticket-column-visibility-action";

type TicketListToolbarProps = {
  columns: WorkspaceTicketColumn[];
  groupBy: WorkspaceTicketGroupKey;
  groupOptions: DropdownOption[];
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  onGroupByChange(groupBy: WorkspaceTicketGroupKey): void;
  onRefresh(): void;
  onSavedViewChange(savedViewId: string): void;
  refreshing?: boolean;
  savedViewOptions: DropdownOption[];
  selectedSavedViewId: string;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export function TicketListToolbar({
  columns,
  groupBy,
  groupOptions,
  onColumnToggle,
  onGroupByChange,
  onRefresh,
  onSavedViewChange,
  refreshing = false,
  savedViewOptions,
  selectedSavedViewId,
  visibleColumns,
}: TicketListToolbarProps) {
  return (
    <div
      aria-label="Ticket list controls"
      className="flex shrink-0 items-center justify-between gap-3 py-2"
      role="toolbar"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Button
          className="!h-6 !gap-1.5 !rounded-md !px-2 !text-xs !text-slate-400"
          disabled
          icon={<ListChecks aria-hidden="true" className="size-3.5" />}
          type="button"
        >
          Bulk actions
        </Button>
        <Button
          aria-label="Refresh list"
          aria-busy={refreshing || undefined}
          className="!h-6 !gap-1.5 !rounded-md !px-2 !text-xs !text-slate-700"
          icon={
            <RefreshCw
              aria-hidden="true"
              className={cn("size-3.5", refreshing && "animate-spin")}
            />
          }
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </Button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <SearchableDropdown
          ariaLabel="Saved view"
          onValueChange={onSavedViewChange}
          options={savedViewOptions}
          searchPlaceholder="Find view"
          triggerClassName="!h-6 !gap-1.5 !rounded-md !px-2 !text-xs !text-slate-700"
          value={selectedSavedViewId}
        />
        <DropdownSelect
          ariaLabel="Group tickets by"
          onValueChange={(value) =>
            onGroupByChange(value as WorkspaceTicketGroupKey)
          }
          options={groupOptions.map((option) => ({
            ...option,
            icon:
              option.value === "priority" ? (
                <SignalHigh aria-hidden="true" className={dropdownIconClass} />
              ) : option.value === "state" ? (
                <CircleDot aria-hidden="true" className={dropdownIconClass} />
              ) : option.value === "owner" ? (
                <User aria-hidden="true" className={dropdownIconClass} />
              ) : option.value === "customer" ? (
                <BriefcaseBusiness
                  aria-hidden="true"
                  className={dropdownIconClass}
                />
              ) : (
                <Rows3 aria-hidden="true" className={dropdownIconClass} />
              ),
          }))}
          triggerClassName="!h-6 !gap-1.5 !rounded-md !px-2 !text-xs !text-slate-700"
          value={groupBy}
        />
        <TicketColumnVisibilityAction
          columns={columns}
          disabled={false}
          onColumnToggle={onColumnToggle}
          showLabel
          triggerClassName="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          visibleColumns={visibleColumns}
        />
      </div>
    </div>
  );
}
