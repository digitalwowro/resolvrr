import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  highRow,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";
import {
  domRect,
  mockElementRect,
  thirdRow,
} from "./ticket-workspace-horizontal-tabs-helpers";

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
});
