"use client";

import {
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  List,
  PauseCircle,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TicketTab, Tooltip } from "@/components/ui";
import type {
  StaticTabOrientation,
  StaticTicketState,
  StaticTicketTab,
} from "../static-types";

type TicketTabsPanelProps = {
  tabs: StaticTicketTab[];
  activeTicketId?: string;
  listActive: boolean;
  orientation: StaticTabOrientation;
  savedViewLabel: string;
  onSelectList(): void;
  onSelect(ticketId: string): void;
};

type HorizontalDensity = "full" | "compact" | "icon";

const stateColor: Record<StaticTicketState, string> = {
  New: "text-rose-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: CirclePlus,
  Open: Circle,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

function getHorizontalDensity(width: number, tabCount: number): HorizontalDensity {
  if (tabCount === 0 || width === 0) {
    return "full";
  }

  const fullTabMinWidth = 176;
  const compactTabMinWidth = 56;
  const tabGapWidth = 4;

  if (tabCount * fullTabMinWidth + (tabCount - 1) * tabGapWidth <= width) {
    return "full";
  }

  if (tabCount * compactTabMinWidth + (tabCount - 1) * tabGapWidth <= width) {
    return "compact";
  }

  return "icon";
}

function getVisibleIconTabCount(width: number, tabCount: number) {
  if (tabCount === 0 || width === 0) {
    return tabCount;
  }

  const iconTabWidth = 28;
  const overflowNoticeWidth = 36;
  const allIconsFit = tabCount * iconTabWidth <= width;

  if (allIconsFit) {
    return tabCount;
  }

  return Math.max(1, Math.floor((width - overflowNoticeWidth) / iconTabWidth));
}

function ticketTooltip(tab: StaticTicketTab) {
  return (
    <span className="block whitespace-nowrap">
      <span className="block">
        {tab.label.split(" ")[0]} ·{" "}
        <span className="font-semibold">{tab.title}</span> · {tab.customer}
      </span>
      <span className="block">
        {tab.owner} · {tab.state} · {tab.priority}
      </span>
    </span>
  );
}

function VerticalTicketTab({
  tab,
  active,
  onSelect,
}: {
  tab: StaticTicketTab;
  active: boolean;
  onSelect(): void;
}) {
  const Icon = stateIcon[tab.state];

  return (
    <button
      aria-selected={active}
      className={
        active
          ? "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 border-l-indigo-600 bg-indigo-50 px-3 py-2 text-left"
          : "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 border-l-transparent bg-white px-3 py-2 text-left hover:bg-slate-50"
      }
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={`self-center size-3.5 shrink-0 ${stateColor[tab.state]}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {tab.title}
        </span>
        <span className="mt-0.5 block truncate text-xs">
          {tab.label.split(" ")[0]} · {tab.customer}
        </span>
      </span>
      <span
        aria-label={`Close ${tab.label}`}
        className="grid size-5 shrink-0 place-items-center self-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X aria-hidden="true" className="size-3" />
      </span>
    </button>
  );
}

function HorizontalListTab({
  active,
  savedViewLabel,
  onSelect,
}: {
  active: boolean;
  savedViewLabel: string;
  onSelect(): void;
}) {
  return (
    <Tooltip content={`Return to list: ${savedViewLabel}`} side="bottom">
      <button
        aria-label={`Return to list: ${savedViewLabel}`}
        aria-selected={active}
        className={
          active
            ? "inline-flex h-9 min-w-16 items-center gap-2 rounded-t-md border border-b-0 border-indigo-200 bg-indigo-50 px-3 text-indigo-700"
            : "inline-flex h-9 min-w-16 items-center gap-2 rounded-t-md border border-b-0 border-slate-200 bg-white px-3 hover:bg-indigo-50"
        }
        onClick={onSelect}
        role="tab"
        type="button"
      >
        <BriefcaseBusiness aria-hidden="true" className="size-3.5 shrink-0" />
        <span>List</span>
      </button>
    </Tooltip>
  );
}

function VerticalListTab({
  active,
  savedViewLabel,
  onSelect,
}: {
  active: boolean;
  savedViewLabel: string;
  onSelect(): void;
}) {
  return (
    <div className="shrink-0">
      <button
        aria-label={`Return to list: ${savedViewLabel}`}
        aria-selected={active}
        className={
          active
            ? "flex h-12 w-full items-center gap-2 bg-indigo-50 px-3 text-left text-indigo-700"
            : "flex h-12 w-full items-center gap-2 bg-slate-50 px-3 text-left hover:bg-indigo-50"
        }
        onClick={onSelect}
        role="tab"
        type="button"
      >
        <List aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-semibold">List</span>
        <span className="inline-flex min-w-0 max-w-32 items-center gap-1 truncate rounded-md border border-current px-1.5 py-0.5 text-xs">
          <BriefcaseBusiness aria-hidden="true" className="size-3 shrink-0" />
          {savedViewLabel}
        </span>
      </button>
      <div className="h-px bg-slate-200" />
    </div>
  );
}

function HorizontalTicketTabs({
  tabs,
  activeTicketId,
  listActive,
  savedViewLabel,
  onSelectList,
  onSelect,
}: {
  tabs: StaticTicketTab[];
  activeTicketId?: string;
  listActive: boolean;
  savedViewLabel: string;
  onSelectList(): void;
  onSelect(ticketId: string): void;
}) {
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

  const density = getHorizontalDensity(rowWidth, tabs.length);
  const visibleTabs = useMemo(() => {
    if (density !== "icon") {
      return tabs;
    }

    return tabs.slice(0, getVisibleIconTabCount(rowWidth, tabs.length));
  }, [density, rowWidth, tabs]);
  const hiddenCount = tabs.length - visibleTabs.length;

  return (
    <div
      aria-label="Open tickets"
      className="flex min-w-0 shrink-0 gap-1 bg-slate-50"
      role="tablist"
    >
      <HorizontalListTab
        active={listActive}
        onSelect={onSelectList}
        savedViewLabel={savedViewLabel}
      />
      <div
        className={
          density === "icon"
            ? "flex min-w-0 flex-1 gap-0"
            : "flex min-w-0 flex-1 gap-1"
        }
        ref={listRef}
      >
        {visibleTabs.map((tab) => {
          const Icon = stateIcon[tab.state];

          return (
            <TicketTab
              active={tab.id === activeTicketId}
              density={density}
              dirty={tab.dirty}
              icon={
                <Icon
                  aria-hidden="true"
                  className={`size-3.5 shrink-0 ${stateColor[tab.state]}`}
                />
              }
              key={tab.id}
              label={tab.label.split(" ")[0]}
              loading={tab.loading}
              onClose={() => undefined}
              onSelect={() => onSelect(tab.id)}
              title={tab.title}
              tooltip={density === "icon" ? ticketTooltip(tab) : undefined}
              unread={tab.unread}
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
  );
}

export function TicketTabsPanel({
  tabs,
  activeTicketId,
  listActive,
  orientation,
  savedViewLabel,
  onSelectList,
  onSelect,
}: TicketTabsPanelProps) {
  if (orientation === "vertical") {
    return (
      <aside className="flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div
          aria-label="Open tickets"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          role="tablist"
        >
          <VerticalListTab
            active={listActive}
            onSelect={onSelectList}
            savedViewLabel={savedViewLabel}
          />
          {tabs.map((tab) => (
            <VerticalTicketTab
              active={tab.id === activeTicketId}
              key={tab.id}
              onSelect={() => onSelect(tab.id)}
              tab={tab}
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <HorizontalTicketTabs
      activeTicketId={activeTicketId}
      listActive={listActive}
      onSelect={onSelect}
      onSelectList={onSelectList}
      savedViewLabel={savedViewLabel}
      tabs={tabs}
    />
  );
}
