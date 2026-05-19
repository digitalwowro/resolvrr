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
    <section className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          checked={allSelected}
          className="items-center [&>span:last-child]:sr-only"
          indeterminate={partiallySelected}
          label="Select all tickets"
          name="workspace-select-all"
          onChange={onSelectAll}
        />
        <Button
          icon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          onClick={onRefresh}
          type="button"
          variant="secondary"
        >
          Refresh list
        </Button>
        <MenuDropdown
          items={[
            { id: "assign", label: "Assign owner", onSelect: () => undefined },
            { id: "pending", label: "Set pending", onSelect: () => undefined },
            { id: "close", label: "Close", onSelect: () => undefined },
          ]}
          triggerContent={
            <span className="flex items-center gap-1.5">
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
              Bulk actions
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
          value={selectedSavedViewId}
        />
        <DropdownSelect
          ariaLabel="Tab orientation"
          onValueChange={(value) =>
            onTabOrientationChange(value as StaticTabOrientation)
          }
          options={orientationOptions}
          value={tabOrientation}
        />
        <MenuDropdown
          items={columnItems}
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
