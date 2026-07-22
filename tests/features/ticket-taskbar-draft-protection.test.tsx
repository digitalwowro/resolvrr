import { render, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import {
  WorkspaceCommunicationDraftProvider,
  useWorkspaceCommunicationDraftController,
} from "@/features/workspace/components/workspace-communication-draft-context";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";

const persistence = vi.hoisted(() => ({
  clearPersistedCommunicationDrafts: vi.fn(),
  putPersistedCommunicationDraft: vi.fn(),
  readPersistedCommunicationDraft: vi.fn(),
}));

vi.mock(
  "@/features/workspace/components/ticket-communication-draft-persistence",
  async (importOriginal) => ({
    ...await importOriginal(),
    ...persistence,
  }),
);

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

beforeEach(() => {
  persistence.clearPersistedCommunicationDrafts.mockResolvedValue({
    status: "available",
    value: undefined,
  });
  persistence.putPersistedCommunicationDraft.mockResolvedValue({
    status: "available",
    value: undefined,
  });
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
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: {
      bodyHtml: "draft",
      expiresAt: Date.now() + 1000,
      id: "draft-1",
      localRevision: 1,
      kind: "internal-comment",
      scope: {
        userId: "user-1",
        workspaceId: "workspace-1",
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-1",
        ticketExternalId: "1",
      },
      suggestions: [],
      updatedAt: Date.now(),
      },
    });
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

    render(
      <WorkspaceCommunicationDraftProvider
        scope={{
          userId: "user-1",
          workspaceId: "workspace-1",
          helpdeskConnectionId: "connection-1",
          identityVersion: "identity-1",
        }}
      >
        <Harness />
      </WorkspaceCommunicationDraftProvider>,
    );

    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(reconcile).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "2" })],
      ["1"],
      "2",
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("protects an in-memory draft before IndexedDB confirms its write", async () => {
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: undefined,
    });
    const scope = {
      userId: "user-in-memory",
      workspaceId: "workspace-in-memory",
      helpdeskConnectionId: "connection-in-memory",
      identityVersion: "identity-in-memory",
      ticketExternalId: "1",
    };
    const reconcile = vi.fn();
    const action = vi.fn().mockResolvedValue(availableTaskbar());

    function Harness() {
      const controller = useWorkspaceCommunicationDraftController();
      useLayoutEffect(() => {
        controller?.save({
          bodyHtml: "<p>In-memory draft</p>",
          kind: "internal-comment",
          scope,
          suggestions: [],
        });
      }, [controller]);
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

    render(
      <WorkspaceCommunicationDraftProvider
        scope={{
          userId: scope.userId,
          workspaceId: scope.workspaceId,
          helpdeskConnectionId: scope.helpdeskConnectionId,
          identityVersion: scope.identityVersion,
        }}
      >
        <Harness />
      </WorkspaceCommunicationDraftProvider>,
    );

    await waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
