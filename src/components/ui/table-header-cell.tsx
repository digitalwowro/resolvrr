"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { cn } from "./classnames";

export type SortDirection = "ascending" | "descending";

type TableHeaderCellProps = {
  label: string;
  sortDirection?: SortDirection;
  onSort?(): void;
  onResizeStart?(event: PointerEvent<HTMLButtonElement>): void;
  onResizeStep?(delta: number): void;
  children?: ReactNode;
  className?: string;
};

export function TableHeaderCell({
  label,
  sortDirection,
  onSort,
  onResizeStart,
  onResizeStep,
  children,
  className,
}: TableHeaderCellProps) {
  const sortable = Boolean(onSort);
  const resizable = Boolean(onResizeStart || onResizeStep);

  function handleResizeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!onResizeStep) {
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const size = event.shiftKey ? 24 : 8;
      onResizeStep(event.key === "ArrowRight" ? size : -size);
    }
  }

  const SortIcon =
    sortDirection === "ascending"
      ? ArrowUp
      : sortDirection === "descending"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <th
      aria-sort={sortDirection ?? "none"}
      className={cn(
        "h-9 border-b border-slate-200 bg-slate-50 px-2 text-left font-medium text-slate-700",
        className,
      )}
      scope="col"
    >
      <div className="flex h-full items-center gap-1">
        <button
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 text-left",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
            sortable ? "hover:bg-slate-100" : "cursor-default",
          )}
          disabled={!sortable}
          onClick={onSort}
          type="button"
        >
          <span className="min-w-0 truncate">{children ?? label}</span>
          {sortable ? <SortIcon aria-hidden="true" className="size-3.5" /> : null}
        </button>
        {resizable ? (
          <button
            aria-label={`Resize ${label} column`}
            className="grid h-7 w-3 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onKeyDown={handleResizeKeyDown}
            onPointerDown={onResizeStart}
            type="button"
          >
            <GripVertical aria-hidden="true" className="size-3" />
          </button>
        ) : null}
      </div>
    </th>
  );
}
