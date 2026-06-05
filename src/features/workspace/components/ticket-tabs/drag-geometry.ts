import type { CSSProperties } from "react";

export type DragOrientation = "horizontal" | "vertical";

export type TabRect = {
  id: string;
  index: number;
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export type DragState = {
  containerRect: DOMRect;
  currentX: number;
  currentY: number;
  dragging: boolean;
  gap: number;
  itemRects: TabRect[];
  originIndex: number;
  pointerId: number;
  sourceId: string;
  sourceRect: TabRect;
  startX: number;
  startY: number;
  targetIndex: number;
};

export function targetIndexForPointer(
  drag: DragState,
  orientation: DragOrientation,
  clientX: number,
  clientY: number,
) {
  const pointerPosition = orientation === "horizontal" ? clientX : clientY;
  const remainingRects = drag.itemRects.filter((rect) => rect.id !== drag.sourceId);

  return remainingRects.reduce((targetIndex, rect) => {
    const midpoint = orientation === "horizontal"
      ? rect.left + rect.width / 2
      : rect.top + rect.height / 2;
    return pointerPosition > midpoint ? targetIndex + 1 : targetIndex;
  }, 0);
}

export function rectGap(rects: TabRect[], orientation: DragOrientation) {
  const sortedRects = [...rects].sort((a, b) => a.index - b.index);
  for (let index = 0; index < sortedRects.length - 1; index += 1) {
    const current = sortedRects[index];
    const next = sortedRects[index + 1];
    const gap = orientation === "horizontal"
      ? next.left - current.right
      : next.top - current.bottom;
    if (gap > 0) {
      return gap;
    }
  }
  return 0;
}

export function elementRect(
  element: HTMLElement,
  index: number,
  id: string,
): TabRect {
  const rect = element.getBoundingClientRect();
  return {
    id,
    index,
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function insertionIndicatorStyleForDrag(
  drag: DragState | undefined,
  orientation: DragOrientation,
): CSSProperties | undefined {
  if (!drag?.dragging) {
    return undefined;
  }

  const remainingRects = drag.itemRects.filter((rect) => rect.id !== drag.sourceId);
  const referenceRect =
    drag.targetIndex === 0
      ? remainingRects[0]
      : remainingRects[Math.min(drag.targetIndex, remainingRects.length) - 1];

  if (!referenceRect) {
    return undefined;
  }

  if (orientation === "horizontal") {
    const left = drag.targetIndex === 0 ? referenceRect.left : referenceRect.right;
    return {
      bottom: 4,
      left: left - drag.containerRect.left,
      top: 4,
    };
  }

  const top = drag.targetIndex === 0 ? referenceRect.top : referenceRect.bottom;
  return {
    left: 8,
    right: 8,
    top: top - drag.containerRect.top,
  };
}

export function transformForDrag(
  drag: DragState | undefined,
  orientation: DragOrientation,
  tabId: string,
  index: number,
) {
  if (!drag?.dragging) {
    return undefined;
  }

  if (tabId === drag.sourceId) {
    const x = drag.currentX - drag.startX;
    const y = drag.currentY - drag.startY;
    return `translate3d(${x}px, ${y}px, 0)`;
  }

  const sourceSpan = orientation === "horizontal"
    ? drag.sourceRect.width + drag.gap
    : drag.sourceRect.height + drag.gap;
  const movedForward = drag.targetIndex > drag.originIndex;
  const movedBackward = drag.targetIndex < drag.originIndex;
  const shouldShiftBackward =
    movedForward && index > drag.originIndex && index <= drag.targetIndex;
  const shouldShiftForward =
    movedBackward && index >= drag.targetIndex && index < drag.originIndex;

  if (shouldShiftBackward) {
    return orientation === "horizontal"
      ? `translate3d(${-sourceSpan}px, 0, 0)`
      : `translate3d(0, ${-sourceSpan}px, 0)`;
  }
  if (shouldShiftForward) {
    return orientation === "horizontal"
      ? `translate3d(${sourceSpan}px, 0, 0)`
      : `translate3d(0, ${sourceSpan}px, 0)`;
  }
  return undefined;
}
