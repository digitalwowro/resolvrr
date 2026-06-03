"use client";

import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";

type DragOrientation = "horizontal" | "vertical";

type TabRect = {
  id: string;
  index: number;
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type DragState = {
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

type DraggableTicketTabsOptions = {
  onReorder(sourceTicketId: string, targetIndex: number): void;
  orientation: DragOrientation;
  tabs: WorkspaceTicketTab[];
};

const dragThreshold = 4;

function tabLabel(tab: WorkspaceTicketTab) {
  return tab.number || tab.title;
}

function reorderedTabs(
  tabs: WorkspaceTicketTab[],
  sourceId: string,
  targetIndex: number,
) {
  const sourceIndex = tabs.findIndex((tab) => tab.id === sourceId);
  if (sourceIndex === -1) {
    return tabs;
  }

  const next = tabs.filter((tab) => tab.id !== sourceId);
  const clampedTargetIndex = Math.max(0, Math.min(targetIndex, next.length));
  next.splice(clampedTargetIndex, 0, tabs[sourceIndex]);
  return next;
}

function targetIndexForPointer(
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

function rectGap(rects: TabRect[], orientation: DragOrientation) {
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

function elementRect(element: HTMLElement, index: number, id: string): TabRect {
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

export function useDraggableTicketTabs({
  onReorder,
  orientation,
  tabs,
}: DraggableTicketTabsOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragCandidateRef = useRef<DragState | undefined>(undefined);
  const tabRefs = useRef(new Map<string, HTMLElement>());
  const suppressNextClickRef = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  const [drag, setDrag] = useState<DragState | undefined>();

  const registerTab = useCallback(
    (tabId: string) => (element: HTMLElement | null) => {
      if (element) {
        tabRefs.current.set(tabId, element);
      } else {
        tabRefs.current.delete(tabId);
      }
    },
    [],
  );

  const measureTabs = useCallback(() => {
    return tabs
      .map((tab, index) => {
        const element = tabRefs.current.get(tab.id);
        return element ? elementRect(element, index, tab.id) : undefined;
      })
      .filter((rect): rect is TabRect => Boolean(rect));
  }, [tabs]);

  function announceMove(sourceId: string, targetIndex: number) {
    const sourceIndex = tabs.findIndex((tab) => tab.id === sourceId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      return;
    }

    const nextTabs = reorderedTabs(tabs, sourceId, targetIndex);
    const movedIndex = nextTabs.findIndex((tab) => tab.id === sourceId);
    const movedTab = nextTabs[movedIndex];
    if (!movedTab) {
      return;
    }

    const previousTab = nextTabs[movedIndex - 1];
    const nextTab = nextTabs[movedIndex + 1];
    if (previousTab) {
      setAnnouncement(
        `Moved ${tabLabel(movedTab)} after ${tabLabel(previousTab)}.`,
      );
    } else if (nextTab) {
      setAnnouncement(
        `Moved ${tabLabel(movedTab)} before ${tabLabel(nextTab)}.`,
      );
    } else {
      setAnnouncement(`Moved ${tabLabel(movedTab)}.`);
    }
  }

  const suppressClick = useCallback(() => {
    suppressNextClickRef.current = true;
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
  }, []);

  function handlePointerDown(
    tabId: string,
    index: number,
    event: PointerEvent<HTMLElement>,
  ) {
    if (event.button !== 0) {
      return;
    }

    const itemRects = measureTabs();
    const sourceRect = itemRects.find((rect) => rect.id === tabId);
    if (!sourceRect) {
      return;
    }

    const target = event.currentTarget;
    const containerRect =
      containerRef.current?.getBoundingClientRect() ?? target.getBoundingClientRect();

    dragCandidateRef.current = {
      containerRect,
      currentX: event.clientX,
      currentY: event.clientY,
      dragging: false,
      gap: rectGap(itemRects, orientation),
      itemRects,
      originIndex: index,
      pointerId: event.pointerId,
      sourceId: tabId,
      sourceRect,
      startX: event.clientX,
      startY: event.clientY,
      targetIndex: index,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const activeDrag = drag ?? dragCandidateRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - activeDrag.startX,
      event.clientY - activeDrag.startY,
    );
    const dragging = activeDrag.dragging || distance > dragThreshold;

    if (!dragging) {
      return;
    }

    event.preventDefault();
    const target = event.currentTarget;
    if ("setPointerCapture" in target && !drag) {
      target.setPointerCapture(event.pointerId);
    }

    const nextDrag = {
      ...activeDrag,
      currentX: event.clientX,
      currentY: event.clientY,
      dragging,
      targetIndex: targetIndexForPointer(
        activeDrag,
        orientation,
        event.clientX,
        event.clientY,
      ),
    };

    dragCandidateRef.current = nextDrag;
    setDrag(nextDrag);
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const activeDrag = drag ?? dragCandidateRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget;
    if ("releasePointerCapture" in target) {
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // The browser may already have released capture after pointercancel.
      }
    }

    if (activeDrag.dragging) {
      event.preventDefault();
      if (activeDrag.targetIndex !== activeDrag.originIndex) {
        suppressClick();
        announceMove(activeDrag.sourceId, activeDrag.targetIndex);
        onReorder(activeDrag.sourceId, activeDrag.targetIndex);
      }
    }
    dragCandidateRef.current = undefined;
    setDrag(undefined);
  }

  const cancelDrag = useCallback(() => {
    dragCandidateRef.current = undefined;
    setDrag((current) => {
      if (current?.dragging) {
        suppressClick();
      }
      return undefined;
    });
  }, [suppressClick]);

  function handleKeyboardReorder(
    tabId: string,
    index: number,
    event: KeyboardEvent<HTMLElement>,
  ) {
    if (!event.altKey) {
      return;
    }

    const backwardKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const forwardKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const targetIndex = event.key === backwardKey
      ? index - 1
      : event.key === forwardKey
        ? index + 1
        : index;

    if (
      targetIndex === index ||
      targetIndex < 0 ||
      targetIndex >= tabs.length
    ) {
      return;
    }

    event.preventDefault();
    announceMove(tabId, targetIndex);
    onReorder(tabId, targetIndex);
  }

  useEffect(() => {
    if (!drag?.dragging) {
      return;
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDrag();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelDrag, drag?.dragging]);

  const insertionIndicatorStyle = useMemo<CSSProperties | undefined>(() => {
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
  }, [drag, orientation]);

  function transformFor(tabId: string, index: number) {
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

  function tabReorderProps(tabId: string, index: number) {
    const dragging = drag?.dragging === true;
    const isSource = dragging && drag.sourceId === tabId;
    const transform = transformFor(tabId, index);

    return {
      className: isSource
        ? "z-30 cursor-grabbing touch-none select-none shadow-lg transition-none"
        : "cursor-grab touch-none transition-transform duration-150 ease-out active:cursor-grabbing",
      onClickCapture(event: MouseEvent<HTMLElement>) {
        if (suppressNextClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressNextClickRef.current = false;
        }
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
        handleKeyboardReorder(tabId, index, event),
      onPointerCancel: cancelDrag,
      onPointerDown: (event: PointerEvent<HTMLElement>) =>
        handlePointerDown(tabId, index, event),
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      ref: registerTab(tabId),
      style: transform ? { transform } : undefined,
    };
  }

  return {
    announcement,
    containerRef,
    insertionIndicatorStyle,
    tabReorderProps,
  };
}
