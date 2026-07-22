"use client";

import { X } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
  Ref,
} from "react";
import { cn } from "./classnames";
import { Tooltip } from "./tooltip";

type TicketTabLayout = "horizontal" | "vertical";

type TicketTabProps = {
  label: string;
  title?: string;
  secondary?: ReactNode;
  icon?: ReactNode;
  accentClassName?: string;
  className?: string;
  compressNumber?: boolean;
  layout?: TicketTabLayout;
  tooltip?: ReactNode;
  active?: boolean;
  unread?: boolean;
  dirty?: boolean;
  loading?: boolean;
  containerClassName?: string;
  containerRef?: Ref<HTMLElement>;
  containerStyle?: CSSProperties;
  onContainerClickCapture?: MouseEventHandler<HTMLElement>;
  onContainerPointerCancel?: PointerEventHandler<HTMLElement>;
  onContainerPointerDown?: PointerEventHandler<HTMLElement>;
  onContainerPointerMove?: PointerEventHandler<HTMLElement>;
  onContainerPointerUp?: PointerEventHandler<HTMLElement>;
  onTabKeyDown?: KeyboardEventHandler<HTMLElement>;
  onSelect(): void;
  onClose?(): void;
};

export function TicketTab({
  label,
  title,
  secondary,
  icon,
  accentClassName,
  className,
  compressNumber = false,
  layout = "horizontal",
  tooltip,
  active = false,
  unread = false,
  dirty = false,
  loading = false,
  containerClassName,
  containerRef,
  containerStyle,
  onContainerClickCapture,
  onContainerPointerCancel,
  onContainerPointerDown,
  onContainerPointerMove,
  onContainerPointerUp,
  onTabKeyDown,
  onSelect,
  onClose,
}: TicketTabProps) {
  const vertical = layout === "vertical";
  const compressedNumberLabel = compressedTicketNumberLabel(label);
  const labelNumber = (
    <span
      className={cn(
        "ticket-tab-number inline-flex min-w-0 items-baseline overflow-hidden",
        title || compressNumber ? "shrink-0" : "flex-1 font-semibold",
      )}
    >
      {compressNumber && compressedNumberLabel ? (
        <span className="ticket-tab-number-compressed shrink-0">
          {compressedNumberLabel}
        </span>
      ) : (
        <span className="ticket-tab-number-full shrink-0">{label}</span>
      )}
    </span>
  );
  const horizontalLabelText = title ? (
    <span className="ticket-tab-label min-w-0 flex flex-1 items-baseline overflow-hidden">
      {labelNumber}
      <span className="ticket-tab-title ml-1 min-w-0 flex-1 shrink-[999] overflow-hidden">
        <span className="ticket-tab-title-text block min-w-0 truncate font-semibold">
          {title}
        </span>
      </span>
    </span>
  ) : (
    <span className="ticket-tab-label min-w-0 flex flex-1 items-baseline overflow-hidden">
      {labelNumber}
    </span>
  );
  const verticalLabelText = (
    <span className="ticket-tab-label min-w-0 flex flex-1 flex-col overflow-hidden">
      <span className="ticket-tab-title block min-w-0 overflow-hidden">
        <span className="ticket-tab-title-text block min-w-0 truncate font-semibold text-slate-950">
          {title ?? label}
        </span>
      </span>
      {secondary ? (
        <span className="ticket-tab-secondary mt-0.5 min-w-0 overflow-hidden text-xs text-slate-500">
          {secondary}
        </span>
      ) : null}
    </span>
  );
  const showClose = Boolean(onClose);

  const tab = (
    <span
      className={cn(
        "group relative overflow-hidden rounded-md border bg-white",
        vertical
          ? "flex w-full items-start gap-2 px-3 py-2 text-left"
          : "inline-flex h-9 min-w-16 max-w-64 flex-[1_1_0] items-center gap-1.5 px-3",
        className,
        active
          ? "z-10 border-slate-300"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        containerClassName,
      )}
      onClickCapture={onContainerClickCapture}
      onPointerCancel={onContainerPointerCancel}
      onPointerDown={onContainerPointerDown}
      onPointerMove={onContainerPointerMove}
      onPointerUp={onContainerPointerUp}
      ref={containerRef}
      style={containerStyle}
    >
      {accentClassName ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-[3px] rounded-full",
            active
              ? "inset-x-0 bottom-0"
              : vertical
                ? "bottom-1 left-3 w-5"
                : "bottom-1 left-2.5 w-5",
            accentClassName,
          )}
          style={{ backgroundColor: "currentColor" }}
        />
      ) : null}
      <button
        aria-selected={active}
        aria-label={title ? `${label} ${title}` : compressNumber ? label : undefined}
        className={cn(
          "flex min-w-0 flex-1 gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
          vertical ? "items-start text-left" : "items-center",
        )}
        onKeyDown={(event) => {
          if (
            onClose &&
            (event.key === "Delete" || event.key === "Backspace")
          ) {
            event.preventDefault();
            onClose();
          }
          if (!event.defaultPrevented) {
            onTabKeyDown?.(event);
          }
        }}
        onClick={onSelect}
        role="tab"
        type="button"
      >
        {loading ? <span className="sr-only">{label} loading</span> : null}
        {icon}
        {unread ? <span className="sr-only">Unread</span> : null}
        {vertical ? verticalLabelText : horizontalLabelText}
        {dirty ? <span className="sr-only">Unsaved changes</span> : null}
      </button>
      {showClose ? (
        <Tooltip className={cn("shrink-0", vertical && "self-center")} content={`Close ${label}`}>
          <button
            aria-label={`Close ${label}`}
            className={cn(
              "grid shrink-0 place-items-center text-slate-400 hover:text-slate-700",
              vertical ? "size-5 rounded-md hover:bg-slate-100" : "size-3",
            )}
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </Tooltip>
      ) : null}
    </span>
  );

  return tooltip ? (
    <Tooltip
      className={vertical ? "w-full" : "min-w-16 max-w-64 flex-[1_1_0]"}
      content={tooltip}
      side="top"
    >
      {tab}
    </Tooltip>
  ) : (
    tab
  );
}

function compressedTicketNumberLabel(label: string) {
  const match = /^(.*?)(\d+)$/u.exec(label);
  if (!match || match[2].length < 2) {
    return null;
  }

  const marker = match[1];
  const digits = match[2];
  const suffix = digits.slice(-2);

  return `${marker}...${suffix}`;
}
