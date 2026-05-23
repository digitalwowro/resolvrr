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

  it("keeps icon-only ticket tabs closeable from keyboard", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TicketTab
        density="icon"
        label="Ticket 102"
        onClose={onClose}
        onSelect={vi.fn()}
      />,
    );

    screen.getByRole("tab", { name: "Ticket 102" }).focus();
    await user.keyboard("{Delete}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps inactive icon-only tabs selectable without showing close", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <TicketTab
        density="icon"
        label="Ticket 103"
        onClose={onClose}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Ticket 103" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Close Ticket 103" }),
    ).not.toBeInTheDocument();
  });

  it("shows the close affordance for active icon-only tabs", () => {
    render(
      <TicketTab
        active
        density="icon"
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
      "opacity-100",
    );
  });

  it("tones down inactive accent lines", () => {
    render(
      <TicketTab
        accentClassName="text-rose-600"
        label="Ticket 106"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Ticket 106" }).parentElement).toContainHTML(
      "opacity-40",
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
