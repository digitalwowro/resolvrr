import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  workspaceOpenTabsStateVersion,
  type SaveWorkspaceOpenTabsStateAction,
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

const thirdRow = {
  ...row,
  id: "ticket-3",
  number: "#1003",
  title: "Billing problem",
  customer: "Riley Stone",
} satisfies typeof row;

function domRect({
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

function mockElementRect(element: Element | null, rect: DOMRect) {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected an HTMLElement to mock a tab rect.");
  }
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);
}

describe("TicketWorkspace horizontal tabs", () => {
  beforeEach(() => {
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace?ticket=ticket-1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("persists tab state changes to the save action", async () => {
    const user = userEvent.setup();
    const saveWorkspaceOpenTabsStateAction = vi.fn<
      SaveWorkspaceOpenTabsStateAction
    >(async () => undefined);
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
        saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenCalled(),
    );
    saveWorkspaceOpenTabsStateAction.mockClear();

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          activePane: "list",
          openTabs: [expect.objectContaining({ id: "ticket-1" })],
        }),
      ),
    );

    await user.click(screen.getByRole("tab", { name: /#1001/u }));
    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          activePane: "ticket-1",
          openTabs: [expect.objectContaining({ id: "ticket-1" })],
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));
    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          activePane: "ticket-1",
          tabOrientation: "vertical",
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Close #1001" }));
    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          activePane: "list",
          openTabs: [],
        }),
      ),
    );
  });

  it("reorders horizontal ticket tabs with drag and persists the new order", async () => {
    const saveWorkspaceOpenTabsStateAction = vi.fn<
      SaveWorkspaceOpenTabsStateAction
    >(async () => undefined);
    const loadTicketDetailAction = vi.fn(
      () => new Promise<WorkspaceTicketDetailLoadResult>(() => undefined),
    );
    const detailProps = selectedDetailProps();
    const initialWorkspaceOpenTabsState = {
      activePane: "ticket-1",
      openTabs: [row, highRow],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenCalled(),
    );
    saveWorkspaceOpenTabsStateAction.mockClear();

    const firstTab = screen.getByRole("tab", { name: /#1001/u });
    const secondTab = screen.getByRole("tab", { name: /#1002/u });
    mockElementRect(
      firstTab.parentElement,
      domRect({ height: 36, left: 100, top: 0, width: 100 }),
    );
    mockElementRect(
      secondTab.parentElement,
      domRect({ height: 36, left: 208, top: 0, width: 100 }),
    );

    fireEvent.pointerDown(firstTab, {
      button: 0,
      clientX: 150,
      clientY: 18,
      pointerId: 1,
    });
    fireEvent.pointerMove(firstTab.parentElement as HTMLElement, {
      clientX: 280,
      clientY: 18,
      pointerId: 1,
    });
    fireEvent.pointerUp(firstTab.parentElement as HTMLElement, {
      clientX: 280,
      clientY: 18,
      pointerId: 1,
    });

    await waitFor(() =>
      expect(screen.getAllByRole("tab")[1]).toHaveTextContent("#1002"),
    );
    expect(screen.getAllByRole("tab")[2]).toHaveTextContent("#1001");
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(saveWorkspaceOpenTabsStateAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          activePane: "ticket-1",
          openTabs: [
            expect.objectContaining({ id: "ticket-2" }),
            expect.objectContaining({ id: "ticket-1" }),
          ],
        }),
      ),
    );
  });

  it("supports keyboard tab reordering while keeping List fixed", async () => {
    const user = userEvent.setup();
    const initialWorkspaceOpenTabsState = {
      activePane: "list",
      openTabs: [row, highRow, thirdRow],
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
        rows={[row, highRow, thirdRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }, { ...thirdRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    screen.getByRole("tab", { name: /#1001/u }).focus();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");

    const renderedTabs = screen.getAllByRole("tab");
    expect(renderedTabs[0]).toHaveAccessibleName("Return to list: All tickets");
    expect(renderedTabs[1]).toHaveTextContent("#1002");
    expect(renderedTabs[2]).toHaveTextContent("#1001");
    expect(screen.getByText("Moved #1001 after #1002.")).toBeInTheDocument();
  });

  it("keeps horizontal tab clicks working after small pointer jitter", () => {
    const initialWorkspaceOpenTabsState = {
      activePane: "list",
      openTabs: [row, highRow],
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
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const firstTab = screen.getByRole("tab", { name: /#1001/u });
    const secondTab = screen.getByRole("tab", { name: /#1002/u });
    mockElementRect(
      firstTab.parentElement,
      domRect({ height: 36, left: 100, top: 0, width: 100 }),
    );
    mockElementRect(
      secondTab.parentElement,
      domRect({ height: 36, left: 208, top: 0, width: 100 }),
    );

    fireEvent.pointerDown(firstTab, {
      button: 0,
      clientX: 150,
      clientY: 18,
      pointerId: 3,
    });
    fireEvent.pointerMove(firstTab.parentElement as HTMLElement, {
      clientX: 156,
      clientY: 18,
      pointerId: 3,
    });
    fireEvent.pointerUp(firstTab.parentElement as HTMLElement, {
      clientX: 156,
      clientY: 18,
      pointerId: 3,
    });
    fireEvent.click(firstTab);

    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
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

  it("caps full ticket tab width and keeps the close button visible", () => {
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

    expect(ticketTab.parentElement).toHaveClass("max-w-sm");
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
