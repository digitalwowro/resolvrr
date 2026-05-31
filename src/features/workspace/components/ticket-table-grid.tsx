import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { SortDirection } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceTicketColumnKey } from "@/features/tickets/workspace-adapter";

const columnTemplates: Record<WorkspaceTicketColumnKey, string> = {
  customer: "fit-content(14rem)",
  owner: "max-content",
  state: "max-content",
  priority: "max-content",
  pendingTill: "max-content",
  updatedAt: "max-content",
};

export function ticketGridTemplate(
  columns: Set<WorkspaceTicketColumnKey>,
): CSSProperties {
  const tracks = ["max-content", "max-content", "minmax(0, 1fr)"];

  for (const column of columns) {
    tracks.push(columnTemplates[column]);
  }

  return { gridTemplateColumns: tracks.join(" ") };
}

export function ticketGridTableClass({ roundedTop = true } = {}) {
  return cn(
    "min-h-0 flex-1 overflow-auto rounded-b-none border border-b-0 border-slate-200 bg-white",
    roundedTop && "rounded-t-md",
  );
}

const headerCellClass =
  "sticky top-0 z-10 flex h-10 items-center border-b border-slate-200 bg-white px-3 text-left text-xs font-semibold";
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
