"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/classnames";
import type { PendingDateTimeParts } from "./ticket-pending-date-time";
import { TicketPendingDateTimeSelector } from "./ticket-pending-date-time-selector";
import { pendingDateLabel } from "./ticket-pending-date-time-selector-utils";

type TicketPendingStateFormProps = {
  dateChanged?: boolean;
  disabled?: boolean;
  stateLabel: string;
  timeChanged?: boolean;
  value: PendingDateTimeParts;
  onChange(value: PendingDateTimeParts): void;
};

export function TicketPendingStateForm({
  dateChanged = false,
  disabled = false,
  stateLabel,
  timeChanged = false,
  value,
  onChange,
}: TicketPendingStateFormProps) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const changed = dateChanged || timeChanged;
  const dateLabel = pendingDateLabel(value);

  return (
    <div>
      <div
        className={cn(
          "w-full rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-left text-sm text-slate-900",
          changed && "border-amber-500 bg-amber-50",
        )}
        ref={fieldRef}
      >
        <span className="text-slate-700">Until: </span>
        <button
          aria-expanded={open}
          aria-label={`Open pending date and time selector for ${stateLabel}: ${dateLabel}, ${value.time}`}
          className={cn(
            "text-indigo-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
            changed && "text-amber-900",
          )}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          type="button"
        >
          {dateLabel}, {value.time}
        </button>
      </div>
      {open ? (
        <TicketPendingDateTimeSelector
          anchorRef={fieldRef}
          stateLabel={stateLabel}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
