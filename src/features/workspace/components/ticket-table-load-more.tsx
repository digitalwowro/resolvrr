"use client";

import { cn } from "@/components/ui/classnames";
import type { TicketTableGroup } from "./ticket-table-types";

export function groupCountLabel(group: TicketTableGroup) {
  const loaded = group.loadedCount ?? group.rows.length;
  return group.totalCount === undefined ? `${loaded}` : `${loaded}/${group.totalCount}`;
}

export function countLabel({
  loadedCount,
  rowCount,
  totalCount,
}: {
  loadedCount?: number;
  rowCount: number;
  totalCount?: number;
}) {
  const loaded = loadedCount ?? rowCount;
  return totalCount === undefined ? `${loaded}` : `${loaded}/${totalCount}`;
}

export function LoadMoreTongue({
  ariaLabel,
  count,
  loading,
  onClick,
  reserveBottomSpace,
}: {
  ariaLabel: string;
  count: string;
  loading: boolean;
  onClick: () => void;
  reserveBottomSpace: boolean;
}) {
  return (
    <div className="contents" role="row">
      <div
        className={cn(
          "relative z-20 col-span-full",
          reserveBottomSpace ? "h-8" : "h-0",
        )}
        role="cell"
      >
        <button
          aria-label={ariaLabel}
          className="absolute left-1/2 top-0 flex h-5 -translate-x-1/2 items-center gap-1 rounded-b-md bg-indigo-50 px-5 text-xs font-semibold leading-none text-indigo-700 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-70"
          disabled={loading}
          onClick={onClick}
          type="button"
        >
          <span>{loading ? "Loading" : "Show more"}</span>
          <span className="font-normal text-indigo-600">{count}</span>
        </button>
      </div>
    </div>
  );
}
