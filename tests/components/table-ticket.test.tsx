import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TableHeaderCell, TicketTab } from "@/components/ui";

describe("TicketTab", () => {
  it("selects and closes through separate keyboard-accessible controls", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <TicketTab
        active
        dirty
        label="Ticket 101"
        onClose={onClose}
        onSelect={onSelect}
        unread
      />,
    );

    await user.click(screen.getByRole("tab", { name: /ticket 101/i }));
    await user.click(screen.getByRole("button", { name: "Close Ticket 101" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps ticket tabs closeable from keyboard", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TicketTab
        label="Ticket 102"
        onClose={onClose}
        onSelect={vi.fn()}
      />,
    );

    screen.getByRole("tab", { name: "Ticket 102" }).focus();
    await user.keyboard("{Delete}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps inactive tabs selectable with a visible close button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <TicketTab
        label="Ticket 103"
        onClose={onClose}
        onSelect={onSelect}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close Ticket 103" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Ticket 103" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses fluid tab sizing while keeping ID-only labels readable", () => {
    render(
      <TicketTab
        icon={<span aria-hidden="true" />}
        label="#99999999"
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "#99999999" }).parentElement)
      .toHaveClass("min-w-16", "max-w-64", "flex-[1_1_0]");
    expect(screen.getByRole("tab", { name: "#99999999" }).parentElement)
      .not.toHaveClass("max-w-36");
    expect(
      screen.getByRole("button", { name: "Close #99999999" }),
    ).toHaveClass("size-3", "hover:text-slate-700");
    expect(
      screen.getByRole("button", { name: "Close #99999999" }),
    ).not.toHaveClass("size-5", "hover:bg-slate-200");
  });

  it("uses the same shrinking flex wrapper when tab tooltips are enabled", () => {
    const { container } = render(
      <TicketTab
        label="#99999991"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="A long ticket title"
        tooltip="Ticket details"
      />,
    );

    expect(screen.getByRole("tab", { name: "#99999991 A long ticket title" })
      .parentElement?.parentElement)
      .toHaveClass("min-w-16", "max-w-64", "flex-[1_1_0]");
    expect(container.querySelector(".ticket-tab-label")).toHaveClass(
      "min-w-0",
      "overflow-hidden",
    );
    expect(container.querySelector(".ticket-tab-number-full")).toHaveTextContent(
      "#99999991",
    );
    expect(container.querySelector(".ticket-tab-number-full")).not.toHaveClass(
      "truncate",
    );
    expect(container.querySelector(".ticket-tab-number-compressed")).toBeNull();
    expect(container.querySelector(".ticket-tab-title")).toHaveTextContent(
      "A long ticket title",
    );
    expect(container.querySelector(".ticket-tab-title-text")).toHaveClass(
      "truncate",
      "font-semibold",
    );
  });

  it("renders compressed ticket numbers with the final two digits preserved", () => {
    const { container } = render(
      <TicketTab
        compressNumber
        label="#99999991"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="A long ticket title"
      />,
    );

    expect(screen.getByRole("tab", { name: "#99999991 A long ticket title" }))
      .toBeInTheDocument();
    expect(container.querySelector(".ticket-tab-number-compressed"))
      .toHaveTextContent("#...91");
    expect(container.querySelector(".ticket-tab-number-full")).toBeNull();
  });

  it("shows the close affordance for active tabs", () => {
    render(
      <TicketTab
        active
        label="Ticket 104"
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close Ticket 104" }),
    ).toBeInTheDocument();
  });

  it("renders an optional accent line without changing the tab label color", () => {
    render(
      <TicketTab
        active
        accentClassName="text-indigo-600"
        icon={<span aria-hidden="true" />}
        label="Ticket 105"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Ticket 105" }).parentElement).toContainHTML(
      "background-color: currentcolor",
    );
    expect(screen.getByRole("tab", { name: "Ticket 105" }).parentElement).toContainHTML(
      "text-indigo-600",
    );
    expect(screen.getByRole("tab", { name: "Ticket 105" }).parentElement).toContainHTML(
      "bottom-0",
    );
    expect(screen.getByRole("tab", { name: "Ticket 105" }).parentElement).toContainHTML(
      "inset-x-0",
    );
  });

  it("uses a short lower-left marker for inactive accent lines", () => {
    render(
      <TicketTab
        accentClassName="text-rose-600"
        label="Ticket 106"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Ticket 106" }).parentElement).toContainHTML(
      "bottom-0.5",
    );
    expect(screen.getByRole("tab", { name: "Ticket 106" }).parentElement).toContainHTML(
      "left-2.5",
    );
    expect(screen.getByRole("tab", { name: "Ticket 106" }).parentElement).toContainHTML(
      "w-5",
    );
  });
});

describe("TableHeaderCell", () => {
  it("calls sort and keyboard resize callbacks only", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const onResizeStep = vi.fn();
    const onResizeStart = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell
              label="Updated"
              onResizeStart={onResizeStart}
              onResizeStep={onResizeStep}
              onSort={onSort}
              sortDirection="ascending"
            />
          </tr>
        </thead>
      </table>,
    );

    await user.click(screen.getByRole("button", { name: "Updated" }));
    const resize = screen.getByRole("button", { name: "Resize Updated column" });
    resize.focus();
    await user.keyboard("{ArrowRight}{Shift>}{ArrowLeft}{/Shift}");
    fireEvent.pointerDown(resize);

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onResizeStep).toHaveBeenNthCalledWith(1, 8);
    expect(onResizeStep).toHaveBeenNthCalledWith(2, -24);
    expect(onResizeStart).toHaveBeenCalledTimes(1);
  });
});
