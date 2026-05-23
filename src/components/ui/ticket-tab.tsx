"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./classnames";
import { Tooltip } from "./tooltip";

type TicketTabProps = {
  label: string;
  title?: string;
  icon?: ReactNode;
  density?: "full" | "compact" | "icon";
  tooltip?: ReactNode;
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
  density = "full",
  tooltip,
  active = false,
  unread = false,
  dirty = false,
  loading = false,
  onSelect,
  onClose,
}: TicketTabProps) {
  const labelText =
    density === "full" && title ? (
      <>
        {label} <span className="font-semibold">{title}</span>
      </>
    ) : (
      <span className={density === "icon" ? "sr-only" : undefined}>
        {density === "full" && !title ? (
          <span className="font-semibold">{label}</span>
        ) : (
          label
        )}
      </span>
    );
  const showClose = onClose && (density !== "icon" || active);

  const tab = (
    <div
      className={cn(
        "group inline-flex h-9 min-w-0 items-center gap-1.5 rounded-t-md border border-b-0 border-slate-200",
        density === "full" && "flex-1 px-3",
        density === "compact" && "min-w-14 max-w-24 flex-1 px-2",
        density === "icon" &&
          "min-w-7 flex-1 justify-center px-1 hover:bg-white",
        active
          ? "bg-white"
          : "border-slate-200 bg-slate-50 hover:bg-white",
      )}
    >
      <button
        aria-selected={active}
        aria-label={density === "icon" ? label : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
          density === "icon" && active &&
            "size-5 flex-none justify-center group-hover:hidden group-focus-within:hidden",
          density === "icon" && !active && "h-5 flex-none justify-center",
        )}
        onKeyDown={(event) => {
          if (
            onClose &&
            density === "icon" &&
            (event.key === "Delete" || event.key === "Backspace")
          ) {
            event.preventDefault();
            onClose();
          }
        }}
        onClick={onSelect}
        role="tab"
        type="button"
      >
        {loading ? <span className="sr-only">{label} loading</span> : null}
        {icon}
        {unread ? <span className="sr-only">Unread</span> : null}
        {density === "icon" ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="min-w-0 truncate">{labelText}</span>
        )}
        {dirty ? <span className="sr-only">Unsaved changes</span> : null}
      </button>
      {showClose ? (
        <button
          aria-label={`Close ${label}`}
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700",
            density === "icon" && "hidden group-hover:grid group-focus-within:grid",
          )}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      ) : null}
    </div>
  );

  return tooltip ? (
    <Tooltip
      className={density === "icon" ? "min-w-7 flex-1" : undefined}
      content={tooltip}
      side={density === "icon" ? "bottom" : "top"}
    >
      {tab}
    </Tooltip>
  ) : (
    tab
  );
}
