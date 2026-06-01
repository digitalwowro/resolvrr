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
  Checkbox,
  DropdownSelect,
  SearchableDropdown,
  Tooltip,
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
  allSelected: boolean;
  columns: WorkspaceTicketColumn[];
  groupBy: WorkspaceTicketGroupKey;
  groupOptions: DropdownOption[];
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  onGroupByChange(groupBy: WorkspaceTicketGroupKey): void;
  onRefresh(): void;
  onSavedViewChange(savedViewId: string): void;
  onSelectAll(): void;
  partiallySelected: boolean;
  roundedTop?: boolean;
  savedViewOptions: DropdownOption[];
  selectedSavedViewId: string;
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export function TicketListToolbar({
  allSelected,
  columns,
  groupBy,
  groupOptions,
  onColumnToggle,
  onGroupByChange,
  onRefresh,
  onSavedViewChange,
  onSelectAll,
  partiallySelected,
  roundedTop = false,
  savedViewOptions,
  selectedSavedViewId,
  visibleColumns,
}: TicketListToolbarProps) {
  const savedViewOptionsWithIcon = savedViewOptions.map((option) => ({
    ...option,
    icon:
      option.value === selectedSavedViewId ? (
        <BriefcaseBusiness aria-hidden="true" className={dropdownIconClass} />
      ) : (
        option.icon
      ),
  }));

  return (
    <div
      aria-label="Ticket list controls"
      className={cn(
        "flex min-h-11 shrink-0 items-center justify-between gap-3 border-x border-t border-slate-200 bg-white px-3 py-2",
        roundedTop && "rounded-t-md",
      )}
      role="toolbar"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Tooltip content="Select all tickets" side="bottom">
          <Checkbox
            checked={allSelected}
            className="h-6 !items-center"
            checkboxClassName="!size-6"
            checkIconClassName="!size-3.5"
            hideLabel
            indeterminate={partiallySelected}
            label="Select all tickets"
            name="workspace-select-all"
            onChange={onSelectAll}
          />
        </Tooltip>
        <Button
          aria-label="Refresh list"
          className="translate-y-px !h-6 !gap-1.5 !rounded !px-2 !text-xs !text-slate-500"
          icon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </Button>
        <Button
          className="translate-y-px !h-6 !gap-1.5 !rounded !px-2 !text-xs !text-slate-500"
          disabled
          icon={<ListChecks aria-hidden="true" className="size-3.5" />}
          type="button"
        >
          Bulk actions
        </Button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <SearchableDropdown
          ariaLabel="Saved view"
          onValueChange={onSavedViewChange}
          options={savedViewOptionsWithIcon}
          searchPlaceholder="Find view"
          triggerClassName="translate-y-px !h-6 !gap-1.5 !rounded !px-2 !text-xs !text-slate-500"
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
          triggerClassName="translate-y-px !h-6 !gap-1.5 !rounded !px-2 !text-xs !text-slate-500"
          value={groupBy}
        />
        <TicketColumnVisibilityAction
          columns={columns}
          disabled={false}
          onColumnToggle={onColumnToggle}
          showLabel
          triggerClassName="inline-flex h-6 shrink-0 translate-y-px items-center gap-1.5 rounded border border-slate-200 bg-white px-2 text-xs font-normal text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          visibleColumns={visibleColumns}
        />
      </div>
    </div>
  );
}
