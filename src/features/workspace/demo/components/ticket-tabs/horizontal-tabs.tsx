import { TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TicketTab, Tooltip } from "@/components/ui";
import type { StaticTicketTab } from "../../static-types";
import { HorizontalListTab } from "./list-tabs";
import {
  getHorizontalDensity,
  getVisibleIconTabCount,
  stateColor,
  stateIcon,
  ticketTooltip,
} from "./tab-style";

type HorizontalTicketTabsProps = {
  tabs: StaticTicketTab[];
  activeTicketId?: string;
  listActive: boolean;
  savedViewLabel: string;
  onSelectList(): void;
  onSelect(ticketId: string): void;
};

export function HorizontalTicketTabs({
  tabs,
  activeTicketId,
  listActive,
  savedViewLabel,
  onSelectList,
  onSelect,
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
              accentClassName={stateColor[tab.state]}
              active={tab.id === activeTicketId}
              className={density === "full" ? "max-w-sm" : undefined}
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
