"use client";

import { Check, Columns3, MoreHorizontal, RefreshCw } from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownSelect,
  MenuDropdown,
  type DropdownOption,
  type MenuDropdownItem,
} from "@/components/ui";
import type {
  StaticColumn,
  StaticColumnKey,
  StaticTabOrientation,
  StaticWorkspaceVariant,
} from "../static-types";

type WorkspaceControlsProps = {
  savedViewOptions: DropdownOption[];
  selectedSavedViewId: string;
  onSavedViewChange(viewId: string): void;
  orientationOptions: DropdownOption[];
  tabOrientation: StaticTabOrientation;
  onTabOrientationChange(orientation: StaticTabOrientation): void;
  stateOptions: DropdownOption[];
  previewState: StaticWorkspaceVariant;
  onPreviewStateChange(state: StaticWorkspaceVariant): void;
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
  stateOptions,
  previewState,
  onPreviewStateChange,
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
    <section className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          checked={allSelected}
          className="items-center"
          indeterminate={partiallySelected}
          label="Select all tickets"
          name="workspace-select-all"
          onChange={onSelectAll}
        />
        <span className="text-sm text-slate-500">
          {selectedCount} of {rowCount} selected
        </span>
        <Button
          icon={<RefreshCw aria-hidden="true" className="size-4" />}
          onClick={onRefresh}
          type="button"
          variant="secondary"
        >
          Refresh
        </Button>
        <MenuDropdown
          items={[
            { id: "assign", label: "Assign", onSelect: () => undefined },
            { id: "mark-read", label: "Mark read", onSelect: () => undefined },
            { id: "tag", label: "Add tag", onSelect: () => undefined },
          ]}
          triggerContent={
            <span className="flex items-center gap-2">
              <MoreHorizontal aria-hidden="true" className="size-4" />
              Bulk actions
            </span>
          }
          triggerLabel="Bulk actions"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownSelect
          ariaLabel="Saved view"
          onValueChange={onSavedViewChange}
          options={savedViewOptions}
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
            <span className="flex items-center gap-2">
              <Columns3 aria-hidden="true" className="size-4" />
              Columns
            </span>
          }
          triggerLabel="Column visibility"
        />
        <DropdownSelect
          ariaLabel="State preview"
          onValueChange={(value) =>
            onPreviewStateChange(value as StaticWorkspaceVariant)
          }
          options={stateOptions}
          value={previewState}
        />
      </div>
    </section>
  );
}
