"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/components/ui/classnames";
import type { SortDirection } from "@/components/ui";
import type { StaticColumnKey } from "../static-types";

export function ticketGridTableClass({ roundedTop }: { roundedTop: boolean }) {
  return cn(
    "min-h-0 flex-1 overflow-auto rounded-b-none border border-b-0 border-slate-200 bg-white",
    roundedTop && "rounded-t-md",
  );
}

const headerCellClass =
  "sticky top-0 z-10 flex h-10 items-center border-b border-slate-200 bg-white px-3 text-left text-xs font-semibold";
const bodyCellClass = "flex h-11 items-center border-b border-slate-100 px-3";

export function ticketGridTemplate(
  visibleColumns: Set<StaticColumnKey>,
): CSSProperties {
  const tracks = ["max-content", "max-content", "minmax(0, 1fr)"];

  if (visibleColumns.has("customer")) {
    tracks.push("fit-content(14rem)");
  }

  if (visibleColumns.has("owner")) {
    tracks.push("max-content");
  }

  if (visibleColumns.has("state")) {
    tracks.push("max-content");
  }

  if (visibleColumns.has("priority")) {
    tracks.push("max-content");
  }

  if (visibleColumns.has("pendingTill")) {
    tracks.push("max-content");
  }

  if (visibleColumns.has("updatedAt")) {
    tracks.push("max-content");
  }

  return { gridTemplateColumns: tracks.join(" ") };
}

export function TicketGridHeaderCell({
  label,
  sortDirection,
  onSort,
  children,
}: {
  label: string;
  sortDirection?: SortDirection;
  onSort?: () => void;
  children?: ReactNode;
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

export function TicketGridStaticHeaderCell() {
  return <div className={headerCellClass} role="columnheader" />;
}

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
    <div className={cn(bodyCellClass, className)} onClick={onClick} role="cell">
      {children}
    </div>
  );
}
