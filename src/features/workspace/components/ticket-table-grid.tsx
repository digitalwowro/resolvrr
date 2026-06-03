import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import type { SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceTicketColumnKey } from "@/features/tickets/workspace-adapter";

export const ticketGridColumnOrder: readonly WorkspaceTicketColumnKey[] = [
  "customer",
  "owner",
  "state",
  "priority",
  "pendingTill",
  "updatedAt",
] as const;

const ticketGridTemplateClasses: Record<string, string> = {
  "": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)]",
  "customer": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem]",
  "owner": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem]",
  "customer|owner": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem]",
  "state": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem]",
  "customer|state": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem]",
  "owner|state": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem]",
  "customer|owner|state": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem]",
  "priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_7rem]",
  "customer|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_7rem]",
  "owner|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_7rem]",
  "customer|owner|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_7rem]",
  "state|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_7rem]",
  "customer|state|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_7rem]",
  "owner|state|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_7rem]",
  "customer|owner|state|priority": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_7rem]",
  "pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem]",
  "customer|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8.5rem]",
  "owner|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_8.5rem]",
  "customer|owner|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_8.5rem]",
  "state|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_8.5rem]",
  "customer|state|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_8.5rem]",
  "owner|state|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_8.5rem]",
  "customer|owner|state|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_8.5rem]",
  "priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_7rem_8.5rem]",
  "customer|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_7rem_8.5rem]",
  "owner|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_7rem_8.5rem]",
  "customer|owner|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_7rem_8.5rem]",
  "state|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_7rem_8.5rem]",
  "customer|state|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_7rem_8.5rem]",
  "owner|state|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_7rem_8.5rem]",
  "customer|owner|state|priority|pendingTill": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_7rem_8.5rem]",
  "updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem]",
  "customer|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8.5rem]",
  "owner|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_8.5rem]",
  "customer|owner|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_8.5rem]",
  "state|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_8.5rem]",
  "customer|state|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_8.5rem]",
  "owner|state|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_8.5rem]",
  "customer|owner|state|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_8.5rem]",
  "priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_7rem_8.5rem]",
  "customer|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_7rem_8.5rem]",
  "owner|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_7rem_8.5rem]",
  "customer|owner|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_7rem_8.5rem]",
  "state|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_7rem_8.5rem]",
  "customer|state|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_7rem_8.5rem]",
  "owner|state|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_7rem_8.5rem]",
  "customer|owner|state|priority|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_7rem_8.5rem]",
  "pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8.5rem]",
  "customer|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8.5rem_8.5rem]",
  "owner|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_8.5rem_8.5rem]",
  "customer|owner|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_8.5rem_8.5rem]",
  "state|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_8.5rem_8.5rem]",
  "customer|state|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_8.5rem_8.5rem]",
  "owner|state|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_8.5rem_8.5rem]",
  "customer|owner|state|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_8.5rem_8.5rem]",
  "priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_7rem_8.5rem_8.5rem]",
  "customer|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_7rem_8.5rem_8.5rem]",
  "owner|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_7rem_8.5rem_8.5rem]",
  "customer|owner|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_7rem_8.5rem_8.5rem]",
  "state|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_10.5rem_7rem_8.5rem_8.5rem]",
  "customer|state|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_10.5rem_7rem_8.5rem_8.5rem]",
  "owner|state|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8rem_10.5rem_7rem_8.5rem_8.5rem]",
  "customer|owner|state|priority|pendingTill|updatedAt": "grid-cols-[2.75rem_4.75rem_minmax(20rem,1fr)_8.5rem_8rem_10.5rem_7rem_8.5rem_8.5rem]",
};

export function ticketGridTemplateClass(columns: WorkspaceTicketColumnKey[]) {
  const visibleColumns = new Set(columns);
  const templateKey = ticketGridColumnOrder
    .filter((column) => visibleColumns.has(column))
    .join("|");

  return ticketGridTemplateClasses[templateKey] ?? ticketGridTemplateClasses[""];
}

export function ticketGridTableClass({ roundedTop = true } = {}) {
  return cn(
    "min-h-0 flex-1 overflow-hidden rounded-b-none bg-white",
    roundedTop && "rounded-t-md",
  );
}

export const ticketGridHeaderWrapperClass =
  "shrink-0 overflow-y-hidden border-x border-b border-indigo-200 bg-indigo-50 [scrollbar-gutter:stable]";
export const ticketGridBodyScrollerClass =
  "min-h-0 flex-1 overflow-auto border-x border-slate-200 [scrollbar-gutter:stable]";

const headerCellClass =
  "flex h-10 items-center bg-indigo-50 px-3 text-left text-xs font-semibold";
const bodyCellClass = "flex h-11 items-center border-b border-slate-100 px-3";

export function TicketGridCell({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={cn(
        bodyCellClass,
        className,
      )}
      onClick={onClick}
      role="cell"
    >
      {children}
    </div>
  );
}

export function TicketGridHeaderCell({
  label,
  sortDirection,
  onSort,
  children,
}: {
  children?: ReactNode;
  label: string;
  onSort?: () => void;
  sortDirection?: SortDirection;
}) {
  const sortable = Boolean(onSort);
  const SortIcon =
    sortDirection === "ascending"
      ? ArrowUp
      : sortDirection === "descending"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <div
      aria-sort={sortDirection ?? "none"}
      className={headerCellClass}
      role="columnheader"
    >
      <button
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
          sortable ? null : "cursor-default",
        )}
        disabled={!sortable}
        onClick={onSort}
        type="button"
      >
        <GripVertical aria-hidden="true" className="size-3 shrink-0" />
        <span className="min-w-0 truncate">{children ?? label}</span>
        {sortable ? (
          <SortIcon aria-hidden="true" className="size-3 shrink-0" />
        ) : null}
      </button>
    </div>
  );
}

export function TicketGridStaticHeaderCell({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <div className={headerCellClass} role="columnheader">
      {children}
    </div>
  );
}
