"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./classnames";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  delayMs?: number;
  side?: "top" | "bottom";
  className?: string;
};

type TooltipAlign = "start" | "center" | "end";

export function Tooltip({
  content,
  children,
  delayMs = 250,
  side = "top",
  className,
}: TooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<TooltipAlign>(
    side === "bottom" ? "start" : "center",
  );
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportRight = window.innerWidth - 8;
    const viewportLeft = 8;

    if (side === "bottom") {
      const startWouldOverflow = triggerRect.left + tooltipRect.width > viewportRight;
      const endWouldFit = triggerRect.right - tooltipRect.width >= viewportLeft;

      setAlign(startWouldOverflow && endWouldFit ? "end" : "start");
      return;
    }

    const centeredLeft =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const centeredRight = centeredLeft + tooltipRect.width;

    if (centeredRight > viewportRight) {
      setAlign(triggerRect.right - tooltipRect.width >= viewportLeft ? "end" : "center");
      return;
    }

    if (centeredLeft < viewportLeft) {
      setAlign("start");
      return;
    }

    setAlign("center");
  }, [open, side]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleOpen() {
    clearTimer();
    setAlign(side === "bottom" ? "start" : "center");
    timerRef.current = setTimeout(() => setOpen(true), delayMs);
  }

  function close() {
    clearTimer();
    setOpen(false);
  }

  return (
    <span
      aria-describedby={open ? tooltipId : undefined}
      className={cn("relative inline-flex", className)}
      onBlur={close}
      onFocus={scheduleOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          close();
        }
      }}
      onPointerEnter={scheduleOpen}
      onPointerLeave={close}
      ref={triggerRef}
    >
      {children}
      {open ? (
        <span
          className={cn(
            "absolute z-50 w-max rounded-md bg-slate-950 px-2 py-1 text-white",
            side === "top" && align === "center" &&
              "bottom-full left-1/2 mb-2 -translate-x-1/2",
            side === "top" && align === "start" && "bottom-full left-0 mb-2",
            side === "top" && align === "end" && "right-0 bottom-full mb-2",
            side === "bottom" && align === "start" && "top-full left-0 mt-2",
            side === "bottom" && align === "end" && "top-full right-0 mt-2",
          )}
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
