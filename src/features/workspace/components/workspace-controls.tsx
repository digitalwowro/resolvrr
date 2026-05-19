"use client";

import { Check, Columns3, MoreHorizontal, RefreshCw } from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownSelect,
  MenuDropdown,
  SearchableDropdown,
  type DropdownOption,
  type MenuDropdownItem,
} from "@/components/ui";
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
  selectedCount: number;
  rowCount: number;
  onRefresh(): void;
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
  selectedCount,
  rowCount,
  onRefresh,
}: WorkspaceControlsProps) {
  const columnItems: MenuDropdownItem[] = columns.map((column) => ({
    id: `column-${column.key}`,
    label: column.label,
    icon: visibleColumns.has(column.key) ? (
      <Check aria-hidden="true" className="size-4" />
    ) : undefined,
    onSelect: () => onColumnToggle(column.key),
  }));

  return (
    <section className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          checked={allSelected}
          className="items-center text-xs"
          indeterminate={partiallySelected}
          label="Select all"
          name="workspace-select-all"
          onChange={onSelectAll}
        />
        <span className="text-xs text-slate-500">
          {selectedCount} / {rowCount}
        </span>
        <Button
          className="h-8 px-2 text-xs"
          icon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          onClick={onRefresh}
          type="button"
          variant="secondary"
        >
          Refresh
        </Button>
        <MenuDropdown
          items={[
            { id: "assign", label: "Assign owner", onSelect: () => undefined },
            { id: "pending", label: "Set pending", onSelect: () => undefined },
            { id: "close", label: "Close", onSelect: () => undefined },
          ]}
          triggerClassName="h-8 px-2 text-xs"
          triggerContent={
            <span className="flex items-center gap-1.5">
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
              Bulk
            </span>
          }
          triggerLabel="Bulk actions"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchableDropdown
          ariaLabel="Saved view"
          onValueChange={onSavedViewChange}
          options={savedViewOptions}
          searchPlaceholder="Find view"
          triggerClassName="h-8 px-2 text-xs"
          value={selectedSavedViewId}
        />
        <DropdownSelect
          ariaLabel="Tab orientation"
          onValueChange={(value) =>
            onTabOrientationChange(value as StaticTabOrientation)
          }
          options={orientationOptions}
          triggerClassName="h-8 px-2 text-xs"
          value={tabOrientation}
        />
        <MenuDropdown
          items={columnItems}
          triggerClassName="h-8 px-2 text-xs"
          triggerContent={
            <span className="flex items-center gap-1.5">
              <Columns3 aria-hidden="true" className="size-3.5" />
              Columns
            </span>
          }
          triggerLabel="Column visibility"
        />
      </div>
    </section>
  );
}
