"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TicketTab, Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import {
  horizontalTicketTabDensity,
  visibleIconTicketTabCount,
} from "./density";
import { ListTab, stateColor, stateIcon, ticketTabTooltip } from "./tab-item";
import { useDraggableTicketTabs } from "./use-draggable-ticket-tabs";

type HorizontalTicketTabsProps = {
  activeTicketId?: string;
  listActive: boolean;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  onCloseTicket(ticketId: string): void;
  onReorderTicket(sourceTicketId: string, targetIndex: number): void;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
};

export function HorizontalTicketTabs({
  activeTicketId,
  listActive,
  onSelectList,
  onSelectTicket,
  onCloseTicket,
  onReorderTicket,
  savedViewLabel,
  tabs,
}: HorizontalTicketTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    const element = listRef.current;

    if (!element) {
      return;
    }

    const measuredElement = element;

    function updateWidth() {
      setRowWidth(measuredElement.getBoundingClientRect().width);
    }

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(measuredElement);
    return () => observer.disconnect();
  }, []);

  const density = useMemo(
    () => horizontalTicketTabDensity(rowWidth, tabs.length),
    [rowWidth, tabs.length],
  );
  const visibleTabCount =
    density === "icon"
      ? visibleIconTicketTabCount(rowWidth, tabs.length)
      : tabs.length;
  const visibleTabs = tabs.slice(0, visibleTabCount);
  const hiddenCount = Math.max(0, tabs.length - visibleTabs.length);
  const {
    announcement,
    containerRef: dragContainerRef,
    insertionIndicatorStyle,
    tabReorderProps,
  } = useDraggableTicketTabs({
    onReorder: onReorderTicket,
    orientation: "horizontal",
    tabs: visibleTabs,
  });

  function setTabListRef(element: HTMLDivElement | null) {
    listRef.current = element;
    dragContainerRef.current = element;
  }

  return (
    <div className="relative flex min-w-0 shrink-0 items-end gap-1 border-b border-indigo-200 bg-slate-50">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        aria-label="Open tickets"
        className="flex min-w-0 flex-1 gap-1"
        role="tablist"
      >
        <ListTab
          active={listActive}
          onSelect={onSelectList}
          savedViewLabel={savedViewLabel}
        />
        <div
          className={
            density === "icon"
              ? "relative flex min-w-0 flex-1 gap-0"
              : "relative flex min-w-0 flex-1 gap-1"
          }
          ref={setTabListRef}
        >
          {insertionIndicatorStyle ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-40 w-0.5 rounded-full bg-indigo-600"
              style={insertionIndicatorStyle}
            />
          ) : null}
          {visibleTabs.map((tab, index) => {
            const key = tab.stateKey ?? "unknown";
            const Icon = stateIcon[key];
            const reorderProps = tabReorderProps(tab.id, index);
            const tabActive = tab.id === activeTicketId;

            return (
              <TicketTab
                accentClassName={stateColor[key]}
                active={tabActive}
                className={density === "full" ? "max-w-sm" : undefined}
                containerClassName={cn(
                  reorderProps.className,
                  !tabActive && "!translate-y-0",
                )}
                containerRef={reorderProps.ref}
                containerStyle={reorderProps.style}
                density={density}
                icon={
                  <Icon
                    aria-hidden="true"
                    className={`size-3.5 shrink-0 ${stateColor[key]}`}
                  />
                }
                key={tab.id}
                label={tab.number}
                onContainerClickCapture={reorderProps.onClickCapture}
                onContainerPointerCancel={reorderProps.onPointerCancel}
                onContainerPointerDown={reorderProps.onPointerDown}
                onContainerPointerMove={reorderProps.onPointerMove}
                onContainerPointerUp={reorderProps.onPointerUp}
                onClose={() => onCloseTicket(tab.id)}
                onSelect={() => onSelectTicket(tab.id)}
                onTabKeyDown={reorderProps.onKeyDown}
                title={tab.title}
                tooltip={density === "icon" ? ticketTabTooltip(tab) : undefined}
              />
            );
          })}
          {hiddenCount > 0 ? (
            <Tooltip
              content={`${hiddenCount} more tabs are open. Close tabs to show more, or switch to vertical tabs.`}
              side="bottom"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-t-md border border-b-0 border-rose-200 bg-rose-50 hover:bg-rose-100">
                <TriangleAlert
                  aria-label={`${hiddenCount} more tabs`}
                  className="size-3.5 text-rose-600"
                />
              </div>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </div>
  );
}
