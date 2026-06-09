import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  shouldCompressHorizontalTicketNumbers,
} from "@/features/workspace/components/ticket-tabs/horizontal-ticket-tabs";
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

  it("compresses every ticket number when the row cannot fit one full number", () => {
    const tabs = [
      { ...row, number: "#99999991" },
      { ...highRow, number: "#99999992" },
    ];

    expect(shouldCompressHorizontalTicketNumbers({
      tabs,
      ticketTabsRowWidth: 252,
    })).toBe(false);
    expect(shouldCompressHorizontalTicketNumbers({
      tabs,
      ticketTabsRowWidth: 251,
    })).toBe(true);
    expect(shouldCompressHorizontalTicketNumbers({
      fullNumberLabelWidth: 80,
      tabs,
      ticketTabsRowWidth: 268,
    })).toBe(false);
    expect(shouldCompressHorizontalTicketNumbers({
      fullNumberLabelWidth: 80,
      tabs,
      ticketTabsRowWidth: 267,
    })).toBe(true);
  });

  it("keeps ticket tabs open when switching to List and updates the URL locally", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
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
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");

    await user.click(screen.getByRole("tab", { name: /#1001/u }));

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-1",
    );

    await user.click(screen.getByRole("button", { name: "Close #1001" }));

    expect(screen.queryByRole("tab", { name: /#1001/u })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");
  });

  it("restores saved open tabs with List active", () => {
    const initialWorkspaceOpenTabsState = {
      activePane: "list",
      openTabs: [row, highRow],
      recentTabs: [highRow, row],
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
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1002/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Return to list: All tickets" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("merges a direct linked ticket into saved tabs and activates it", () => {
    const detail = detailPropsFor(highRow);
    const initialWorkspaceOpenTabsState = {
      activePane: "ticket-1",
      openTabs: [row],
      recentTabs: [row],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detail.detail}
        detailResult={detail.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-2"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveTextContent("#1002");
    expect(tabs[2]).toHaveTextContent("#1001");
    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const selectedDetail = screen.getByLabelText("Ticket detail #1002");
    expect(selectedDetail).toBeInTheDocument();
    expect(within(selectedDetail).getByText("Webhook failed")).toBeInTheDocument();
  });

  it("activates an already-open direct linked ticket without reordering tabs", () => {
    const detail = detailPropsFor(highRow);
    const initialWorkspaceOpenTabsState = {
      activePane: "ticket-1",
      openTabs: [row, highRow],
      recentTabs: [row, highRow],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detail.detail}
        detailResult={detail.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
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

    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveTextContent("#1001");
    expect(tabs[2]).toHaveTextContent("#1002");
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
