import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";
import { readPersistedCommunicationDraft } from "@/features/workspace/components/ticket-communication-draft-persistence";
import {
  WorkspaceCommunicationDraftProvider,
} from "@/features/workspace/components/workspace-communication-draft-context";
import {
  taskbarTestActionArgs,
  taskbarTestScope,
} from "./ticket-taskbar-test-scope";
import { detailPropsFor, row } from "./ticket-workspace-test-utils";

vi.mock(
  "@/features/workspace/components/ticket-communication-draft-persistence",
  async (importOriginal) => ({
    ...await importOriginal(),
    readPersistedCommunicationDraft: vi.fn(),
  }),
);

const ticketTab: WorkspaceTicketTab = {
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

describe("ticket taskbar synchronization races", () => {
  it("retains a synchronized active ticket beyond the local tab limit", async () => {
    const remoteTabs = Array.from({ length: 21 }, (_, index) => ({
      ...ticketTab,
      id: String(index + 1),
      number: `#${index + 1}`,
      title: `Ticket ${index + 1}`,
    }));
    const reconcile = vi.fn();
    const action = vi.fn().mockResolvedValue({
      ...available,
      ticketExternalIds: remoteTabs.map((tab) => tab.id),
      activeTicketExternalId: "21",
    });

    function Harness() {
      useTicketTaskbarSync({
        action,
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [],
        reconcileOpenTicketTabs: reconcile,
        scope: taskbarTestScope,
        ticketTabs: remoteTabs,
      });
      return null;
    }

    render(<Harness />);

    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    const synchronizedTabs = reconcile.mock.calls[0]?.[0] as WorkspaceTicketTab[];
    expect(synchronizedTabs).toHaveLength(20);
    expect(synchronizedTabs.at(-1)?.id).toBe("21");
    expect(reconcile.mock.calls[0]?.[2]).toBe("21");
  });

  it("retains and retries a non-retryable provider-rejected selection on focus", async () => {
    let activationAttempts = 0;
    const action = vi.fn(async (request: { kind: string }) => {
      if (request.kind !== "activate") return available;
      activationAttempts += 1;
      if (activationAttempts > 1) return available;
      return {
        status: "unavailable" as const,
        reason: "provider-auth-failed" as const,
        retryable: false,
        unsynchronizedTicketExternalIds: [],
        pendingOpenTicketExternalIds: [],
        pendingCloseTicketExternalIds: [],
        activeNotSynchronized: false,
        orderNotSynchronized: false,
      };
    });

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [ticketTab],
        reconcileOpenTicketTabs: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [ticketTab],
      });
      return (
        <>
          <button onClick={() => void state.activate("1")} type="button">
            Activate
          </button>
          <span>{state.selectionUnsynchronized ? "Pending" : "Synchronized"}</span>
        </>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    await userEvent.click(screen.getByRole("button", { name: "Activate" }));
    expect(await screen.findByText("Pending")).toBeInTheDocument();

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(activationAttempts).toBe(2));
    await waitFor(() => expect(screen.getByText("Synchronized")).toBeInTheDocument());
  });

  it("coalesces repeated focus reconciliation requests", async () => {
    const action = vi.fn().mockResolvedValue(available);

    function Harness() {
      useTicketTaskbarSync({
        action,
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [ticketTab],
        reconcileOpenTicketTabs: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [ticketTab],
      });
      return null;
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    action.mockClear();

    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("does not apply an old remote close after a newer local action", async () => {
    let resolveDraftCheck: (() => void) | undefined;
    vi.mocked(readPersistedCommunicationDraft).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveDraftCheck = () => resolve({
          status: "available",
          value: undefined,
        });
      }),
    );
    const reconcile = vi.fn();
    const action = vi.fn(async (request: { kind: string }) =>
      request.kind === "reconcile"
        ? { ...available, ticketExternalIds: [], activeTicketExternalId: undefined }
        : available
    );

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [ticketTab],
        reconcileOpenTicketTabs: reconcile,
        scope: {
          userId: "user-1",
          workspaceId: "workspace-1",
          helpdeskConnectionId: "connection-1",
          identityVersion: "identity-1",
        },
        ticketTabs: [ticketTab],
      });
      return (
        <button onClick={() => void state.activate("1")} type="button">
          Keep ticket active
        </button>
      );
    }

    render(
      <WorkspaceCommunicationDraftProvider scope={taskbarTestScope}>
        <Harness />
      </WorkspaceCommunicationDraftProvider>,
    );
    await waitFor(() => expect(readPersistedCommunicationDraft).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Keep ticket active" }));
    resolveDraftCheck?.();

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      { kind: "activate", ticketExternalId: "1" },
      "connection-1",
      "identity-1",
    ));
    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(reconcile).not.toHaveBeenCalledWith([], expect.anything(), expect.anything());
    expect(reconcile).toHaveBeenLastCalledWith(
      [expect.objectContaining({ id: "1" })],
      [],
      "1",
    );
  });

  it("sends only the latest rapid selection", async () => {
    const secondTab = { ...ticketTab, id: "2", number: "#2", title: "Ticket 2" };
    const action = vi.fn(async (request: { kind: string; ticketExternalId?: string }) => ({
      ...available,
      ticketExternalIds: ["1", "2"],
      activeTicketExternalId: request.ticketExternalId ?? "1",
    }));

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [ticketTab, secondTab],
        reconcileOpenTicketTabs: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [ticketTab, secondTab],
      });
      return (
        <button
          onClick={() => {
            void state.activate("1");
            void state.activate("2");
          }}
          type="button"
        >
          Select latest
        </button>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    action.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Select latest" }));

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "activate", ticketExternalId: "2" }),
    ));
    expect(action).not.toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "activate", ticketExternalId: "1" }),
    );
  });

  it("ignores a recent close echo and freshly hydrates a later remote reopen", async () => {
    let now = Date.parse("2026-07-21T12:00:00.000Z");
    const dateNow = vi.spyOn(Date, "now").mockImplementation(() => now);
    let closeAttempted = false;
    const action = vi.fn(async (request: { kind: string }) => {
      if (request.kind === "close") {
        closeAttempted = true;
        return {
          ...available,
          ticketExternalIds: [],
          activeTicketExternalId: undefined,
        };
      }
      return closeAttempted ? available : available;
    });
    const closedDetail = detailPropsFor({
      ...row,
      id: "1",
      number: "#1",
      title: "Ticket 1",
      state: "Closed",
      stateKey: "closed",
    });
    const loadTicketDetailAction = vi.fn(async () => closedDetail.detailResult);
    const reconcile = vi.fn();

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction,
        openTicketTabs: [ticketTab],
        reconcileOpenTicketTabs: reconcile,
        scope: taskbarTestScope,
        ticketTabs: [ticketTab],
      });
      return (
        <button onClick={() => void state.close("1")} type="button">
          Close ticket
        </button>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    await userEvent.click(screen.getByRole("button", { name: "Close ticket" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "close", ticketExternalId: "1" }),
    ));

    reconcile.mockClear();
    loadTicketDetailAction.mockClear();
    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(reconcile).toHaveBeenLastCalledWith([], [], undefined);
    expect(loadTicketDetailAction).not.toHaveBeenCalled();

    now += 10_001;
    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(loadTicketDetailAction).toHaveBeenCalledWith("1"));
    expect(reconcile).toHaveBeenLastCalledWith(
      [expect.objectContaining({ id: "1", stateKey: "closed" })],
      [],
      "1",
    );
    dateNow.mockRestore();
  });

});
