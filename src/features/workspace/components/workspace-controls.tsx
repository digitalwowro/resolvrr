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
} from "@/features/tickets";

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
  orientationOptions: DropdownOption[];
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
  orientationOptions,
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
          onValueChange={() => undefined}
          options={savedViewOptionsWithIcon}
          searchPlaceholder="Find view"
          value={selectedSavedViewId}
        />
        <ToolbarDropdownSelect
          ariaLabel="Tab orientation"
          onValueChange={(value) =>
            onTabOrientationChange(value as "horizontal" | "vertical")
          }
          options={orientationOptions.map((option) => ({
            ...option,
            icon:
              option.value === "vertical" ? (
                <PanelLeft aria-hidden="true" className={dropdownIconClass} />
              ) : (
                <PanelTop aria-hidden="true" className={dropdownIconClass} />
              ),
          }))}
          value={tabOrientation}
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
      </div>
    </section>
  );
}
