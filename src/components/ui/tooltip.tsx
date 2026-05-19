"use client";

import { useId, useRef, useState, type ReactNode } from "react";

type TooltipProps = {
  content: string;
  children: ReactNode;
  delayMs?: number;
};

export function Tooltip({ content, children, delayMs = 250 }: TooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleOpen() {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), delayMs);
  }

  function close() {
    clearTimer();
    setOpen(false);
  }

  return (
    <span
      aria-describedby={open ? tooltipId : undefined}
      className="relative inline-flex"
      onBlur={close}
      onFocus={scheduleOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          close();
        }
      }}
      onPointerEnter={scheduleOpen}
      onPointerLeave={close}
    >
      {children}
      {open ? (
        <span
          className="absolute bottom-full left-1/2 z-50 mb-2 max-w-xs -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 font-medium text-white"
          id={tooltipId}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
