import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { taskbarTestScope } from "./ticket-taskbar-test-scope";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace direct URL taskbar precedence", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", `/workspace?ticket=${row.id}`);
  });

  it("activates the direct-link ticket before initial reconciliation", async () => {
    let remoteActiveTicketId = highRow.id;
    const synchronizeWorkspaceTaskbarAction = vi.fn(async (request: {
      kind: string;
      ticketExternalId?: string;
    }) => {
      if (request.kind === "activate" && request.ticketExternalId) {
        remoteActiveTicketId = request.ticketExternalId;
      }
      return {
        status: "available" as const,
        activeSelectionReliable: true,
        initial: request.kind === "reconcile",
        ticketExternalIds: [row.id, highRow.id],
        activeTicketExternalId: remoteActiveTicketId,
        unsynchronizedTicketExternalIds: [],
        pendingOpenTicketExternalIds: [],
        pendingCloseTicketExternalIds: [],
        activeNotSynchronized: false,
        orderNotSynchronized: false,
        synchronizedAt: "2026-07-20T00:00:00.000Z",
      };
    });
    const selectedDetail = detailPropsFor(row, "Direct-link ticket");
    const initialWorkspaceOpenTabsState = {
      activePane: highRow.id,
      openTabs: [highRow, row],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-07-20T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

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
        detail={selectedDetail.detail}
        detailResult={selectedDetail.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        loadTicketDetailAction={vi.fn()}
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
      expect(synchronizeWorkspaceTaskbarAction).toHaveBeenCalledTimes(2)
    );

    expect(synchronizeWorkspaceTaskbarAction.mock.calls.map(
      ([request]) => request.kind,
    )).toEqual(["activate", "reconcile"]);
    expect(screen.getByRole("tab", { name: /#1001/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Direct-link ticket")).toBeInTheDocument();
    expect(window.location.search).toBe(`?ticket=${row.id}`);
  });
});
