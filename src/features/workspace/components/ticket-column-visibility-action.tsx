"use client";

import { Check, Columns3 } from "lucide-react";
import {
  MenuDropdown,
  Tooltip,
  dropdownIconClass,
  type MenuDropdownItem,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
} from "@/features/tickets/workspace-adapter";

type TicketColumnVisibilityActionProps = {
  columns: WorkspaceTicketColumn[];
  disabled: boolean;
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  triggerClassName: string;
  tooltipSide?: "bottom" | "top";
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export function TicketColumnVisibilityAction({
  columns,
  disabled,
  onColumnToggle,
  triggerClassName,
  tooltipSide = "bottom",
  visibleColumns,
}: TicketColumnVisibilityActionProps) {
  const columnItems: MenuDropdownItem[] = columns.map((column) => ({
    id: `column-${column.key}`,
    label: column.label,
    icon: visibleColumns.has(column.key) ? (
      <Check aria-hidden="true" className={dropdownIconClass} />
    ) : undefined,
    onSelect: () => onColumnToggle(column.key),
  }));

  return (
    <Tooltip content="Column visibility" side={tooltipSide}>
      <MenuDropdown
        disabled={disabled}
        items={columnItems}
        menuClassName="!text-sm"
        showChevron={false}
        triggerClassName={cn(
          triggerClassName,
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        triggerContent={<Columns3 aria-hidden="true" className="size-3.5" />}
        triggerLabel="Column visibility"
        unstyledTrigger
      />
    </Tooltip>
  );
}
