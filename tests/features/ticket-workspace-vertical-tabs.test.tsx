import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  detailPropsFor,
  highRow,
  noopAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("TicketWorkspace vertical tabs", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it("keeps ticket tabs open across List and orientation switches", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));
    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Cannot log in/u })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Horizontal tabs" }));

    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1001/u }));

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
  });

  it("appends ticket tabs when opening another ticket from List", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));
    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(screen.getByRole("tab", { name: /Cannot log in/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Webhook failed/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("reactivates older ticket tabs and shows their cached detail", async () => {
    const user = userEvent.setup();
    const detailA = detailPropsFor(row, "First vertical thread");
    const detailB = detailPropsFor(highRow, "Second vertical thread");
    const { rerender } = render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailA.detail}
        detailResult={detailA.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    rerender(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailB.detail}
        detailResult={detailB.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-2"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));
    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("tab", { name: /Cannot log in/u }));

    expect(routerPush).toHaveBeenCalledWith("/workspace?ticket=ticket-1");
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(screen.getByText("First vertical thread")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a ticket to load its thread."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Webhook failed/u }));

    expect(screen.getByLabelText("Ticket detail #1002")).toBeInTheDocument();
    expect(screen.getByText("Second vertical thread")).toBeInTheDocument();
  });
});
