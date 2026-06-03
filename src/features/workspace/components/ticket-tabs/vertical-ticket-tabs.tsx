import { X } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import {
  stateColor,
  stateIcon,
  VerticalListTab,
} from "./tab-item";
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
  const Icon = stateIcon[key];

  return (
    <button
      aria-selected={active}
      className={cn(
        "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 px-3 py-2 text-left",
        active
          ? "border-l-indigo-600 bg-indigo-50"
          : "border-l-transparent bg-white hover:bg-slate-50",
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
      <Icon
        aria-hidden="true"
        className={`self-center size-3.5 shrink-0 ${stateColor[key]}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{tab.title}</span>
        <span className="mt-0.5 block truncate text-xs">
          {tab.number} · {tab.customer}
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
      className="flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col overflow-hidden rounded-tr-md border-r border-t border-slate-200 bg-white"
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        aria-label="Open tickets"
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
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
