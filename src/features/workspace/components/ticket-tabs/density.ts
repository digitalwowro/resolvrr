export type HorizontalTicketTabDensity = "full" | "compact" | "icon";

export function horizontalTicketTabDensity(
  width: number,
  tabCount: number,
): HorizontalTicketTabDensity {
  if (tabCount === 0 || width === 0) {
    return "full";
  }

  const fullTabMinWidth = 176;
  const compactTabMinWidth = 128;
  const tabGapWidth = 4;

  if (tabCount * fullTabMinWidth + (tabCount - 1) * tabGapWidth <= width) {
    return "full";
  }

  if (tabCount * compactTabMinWidth + (tabCount - 1) * tabGapWidth <= width) {
    return "compact";
  }

  return "icon";
}

export function visibleIconTicketTabCount(width: number, tabCount: number) {
  if (tabCount === 0 || width === 0) {
    return tabCount;
  }

  const iconTabWidth = 28;
  const overflowNoticeWidth = 36;
  if (tabCount * iconTabWidth <= width) {
    return tabCount;
  }

  return Math.max(1, Math.floor((width - overflowNoticeWidth) / iconTabWidth));
}
