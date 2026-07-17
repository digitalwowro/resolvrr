import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";
import { taskbarTestScope } from "./ticket-taskbar-test-scope";

const tab: WorkspaceTicketTab = {
  id: "1",
  number: "#1",
  title: "Ticket 1",
  customer: "Customer",
  owner: "Agent",
  group: "Support",
  state: "Open",
  stateKey: "open",
  priority: "Normal",
  priorityKey: "medium",
};

const available = {
  status: "available" as const,
  activeSelectionReliable: true,
  initial: false,
  ticketExternalIds: ["1"],
  activeTicketExternalId: "1",
  unsynchronizedTicketExternalIds: [],
  pendingOpenTicketExternalIds: [],
  pendingCloseTicketExternalIds: [],
  activeNotSynchronized: false,
  orderNotSynchronized: false,
  synchronizedAt: "2026-07-17T00:00:00.000Z",
};

describe("ticket taskbar synchronization scope", () => {
  it("does not poll or send actions without a complete personal scope", async () => {
    const action = vi.fn().mockResolvedValue(available);

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab],
        reconcileOpenTicketTabs: vi.fn(),
        ticketTabs: [tab],
      });
      return (
        <button onClick={() => void state.activate("1")} type="button">
          Activate
        </button>
      );
    }

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Activate" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(action).not.toHaveBeenCalled();
  });

  it("keeps the local selection without a reliable Zammad active ticket", async () => {
    const reconcile = vi.fn();
    const action = vi.fn().mockResolvedValue({
      ...available,
      activeSelectionReliable: false,
      activeTicketExternalId: undefined,
    });

    function Harness() {
      useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab],
        reconcileOpenTicketTabs: reconcile,
        scope: taskbarTestScope,
        ticketTabs: [tab],
      });
      return null;
    }

    render(<Harness />);

    await waitFor(() => expect(reconcile).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "1" })],
      [],
      undefined,
    ));
  });

  it("binds a queued action to the connection that originated it", async () => {
    let resolveInitial: ((result: typeof available) => void) | undefined;
    const action = vi.fn((request: { kind: string }) =>
      request.kind === "reconcile"
      ? new Promise<typeof available>((resolve) => { resolveInitial = resolve; })
      : Promise.resolve(available)
    );

    function Harness({ connectionId }: { connectionId: string }) {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab],
        reconcileOpenTicketTabs: vi.fn(),
        scope: {
          userId: "user-1",
          workspaceId: `workspace-${connectionId}`,
          helpdeskConnectionId: connectionId,
          identityVersion: "identity-1",
        },
        ticketTabs: [tab],
      });
      return (
        <button onClick={() => void state.activate("1")} type="button">
          Activate
        </button>
      );
    }

    const view = render(<Harness connectionId="connection-1" />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      { kind: "reconcile" },
      "connection-1",
      "identity-1",
    ));
    await userEvent.click(screen.getByRole("button", { name: "Activate" }));
    view.rerender(<Harness connectionId="connection-2" />);
    resolveInitial?.(available);

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      { kind: "activate", ticketExternalId: "1" },
      "connection-1",
      "identity-1",
    ));
  });

  it("does not apply an old connection response after the scope changes", async () => {
    let resolveOldReconcile: ((result: typeof available) => void) | undefined;
    const reconcile = vi.fn();
    const action = vi.fn((
      request: { kind: string },
      connectionId?: string,
    ) => {
      if (request.kind === "reconcile" && connectionId === "connection-1") {
        return new Promise<typeof available>((resolve) => {
          resolveOldReconcile = resolve;
        });
      }
      return Promise.resolve(available);
    });

    function Harness({ connectionId }: { connectionId: string }) {
      useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab],
        reconcileOpenTicketTabs: reconcile,
        scope: {
          userId: "user-1",
          workspaceId: `workspace-${connectionId}`,
          helpdeskConnectionId: connectionId,
          identityVersion: "identity-1",
        },
        ticketTabs: [tab],
      });
      return null;
    }

    const view = render(<Harness connectionId="connection-1" />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      { kind: "reconcile" },
      "connection-1",
      "identity-1",
    ));

    view.rerender(<Harness connectionId="connection-2" />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      { kind: "reconcile" },
      "connection-2",
      "identity-1",
    ));
    await waitFor(() => expect(reconcile).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveOldReconcile?.(available);
    });
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});
