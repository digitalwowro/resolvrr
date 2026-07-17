import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { loadPersistedCommunicationDrafts } from "@/features/workspace/components/ticket-communication-draft-persistence";
import {
  setCurrentCommunicationDraftPresence,
} from "@/features/workspace/components/ticket-communication-draft-runtime";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";

vi.mock("@/features/workspace/components/ticket-communication-draft-persistence", () => ({
  loadPersistedCommunicationDrafts: vi.fn(),
}));

const tab = (id: string): WorkspaceTicketTab => ({
  id,
  number: `#${id}`,
  title: `Ticket ${id}`,
  customer: "Customer",
  owner: "Agent",
  group: "Support",
  state: "Open",
  stateKey: "open",
  priority: "Normal",
  priorityKey: "medium",
});

function availableTaskbar() {
  return {
    status: "available" as const,
    activeSelectionReliable: true,
    initial: false,
    ticketExternalIds: ["2"],
    activeTicketExternalId: "2",
    unsynchronizedTicketExternalIds: [],
    pendingOpenTicketExternalIds: [],
    pendingCloseTicketExternalIds: [],
    activeNotSynchronized: false,
    orderNotSynchronized: false,
    synchronizedAt: new Date().toISOString(),
  };
}

describe("ticket taskbar draft protection", () => {
  it("adopts Zammad ordering while protecting a persisted local draft", async () => {
    vi.mocked(loadPersistedCommunicationDrafts).mockResolvedValue([{
      bodyHtml: "draft",
      expiresAt: Date.now() + 1000,
      id: "draft-1",
      scope: {
        userId: "user-1",
        workspaceId: "workspace-1",
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-1",
        ticketExternalId: "1",
      },
      suggestions: [],
      updatedAt: Date.now(),
    }]);
    const action = vi.fn().mockResolvedValue(availableTaskbar());
    const reconcile = vi.fn();

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab("1"), tab("2")],
        reconcileOpenTicketTabs: reconcile,
        scope: {
          userId: "user-1",
          workspaceId: "workspace-1",
          helpdeskConnectionId: "connection-1",
          identityVersion: "identity-1",
        },
        ticketTabs: [tab("1"), tab("2")],
      });
      return <span>{state.draftConflictIds.join(",")}</span>;
    }

    render(<Harness />);

    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(reconcile).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "2" })],
      ["1"],
      "2",
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("protects an in-memory draft before IndexedDB confirms its write", async () => {
    vi.mocked(loadPersistedCommunicationDrafts).mockResolvedValue([]);
    const scope = {
      userId: "user-in-memory",
      workspaceId: "workspace-in-memory",
      helpdeskConnectionId: "connection-in-memory",
      identityVersion: "identity-in-memory",
      ticketExternalId: "1",
    };
    setCurrentCommunicationDraftPresence(scope, true);
    const reconcile = vi.fn();
    const action = vi.fn().mockResolvedValue(availableTaskbar());

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab("1"), tab("2")],
        reconcileOpenTicketTabs: reconcile,
        scope: {
          userId: scope.userId,
          workspaceId: scope.workspaceId,
          helpdeskConnectionId: scope.helpdeskConnectionId,
          identityVersion: scope.identityVersion,
        },
        ticketTabs: [tab("1"), tab("2")],
      });
      return <span>{state.draftConflictIds.join(",")}</span>;
    }

    render(<Harness />);

    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(screen.getByText("1")).toBeInTheDocument();
    setCurrentCommunicationDraftPresence(scope, false);
  });
});
