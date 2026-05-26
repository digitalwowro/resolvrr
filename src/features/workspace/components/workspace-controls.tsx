"use client";

import {
  Check,
  BriefcaseBusiness,
  Columns3,
  CircleDot,
  PanelLeft,
  PanelTop,
  RefreshCw,
  Rows3,
  SignalHigh,
  User,
} from "lucide-react";
import {
  Checkbox,
  Tooltip,
  ToolbarButton,
  ToolbarDropdownSelect,
  ToolbarMenuDropdown,
  ToolbarSearchableDropdown,
  dropdownIconClass,
  type DropdownOption,
  type MenuDropdownItem,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
} from "@/features/tickets/workspace-adapter";

type WorkspaceControlsProps = {
  allSelected: boolean;
  className?: string;
  columns: WorkspaceTicketColumn[];
  groupBy: WorkspaceTicketGroupKey;
  groupOptions: DropdownOption[];
  listControlsEnabled: boolean;
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  onGroupByChange(groupBy: WorkspaceTicketGroupKey): void;
  onRefresh(): void;
  onSelectAll(): void;
  onTabOrientationChange(orientation: "horizontal" | "vertical"): void;
  partiallySelected: boolean;
  savedViewOptions: DropdownOption[];
  selectedSavedViewId: string;
  tabOrientation: "horizontal" | "vertical";
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export function WorkspaceControls({
  allSelected,
  className,
  columns,
  groupBy,
  groupOptions,
  listControlsEnabled,
  onColumnToggle,
  onGroupByChange,
  onRefresh,
  onSelectAll,
  onTabOrientationChange,
  partiallySelected,
  savedViewOptions,
  selectedSavedViewId,
  tabOrientation,
  visibleColumns,
}: WorkspaceControlsProps) {
  const columnItems: MenuDropdownItem[] = columns.map((column) => ({
    id: `column-${column.key}`,
    label: column.label,
    icon: visibleColumns.has(column.key) ? (
      <Check aria-hidden="true" className={dropdownIconClass} />
    ) : undefined,
    onSelect: () => onColumnToggle(column.key),
  }));
  const selectedSavedViewOption = savedViewOptions.find(
    (option) => option.value === selectedSavedViewId,
  );
  const savedViewOptionsWithIcon = selectedSavedViewOption
    ? [
        {
          ...selectedSavedViewOption,
          icon: <BriefcaseBusiness aria-hidden="true" className={dropdownIconClass} />,
        },
      ]
    : savedViewOptions;

  return (
    <section
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-2 bg-slate-50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 pl-2">
        <Checkbox
          checked={allSelected}
          className="items-center"
          disabled={!listControlsEnabled}
          hideLabel
          indeterminate={partiallySelected}
          label="Select all tickets"
          name="workspace-select-all"
          onChange={onSelectAll}
        />
        <ToolbarButton
          disabled={!listControlsEnabled}
          icon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          onClick={onRefresh}
          type="button"
          variant="secondary"
        >
          Refresh list
        </ToolbarButton>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarSearchableDropdown
          ariaLabel="Saved view"
          disabled={!listControlsEnabled}
          onValueChange={() => undefined}
          options={savedViewOptionsWithIcon}
          searchPlaceholder="Find view"
          value={selectedSavedViewId}
        />
        <ToolbarDropdownSelect
          ariaLabel="Group tickets by"
          disabled={!listControlsEnabled}
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
                <BriefcaseBusiness aria-hidden="true" className={dropdownIconClass} />
              ) : (
                <Rows3 aria-hidden="true" className={dropdownIconClass} />
              ),
          }))}
          value={groupBy}
        />
        <ToolbarMenuDropdown
          disabled={!listControlsEnabled}
          items={columnItems}
          triggerContent={
            <span className="flex items-center gap-1">
              <Columns3 aria-hidden="true" className={dropdownIconClass} />
              Columns
            </span>
          }
          triggerLabel="Column visibility"
        />
        <TabLayoutSwitch
          onChange={onTabOrientationChange}
          value={tabOrientation}
        />
      </div>
    </section>
  );
}

function TabLayoutSwitch({
  onChange,
  value,
}: {
  onChange(orientation: "horizontal" | "vertical"): void;
  value: "horizontal" | "vertical";
}) {
  return (
    <div
      aria-label="Tab layout"
      className="inline-flex h-6 items-center rounded-md border border-slate-200 bg-white p-0.5"
      role="group"
    >
      <Tooltip content="Horizontal tabs" side="bottom">
        <button
          aria-label="Horizontal tabs"
          aria-pressed={value === "horizontal"}
          className={cn(
            "grid size-5 place-items-center rounded-sm text-slate-600 hover:bg-slate-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600",
            value === "horizontal" && "bg-indigo-50 text-indigo-700",
          )}
          onClick={() => onChange("horizontal")}
          type="button"
        >
          <PanelTop aria-hidden="true" className="size-3.5" />
        </button>
      </Tooltip>
      <Tooltip content="Vertical tabs" side="bottom">
        <button
          aria-label="Vertical tabs"
          aria-pressed={value === "vertical"}
          className={cn(
            "grid size-5 place-items-center rounded-sm text-slate-600 hover:bg-slate-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600",
            value === "vertical" && "bg-indigo-50 text-indigo-700",
          )}
          onClick={() => onChange("vertical")}
          type="button"
        >
          <PanelLeft aria-hidden="true" className="size-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}
