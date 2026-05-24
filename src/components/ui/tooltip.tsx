"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "./classnames";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  delayMs?: number;
  side?: "top" | "bottom";
  className?: string;
};

type TooltipPosition = Pick<CSSProperties, "left" | "top">;

export function Tooltip({
  content,
  children,
  delayMs = 250,
  side = "top",
  className,
}: TooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
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
    const gap = 8;

    if (side === "bottom") {
      const startWouldOverflow = triggerRect.left + tooltipRect.width > viewportRight;
      const endWouldFit = triggerRect.right - tooltipRect.width >= viewportLeft;
      const nextAlign = startWouldOverflow && endWouldFit ? "end" : "start";

      setPosition({
        left:
          nextAlign === "end"
            ? triggerRect.right - tooltipRect.width
            : Math.min(triggerRect.left, viewportRight - tooltipRect.width),
        top: triggerRect.bottom + gap,
      });
      return;
    }

    const centeredLeft =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const centeredRight = centeredLeft + tooltipRect.width;

    if (centeredRight > viewportRight) {
      const nextAlign =
        triggerRect.right - tooltipRect.width >= viewportLeft ? "end" : "center";
      setPosition({
        left:
          nextAlign === "end"
            ? triggerRect.right - tooltipRect.width
            : Math.max(viewportLeft, viewportRight - tooltipRect.width),
        top: triggerRect.top - tooltipRect.height - gap,
      });
      return;
    }

    if (centeredLeft < viewportLeft) {
      setPosition({
        left: triggerRect.left,
        top: triggerRect.top - tooltipRect.height - gap,
      });
      return;
    }

    setPosition({
      left: centeredLeft,
      top: triggerRect.top - tooltipRect.height - gap,
    });
  }, [open, side]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleOpen() {
    clearTimer();
    setPosition(null);
    timerRef.current = setTimeout(() => setOpen(true), delayMs);
  }

  function close() {
    clearTimer();
    setOpen(false);
    setPosition(null);
  }

  const tooltip = open
    ? createPortal(
        <span
          className={cn(
            "fixed z-50 w-max rounded-md bg-slate-950 px-2 py-1 text-xs text-white",
            !position && "opacity-0",
          )}
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={position ?? undefined}
        >
          {content}
        </span>,
        document.body,
      )
    : null;

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
      {tooltip}
    </span>
  );
}
