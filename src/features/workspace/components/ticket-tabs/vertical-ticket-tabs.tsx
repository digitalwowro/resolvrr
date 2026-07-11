import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";
import { TicketTab } from "@/components/ui";
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
      <PriorityIcon filled={false} priority={priority} />
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
    <TicketTab
      accentClassName={stateColor[key]}
      active={active}
      className="min-h-14 flex-none"
      containerClassName={reorderClassName}
      containerRef={refCallback}
      containerStyle={style}
      label={tab.number}
      layout="vertical"
      onClose={onClose}
      onContainerClickCapture={onClickCapture}
      onContainerPointerCancel={onPointerCancel}
      onContainerPointerDown={onPointerDown}
      onContainerPointerMove={onPointerMove}
      onContainerPointerUp={onPointerUp}
      onSelect={onSelect}
      onTabKeyDown={onKeyDown}
      secondary={(
        <span className="flex min-w-0 items-center gap-1.5">
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
      )}
      title={tab.title}
    />
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
      className="relative z-10 flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col overflow-hidden border-r border-t border-slate-200 bg-slate-50"
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        aria-label="Open tickets"
        className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-4"
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
