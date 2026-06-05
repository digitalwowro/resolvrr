"use client";

import type {
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
import {
  elementRect,
  insertionIndicatorStyleForDrag,
  rectGap,
  targetIndexForPointer,
  transformForDrag,
  type DragOrientation,
  type DragState,
  type TabRect,
} from "./drag-geometry";
import { moveAnnouncement } from "./drag-announcement";

type DraggableTicketTabsOptions = {
  onReorder(sourceTicketId: string, targetIndex: number): void;
  orientation: DragOrientation;
  tabs: WorkspaceTicketTab[];
};

const dragThreshold = 4;

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
    const message = moveAnnouncement(tabs, sourceId, targetIndex);
    if (message) {
      setAnnouncement(message);
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

  const insertionIndicatorStyle = useMemo(
    () => insertionIndicatorStyleForDrag(drag, orientation),
    [drag, orientation],
  );

  function tabReorderProps(tabId: string, index: number) {
    const dragging = drag?.dragging === true;
    const isSource = dragging && drag.sourceId === tabId;
    const transform = transformForDrag(drag, orientation, tabId, index);

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
