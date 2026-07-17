"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { TicketTab } from "@/components/ui";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { ListTab, stateColor, ticketTabTooltip } from "./tab-item";
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
  unsynchronizedTicketIds?: string[];
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
  unsynchronizedTicketIds = [],
}: HorizontalTicketTabsProps) {
  const ticketTabsRowRef = useRef<HTMLDivElement | null>(null);
  const fullNumberMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [ticketTabsRowWidth, setTicketTabsRowWidth] = useState(0);
  const [fullNumberLabelWidth, setFullNumberLabelWidth] = useState(0);
  const {
    announcement,
    containerRef: dragContainerRef,
    insertionIndicatorStyle,
    tabReorderProps,
  } = useDraggableTicketTabs({
    onReorder: onReorderTicket,
    orientation: "horizontal",
    tabs,
  });
  const longestTicketNumber = useMemo(
    () => tabs.reduce((longest, tab) => (
      tab.number.length > longest.length ? tab.number : longest
    ), ""),
    [tabs],
  );
  const compressTicketNumbers = useMemo(
    () => shouldCompressHorizontalTicketNumbers({
      fullNumberLabelWidth,
      tabs,
      ticketTabsRowWidth,
    }),
    [fullNumberLabelWidth, tabs, ticketTabsRowWidth],
  );

  useLayoutEffect(() => {
    const element = ticketTabsRowRef.current;

    if (!element) {
      return;
    }

    const measuredElement = element;

    function updateMeasurements() {
      setTicketTabsRowWidth(measuredElement.getBoundingClientRect().width);
      setFullNumberLabelWidth(
        fullNumberMeasureRef.current?.getBoundingClientRect().width ?? 0,
      );
    }

    updateMeasurements();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMeasurements);
      return () => window.removeEventListener("resize", updateMeasurements);
    }

    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(measuredElement);
    if (fullNumberMeasureRef.current) {
      observer.observe(fullNumberMeasureRef.current);
    }
    return () => observer.disconnect();
  }, [longestTicketNumber]);

  function setTicketTabsRowRef(element: HTMLDivElement | null) {
    ticketTabsRowRef.current = element;
    dragContainerRef.current = element;
  }

  return (
    <div className="relative flex min-w-0 shrink-0 items-end gap-2 overflow-hidden bg-slate-50">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        aria-label="Open tickets"
        className="flex min-w-0 flex-1 gap-2 overflow-hidden"
        role="tablist"
      >
        <ListTab
          active={listActive}
          onSelect={onSelectList}
          savedViewLabel={savedViewLabel}
        />
        <div
          className="relative flex min-w-0 flex-1 gap-2 overflow-hidden"
          ref={setTicketTabsRowRef}
        >
          {longestTicketNumber ? (
            <span
              aria-hidden="true"
              className="pointer-events-none invisible absolute -z-10 whitespace-nowrap"
              ref={fullNumberMeasureRef}
            >
              {longestTicketNumber}
            </span>
          ) : null}
          {insertionIndicatorStyle ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-40 w-0.5 rounded-full bg-indigo-600"
              style={insertionIndicatorStyle}
            />
          ) : null}
          {tabs.map((tab, index) => {
            const key = tab.stateKey ?? "unknown";
            const reorderProps = tabReorderProps(tab.id, index);
            const tabActive = tab.id === activeTicketId;

            return (
              <TicketTab
                accentClassName={stateColor[key]}
                active={tabActive}
                compressNumber={compressTicketNumbers}
                containerClassName={reorderProps.className}
                containerRef={reorderProps.ref}
                containerStyle={reorderProps.style}
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
                tooltip={ticketTabTooltip(tab)}
                syncPending={unsynchronizedTicketIds.includes(tab.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ShouldCompressHorizontalTicketNumbersInput = {
  fullNumberLabelWidth?: number;
  tabs: WorkspaceTicketTab[];
  ticketTabsRowWidth: number;
};

export function shouldCompressHorizontalTicketNumbers({
  fullNumberLabelWidth = 0,
  tabs,
  ticketTabsRowWidth,
}: ShouldCompressHorizontalTicketNumbersInput) {
  if (ticketTabsRowWidth <= 0 || tabs.length === 0) {
    return false;
  }

  const ticketTabGapWidth = 8;
  const ticketTabStaticWidth = 50;
  const estimatedNumberCharacterWidth = 8;
  const longestTicketNumberLength = Math.max(
    ...tabs.map((tab) => tab.number.length),
  );
  const tabWidth =
    (ticketTabsRowWidth - Math.max(0, tabs.length - 1) * ticketTabGapWidth) /
    tabs.length;
  const numberLabelWidth = Math.ceil(fullNumberLabelWidth) || (
    longestTicketNumberLength * estimatedNumberCharacterWidth
  );
  const fullNumberWidth =
    ticketTabStaticWidth +
    numberLabelWidth;

  return tabWidth < fullNumberWidth;
}
