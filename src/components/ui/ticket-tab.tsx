"use client";

import { X } from "lucide-react";
import { cn } from "./classnames";
import { Spinner } from "./spinner";

type TicketTabProps = {
  label: string;
  active?: boolean;
  unread?: boolean;
  dirty?: boolean;
  loading?: boolean;
  onSelect(): void;
  onClose?(): void;
};

export function TicketTab({
  label,
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
        "inline-flex h-8 max-w-48 items-center gap-1.5 border px-2 text-sm",
        active
          ? "border-slate-300 border-b-white bg-white text-slate-950"
          : "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
      )}
    >
      <button
        aria-selected={active}
        className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={onSelect}
        role="tab"
        type="button"
      >
        {loading ? <Spinner label={`${label} loading`} /> : null}
        {unread ? (
          <span
            aria-label="Unread"
            className="size-1.5 shrink-0 rounded-full bg-indigo-500"
          />
        ) : null}
        <span className="min-w-0 truncate font-medium">{label}</span>
        {dirty ? <span aria-label="Unsaved changes">*</span> : null}
      </button>
      {onClose ? (
        <button
          aria-label={`Close ${label}`}
          className="grid size-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
