import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
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
} from "./ticket-workspace-test-utils";
import {
  taskbarTestActionArgs,
  taskbarTestScope,
} from "./ticket-taskbar-test-scope";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace horizontal tab clicks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("activates an existing tab without bouncing", async () => {
    const initialWorkspaceOpenTabsState = {
      activePane: row.id,
      openTabs: [row, highRow],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-07-16T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;
    const firstDetail = detailPropsFor(row);
    const secondDetail = detailPropsFor(highRow);
    const synchronizeWorkspaceTaskbarAction = vi.fn(async (
      request: { kind: string; ticketExternalId?: string },
    ) => ({
      status: "available" as const,
      activeSelectionReliable: true,
      initial: request.kind === "reconcile",
      ticketExternalIds: [row.id, highRow.id],
      activeTicketExternalId:
        request.kind === "activate" ? request.ticketExternalId : row.id,
      unsynchronizedTicketExternalIds: [],
      pendingOpenTicketExternalIds: [],
      pendingCloseTicketExternalIds: [],
      activeNotSynchronized: false,
      orderNotSynchronized: false,
      synchronizedAt: "2026-07-16T00:00:00.000Z",
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          id: taskbarTestScope.workspaceId,
          connectionId: taskbarTestScope.helpdeskConnectionId,
          identityVersion: taskbarTestScope.identityVersion,
          label: "Support",
          active: true,
        }]}
        detail={firstDetail.detail}
        detailResult={firstDetail.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        loadTicketDetailAction={async () => secondDetail.detailResult}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId={row.id}
        setActiveConnectionAction={noopAction}
        synchronizeWorkspaceTaskbarAction={synchronizeWorkspaceTaskbarAction}
        tabs={[row, highRow]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
        userId={taskbarTestScope.userId}
      />,
    );

    await waitFor(() =>
      expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
        ...taskbarTestActionArgs({ kind: "reconcile" }),
      ),
    );
    synchronizeWorkspaceTaskbarAction.mockClear();

    fireEvent.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
        ...taskbarTestActionArgs({
          kind: "activate",
          ticketExternalId: highRow.id,
        }),
      ),
    );
    expect(synchronizeWorkspaceTaskbarAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "open" }),
    );
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps List selected after focus reconciliation", async () => {
    let activeTicketId: string | undefined = row.id;
    const synchronizeWorkspaceTaskbarAction = vi.fn(async (
      request: { kind: string; ticketExternalId?: string },
    ) => {
      if (request.kind === "deactivate") activeTicketId = undefined;
      if (request.kind === "activate") activeTicketId = request.ticketExternalId;
      return {
        status: "available" as const,
        activeSelectionReliable: true,
        initial: request.kind === "reconcile",
        ticketExternalIds: [row.id, highRow.id],
        ...(activeTicketId ? { activeTicketExternalId: activeTicketId } : {}),
        unsynchronizedTicketExternalIds: [],
        pendingOpenTicketExternalIds: [],
        pendingCloseTicketExternalIds: [],
        activeNotSynchronized: false,
        orderNotSynchronized: false,
        synchronizedAt: "2026-07-17T00:00:00.000Z",
      };
    });
    const detail = detailPropsFor(row);
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          id: taskbarTestScope.workspaceId,
          connectionId: taskbarTestScope.helpdeskConnectionId,
          identityVersion: taskbarTestScope.identityVersion,
          label: "Support",
          active: true,
        }]}
        detail={detail.detail}
        detailResult={detail.detailResult}
        initialWorkspaceOpenTabsState={{
          activePane: row.id, openTabs: [row, highRow], recentTabs: [],
          tabOrientation: "horizontal", updatedAt: "2026-07-17T00:00:00.000Z",
          version: workspaceOpenTabsStateVersion,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId={row.id}
        setActiveConnectionAction={noopAction}
        synchronizeWorkspaceTaskbarAction={synchronizeWorkspaceTaskbarAction}
        tabs={[row, highRow]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
        userId={taskbarTestScope.userId}
      />,
    );
    await waitFor(() => expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    synchronizeWorkspaceTaskbarAction.mockClear();

    fireEvent.click(screen.getByRole("tab", { name: /Return to list/u }));
    expect(screen.getByRole("tab", { name: /Return to list/u })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "deactivate" }),
    ));

    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    expect(screen.getByRole("tab", { name: /Return to list/u })).toHaveAttribute("aria-selected", "true");
  });

  it("synchronizes the successor after closing the active tab", async () => {
    let remoteTicketIds = [row.id, highRow.id];
    let activeTicketId: string | undefined = row.id;
    const synchronizeWorkspaceTaskbarAction = vi.fn(async (request: {
      kind: string;
      ticketExternalId?: string;
    }) => {
      if (request.kind === "close" && request.ticketExternalId) {
        remoteTicketIds = remoteTicketIds.filter((id) => id !== request.ticketExternalId);
        if (activeTicketId === request.ticketExternalId) activeTicketId = undefined;
      }
      if (
        request.kind === "open" &&
        request.ticketExternalId &&
        !remoteTicketIds.includes(request.ticketExternalId)
      ) {
        remoteTicketIds.push(request.ticketExternalId);
      }
      if (request.kind === "activate") activeTicketId = request.ticketExternalId;
      return {
        status: "available" as const,
        activeSelectionReliable: true,
        initial: request.kind === "reconcile",
        ticketExternalIds: remoteTicketIds,
        ...(activeTicketId ? { activeTicketExternalId: activeTicketId } : {}),
        unsynchronizedTicketExternalIds: [],
        pendingOpenTicketExternalIds: [],
        pendingCloseTicketExternalIds: [],
        activeNotSynchronized: false,
        orderNotSynchronized: false,
        synchronizedAt: "2026-07-17T00:00:00.000Z",
      };
    });
    const firstDetail = detailPropsFor(row);
    const secondDetail = detailPropsFor(highRow);
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          id: taskbarTestScope.workspaceId,
          connectionId: taskbarTestScope.helpdeskConnectionId,
          identityVersion: taskbarTestScope.identityVersion,
          label: "Support",
          active: true,
        }]}
        detail={firstDetail.detail}
        detailResult={firstDetail.detailResult}
        initialWorkspaceOpenTabsState={{
          activePane: row.id, openTabs: [row, highRow], recentTabs: [],
          tabOrientation: "horizontal", updatedAt: "2026-07-17T00:00:00.000Z",
          version: workspaceOpenTabsStateVersion,
        }}
        listResult={availableList}
        loadTicketDetailAction={async () => secondDetail.detailResult}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId={row.id}
        setActiveConnectionAction={noopAction}
        synchronizeWorkspaceTaskbarAction={synchronizeWorkspaceTaskbarAction}
        tabs={[row, highRow]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
        userId={taskbarTestScope.userId}
      />,
    );
    await waitFor(() => expect(synchronizeWorkspaceTaskbarAction)
      .toHaveBeenCalledWith(...taskbarTestActionArgs({ kind: "reconcile" })));
    synchronizeWorkspaceTaskbarAction.mockClear();

    fireEvent.click(screen.getByRole("button", { name: `Close ${row.number}` }));

    await waitFor(() => expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "close", ticketExternalId: row.id }),
    ));
    expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({
        kind: "activate",
        ticketExternalId: highRow.id,
      }),
    );
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute("aria-selected", "true");
  });
});
