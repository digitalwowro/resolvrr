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
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace vertical tab cached detail", () => {
  beforeEach(() => {
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace?ticket=ticket-1");
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
        updateTicketMetadataAction={noopMutationAction}
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
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));
    const replaceState = vi.spyOn(window.history, "replaceState");
    routerPush.mockClear();

    await user.click(screen.getByRole("tab", { name: /Cannot log in/u }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-1",
    );
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(screen.getByText("First vertical thread")).toBeInTheDocument();
    expect(screen.queryByText("Select a ticket to load its thread."))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Webhook failed/u }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-2",
    );
    expect(screen.getByLabelText("Ticket detail #1002")).toBeInTheDocument();
    expect(screen.getByText("Second vertical thread")).toBeInTheDocument();
  });
});
