import { X } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { TicketPriority } from "@/core/tickets";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { PriorityIcon } from "../ticket-table-cells";
import { stateColor, VerticalListTab } from "./tab-item";
import { useDraggableTicketTabs } from "./use-draggable-ticket-tabs";

type VerticalTicketTabsProps = {
  activeTicketId?: string;
  listActive: boolean;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  onCloseTicket(ticketId: string): void;
  onReorderTicket(sourceTicketId: string, targetIndex: number): void;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
};

const priorityTextColor: Record<TicketPriority | "unknown", string> = {
  low: "text-emerald-700",
  medium: "text-indigo-700",
  high: "text-rose-700",
  unknown: "text-slate-500",
};

function VerticalTicketPriorityToken({
  priority,
  priorityLabel,
}: {
  priority?: TicketPriority;
  priorityLabel: string;
}) {
  const key = priority ?? "unknown";

  return (
    <span
      aria-label={`Priority: ${priorityLabel}`}
      className={cn(
        "inline-flex shrink-0 items-center text-xs font-medium",
        priorityTextColor[key],
      )}
    >
      <PriorityIcon priority={priority} />
    </span>
  );
}

function VerticalTicketTab({
  active,
  onClose,
  onClickCapture,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  refCallback,
  onSelect,
  reorderClassName,
  style,
  tab,
}: {
  active: boolean;
  onClose(): void;
  onClickCapture(event: MouseEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
  onPointerCancel(): void;
  onPointerDown(event: PointerEvent<HTMLElement>): void;
  onPointerMove(event: PointerEvent<HTMLElement>): void;
  onPointerUp(event: PointerEvent<HTMLElement>): void;
  refCallback(element: HTMLElement | null): void;
  onSelect(): void;
  reorderClassName: string;
  style?: CSSProperties;
  tab: WorkspaceTicketTab;
}) {
  const key = tab.stateKey ?? "unknown";

  return (
    <button
      aria-selected={active}
      className={cn(
        "group relative flex w-full items-start gap-2 overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-left",
        active
          ? "z-10 border-slate-300"
          : "hover:border-slate-300 hover:bg-slate-50",
        reorderClassName,
      )}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
      onClick={onSelect}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={refCallback}
      role="tab"
      style={style}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute h-[3px] rounded-full",
          active ? "inset-x-0 bottom-0" : "bottom-0.5 left-3 w-5",
          stateColor[key],
        )}
        style={{ backgroundColor: "currentColor" }}
      />
      <span className="min-w-0 flex-1 pr-1">
        <span className="block truncate font-semibold text-slate-950">
          {tab.title}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <span className="min-w-0 truncate">
            {tab.number} · {tab.customer}
          </span>
          <span aria-hidden="true" className="shrink-0 text-slate-300">
            ·
          </span>
          <VerticalTicketPriorityToken
            priority={tab.priorityKey}
            priorityLabel={tab.priority}
          />
        </span>
      </span>
      <Tooltip className="self-center" content={`Close ${tab.number}`}>
        <span
          aria-label={`Close ${tab.number}`}
          className="grid size-5 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          role="button"
          tabIndex={0}
        >
          <X aria-hidden="true" className="size-3" />
        </span>
      </Tooltip>
    </button>
  );
}

export function VerticalTicketTabs({
  activeTicketId,
  listActive,
  onSelectList,
  onSelectTicket,
  onCloseTicket,
  onReorderTicket,
  savedViewLabel,
  tabs,
}: VerticalTicketTabsProps) {
  const {
    announcement,
    containerRef,
    insertionIndicatorStyle,
    tabReorderProps,
  } = useDraggableTicketTabs({
    onReorder: onReorderTicket,
    orientation: "vertical",
    tabs,
  });

  return (
    <aside
      className="flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col overflow-hidden border-r border-t border-slate-200 bg-slate-50"
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        aria-label="Open tickets"
        className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-2"
        ref={containerRef}
        role="tablist"
      >
        {insertionIndicatorStyle ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-40 h-0.5 rounded-full bg-indigo-600"
            style={insertionIndicatorStyle}
          />
        ) : null}
        <VerticalListTab
          active={listActive}
          onSelect={onSelectList}
          savedViewLabel={savedViewLabel}
        />
        {tabs.map((tab, index) => {
          const reorderProps = tabReorderProps(tab.id, index);

          return (
            <VerticalTicketTab
              active={tab.id === activeTicketId}
              key={tab.id}
              onClickCapture={reorderProps.onClickCapture}
              onClose={() => onCloseTicket(tab.id)}
              onKeyDown={reorderProps.onKeyDown}
              onPointerCancel={reorderProps.onPointerCancel}
              onPointerDown={reorderProps.onPointerDown}
              onPointerMove={reorderProps.onPointerMove}
              onPointerUp={reorderProps.onPointerUp}
              onSelect={() => onSelectTicket(tab.id)}
              refCallback={reorderProps.ref}
              reorderClassName={reorderProps.className}
              style={reorderProps.style}
              tab={tab}
            />
          );
        })}
      </div>
    </aside>
  );
}
