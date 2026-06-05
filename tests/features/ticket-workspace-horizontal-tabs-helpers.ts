import { vi } from "vitest";
import { row } from "./ticket-workspace-test-utils";

export const thirdRow = {
  ...row,
  id: "ticket-3",
  number: "#1003",
  title: "Billing problem",
  customer: "Riley Stone",
} satisfies typeof row;

export function domRect({
  height,
  left,
  top,
  width,
}: {
  height: number;
  left: number;
  top: number;
  width: number;
}): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect;
}

export function mockElementRect(element: Element | null, rect: DOMRect) {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected an HTMLElement to mock a tab rect.");
  }
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);
}
