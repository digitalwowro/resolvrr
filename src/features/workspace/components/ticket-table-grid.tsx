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
  "": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)]",
  "customer": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))]",
  "owner": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))]",
  "customer|owner": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))]",
  "state": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))]",
  "customer|state": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))]",
  "owner|state": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))]",
  "customer|owner|state": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))]",
  "priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*30))]",
  "customer|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))]",
  "owner|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))]",
  "customer|owner|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))]",
  "state|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))]",
  "customer|state|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))]",
  "owner|state|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))]",
  "customer|owner|state|priority": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))]",
  "pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*28))]",
  "customer|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))]",
  "owner|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))]",
  "state|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "customer|state|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "owner|state|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|state|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "owner|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "state|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|state|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "owner|state|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|state|priority|pendingTill": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*28))]",
  "customer|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))]",
  "owner|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))]",
  "state|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "customer|state|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "owner|state|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|state|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))]",
  "priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "owner|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "state|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|state|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "owner|state|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|state|priority|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))]",
  "pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "owner|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "state|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|state|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "owner|state|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|state|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "owner|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "state|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|state|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "owner|state|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
  "customer|owner|state|priority|pendingTill|updatedAt": "grid-cols-[calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*34))_minmax(0,calc(var(--spacing)*36))_minmax(0,calc(var(--spacing)*30))_minmax(0,calc(var(--spacing)*28))_minmax(0,calc(var(--spacing)*28))]",
};

export function ticketGridTemplateClass(columns: WorkspaceTicketColumnKey[]) {
  const visibleColumns = new Set(columns);
  const templateKey = ticketGridColumnOrder
    .filter((column) => visibleColumns.has(column))
    .join("|");

  return ticketGridTemplateClasses[templateKey] ?? ticketGridTemplateClasses[""];
}

export const ticketGridTableClass =
  "min-h-0 flex-1 overflow-hidden rounded-md border-b border-slate-200 bg-white";

export const ticketGridHeaderWrapperClass =
  "shrink-0 overflow-y-hidden rounded-t-md border-x border-b border-t border-slate-200 bg-slate-50 [scrollbar-gutter:stable]";
export const ticketGridBodyScrollerClass =
  "min-h-0 flex-1 overflow-auto border-x border-slate-200 [scrollbar-gutter:stable]";

const headerCellClass =
  "flex h-10 items-center bg-slate-50 px-3 text-left text-xs font-semibold";
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
