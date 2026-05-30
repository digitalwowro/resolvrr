import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "@/components/ui";

function mockFocusVisibleMatches(matchesFocusVisible: boolean) {
  const originalMatches = Element.prototype.matches;

  return vi
    .spyOn(Element.prototype, "matches")
    .mockImplementation(function (this: Element, selectors: string): boolean {
      if (selectors === ":focus-visible") {
        return matchesFocusVisible;
      }

      return originalMatches.call(this, selectors);
    });
}

describe("Tooltip", () => {
  it("opens on keyboard-visible focus, links with aria-describedby, and closes on Escape", async () => {
    const user = userEvent.setup();
    const matches = mockFocusVisibleMatches(true);
    render(
      <Tooltip content="More context" delayMs={0}>
        <button type="button">Info</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Info" });
    trigger.focus();

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("More context");
    expect(trigger.parentElement).toHaveAttribute("aria-describedby");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    matches.mockRestore();
  });

  it("does not open on ordinary focus without focus-visible intent", async () => {
    const matches = mockFocusVisibleMatches(false);
    render(
      <Tooltip content="More context" delayMs={0}>
        <button type="button">Info</button>
      </Tooltip>,
    );

    screen.getByRole("button", { name: "Info" }).focus();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    matches.mockRestore();
  });

  it("opens on pointer hover and supports rich non-interactive content", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip
        content={
          <span>
            Plain <strong>important</strong>
          </span>
        }
        delayMs={0}
      >
        <button type="button">Details</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Details" }));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Plain important");
    expect(tooltip.querySelector("strong")).toHaveTextContent("important");
  });

  it("positions bottom tooltips from the viewport when left alignment would overflow", async () => {
    const user = userEvent.setup();
    const originalWidth = window.innerWidth;
    const getBoundingClientRect = vi.spyOn(
      HTMLElement.prototype,
      "getBoundingClientRect",
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    getBoundingClientRect.mockImplementation(function (
      this: HTMLElement,
    ): DOMRect {
      const box =
        this.getAttribute("role") === "tooltip"
          ? { x: 0, y: 0, width: 180, height: 24 }
          : { x: 280, y: 40, width: 28, height: 20 };

      return {
        bottom: box.y + box.height,
        height: box.height,
        left: box.x,
        right: box.x + box.width,
        toJSON: () => ({}),
        top: box.y,
        width: box.width,
        x: box.x,
        y: box.y,
      } as DOMRect;
    });

    render(
      <Tooltip content="Right edge details" delayMs={0} side="bottom">
        <button type="button">Edge</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Edge" }));

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveStyle({
        left: "128px",
        top: "68px",
      });
    });
    expect(screen.getByRole("tooltip")).toHaveClass("fixed", "z-50");

    getBoundingClientRect.mockRestore();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth,
    });
  });

  it("renders the tooltip outside clipping ancestors", async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="clipping-parent" className="overflow-hidden">
        <Tooltip content="Escapes clipping" delayMs={0}>
          <button type="button">Clipped trigger</button>
        </Tooltip>
      </div>,
    );

    await user.hover(screen.getByRole("button", { name: "Clipped trigger" }));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Escapes clipping");
    expect(tooltip.parentElement).toBe(document.body);
  });
});
