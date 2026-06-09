import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  workspaceOpenTabsStateVersion,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import {
  availableList,
  detailPropsFor,
  highRow,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace horizontal tabs", () => {
  beforeEach(() => {
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace?ticket=ticket-1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to List when a saved active ticket is no longer open", () => {
    const initialWorkspaceOpenTabsState = {
      activePane: "missing-ticket",
      openTabs: [row],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Return to list: All tickets" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("caps fluid ticket tabs and keeps the close button visible", () => {
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
        tabs={[
          {
            ...row,
            title:
              "Cannot log in after password reset from the customer portal with a very long browser session title",
          },
        ]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const ticketTab = screen.getByRole("tab", { name: /#1001/u });

    expect(ticketTab.parentElement).toHaveClass(
      "min-w-16",
      "max-w-64",
      "flex-[1_1_0]",
    );
    expect(ticketTab.parentElement).not.toHaveClass("max-w-48");
    expect(ticketTab.querySelector(".truncate")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Close #1001" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Return to list: All tickets" }).parentElement,
    ).not.toHaveClass("max-w-sm");
  });

  it("appends ticket tabs when opening another ticket from List", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const loadTicketDetailAction = vi.fn(
      () => new Promise<WorkspaceTicketDetailLoadResult>(() => undefined),
    );
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
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

    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-2",
    );
    expect(screen.getByLabelText("Ticket detail #1002")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading ticket thread" }))
      .toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-2");

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(screen.getAllByRole("tab", { name: /#1002/u })).toHaveLength(1);
    expect(loadTicketDetailAction).toHaveBeenCalledOnce();
  });

  it("reactivates older ticket tabs with replaceState and shows their cached detail", async () => {
    const user = userEvent.setup();
    const detailA = detailPropsFor(row, "First ticket thread");
    const detailB = detailPropsFor(highRow, "Second ticket thread");
    const loadTicketDetailAction = vi.fn(async () => detailB.detailResult);
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailA.detail}
        detailResult={detailA.detailResult}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
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

    expect(routerPush).not.toHaveBeenCalled();
    await screen.findByText("Second ticket thread");

    routerPush.mockClear();
    const replaceState = vi.spyOn(window.history, "replaceState");
    const historyLength = window.history.length;

    await user.click(screen.getByRole("tab", { name: /#1001/u }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-1",
    );
    expect(window.history.length).toBe(historyLength);
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(screen.getByText("First ticket thread")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a ticket to load its thread."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-2",
    );
    expect(window.history.length).toBe(historyLength);
    expect(screen.getByLabelText("Ticket detail #1002")).toBeInTheDocument();
    expect(screen.getByText("Second ticket thread")).toBeInTheDocument();
    await waitFor(() => expect(loadTicketDetailAction).toHaveBeenCalledOnce());
  });
});
