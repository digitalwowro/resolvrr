"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./classnames";

type TicketTabProps = {
  label: string;
  title?: string;
  icon?: ReactNode;
  active?: boolean;
  unread?: boolean;
  dirty?: boolean;
  loading?: boolean;
  onSelect(): void;
  onClose?(): void;
};

export function TicketTab({
  label,
  title,
  icon,
  active = false,
  unread = false,
  dirty = false,
  loading = false,
  onSelect,
  onClose,
}: TicketTabProps) {
  return (
    <div
      className={cn(
        "inline-flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-t-md border border-b-0 border-slate-200 px-3",
        active
          ? "bg-white"
          : "border-slate-200 bg-slate-50 hover:bg-white",
      )}
    >
      <button
        aria-selected={active}
        className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={onSelect}
        role="tab"
        type="button"
      >
        {loading ? <span className="sr-only">{label} loading</span> : null}
        {icon}
        {unread ? <span className="sr-only">Unread</span> : null}
        <span className="min-w-0 truncate">
          {title ? (
            <>
              {label} <span className="font-semibold">{title}</span>
            </>
          ) : (
            <span className="font-semibold">{label}</span>
          )}
        </span>
        {dirty ? <span className="sr-only">Unsaved changes</span> : null}
      </button>
      {onClose ? (
        <button
          aria-label={`Close ${label}`}
          className="grid size-5 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
