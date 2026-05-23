"use client";

import {
  Check,
  BriefcaseBusiness,
  Columns3,
  CircleDot,
  ListChecks,
  PanelLeft,
  PanelTop,
  RefreshCw,
  SignalHigh,
  Trash2,
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
  StaticColumn,
  StaticColumnKey,
  StaticTabOrientation,
} from "../static-types";

type WorkspaceControlsProps = {
  savedViewOptions: DropdownOption[];
  selectedSavedViewId: string;
  onSavedViewChange(viewId: string): void;
  orientationOptions: DropdownOption[];
  tabOrientation: StaticTabOrientation;
  onTabOrientationChange(orientation: StaticTabOrientation): void;
  columns: StaticColumn[];
  visibleColumns: Set<StaticColumnKey>;
  onColumnToggle(column: StaticColumnKey): void;
  allSelected: boolean;
  partiallySelected: boolean;
  onSelectAll(): void;
  onRefresh(): void;
  className?: string;
};

export function WorkspaceControls({
  savedViewOptions,
  selectedSavedViewId,
  onSavedViewChange,
  orientationOptions,
  tabOrientation,
  onTabOrientationChange,
  columns,
  visibleColumns,
  onColumnToggle,
  allSelected,
  partiallySelected,
  onSelectAll,
  onRefresh,
  className,
}: WorkspaceControlsProps) {
  const columnItems: MenuDropdownItem[] = columns.map((column) => ({
    id: `column-${column.key}`,
    label: column.label,
    icon: visibleColumns.has(column.key) ? (
      <Check aria-hidden="true" className={dropdownIconClass} />
    ) : undefined,
    onSelect: () => onColumnToggle(column.key),
  }));
  const savedViewOption = savedViewOptions.find((option) => option.value === "my-work");
  const savedViewOptionsWithIcon = savedViewOption
    ? [
        {
          ...savedViewOption,
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
          icon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          onClick={onRefresh}
          type="button"
          variant="secondary"
        >
          Refresh list
        </ToolbarButton>
        <ToolbarMenuDropdown
          items={[
            {
              id: "owner",
              label: "Owner",
              icon: <User aria-hidden="true" className={dropdownIconClass} />,
              onSelect: () => undefined,
            },
            {
              id: "state",
              label: "State",
              icon: <CircleDot aria-hidden="true" className={dropdownIconClass} />,
              onSelect: () => undefined,
            },
            {
              id: "priority",
              label: "Priority",
              icon: <SignalHigh aria-hidden="true" className={dropdownIconClass} />,
              onSelect: () => undefined,
            },
            {
              id: "delete",
              label: "Delete",
              destructive: true,
              icon: <Trash2 aria-hidden="true" className={dropdownIconClass} />,
              onSelect: () => undefined,
            },
          ]}
          triggerContent={
            <span className="flex items-center gap-1">
              <ListChecks aria-hidden="true" className={dropdownIconClass} />
              Bulk actions
            </span>
          }
          triggerLabel="Bulk actions"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarSearchableDropdown
          ariaLabel="Saved view"
          onValueChange={onSavedViewChange}
          options={savedViewOptionsWithIcon}
          searchPlaceholder="Find view"
          value={selectedSavedViewId}
        />
        <ToolbarDropdownSelect
          ariaLabel="Tab orientation"
          onValueChange={(value) =>
            onTabOrientationChange(value as StaticTabOrientation)
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
        <ToolbarMenuDropdown
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
