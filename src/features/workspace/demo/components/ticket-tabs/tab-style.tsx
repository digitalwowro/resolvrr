import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import type {
  StaticTicketState,
  StaticTicketTab,
} from "../../static-types";

export type HorizontalDensity = "full" | "compact" | "icon";

export const stateColor: Record<StaticTicketState, string> = {
  New: "text-rose-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

export const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: CirclePlus,
  Open: Circle,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

export function getHorizontalDensity(
  width: number,
  tabCount: number,
): HorizontalDensity {
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

export function getVisibleIconTabCount(width: number, tabCount: number) {
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

export function ticketTooltip(tab: StaticTicketTab) {
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
