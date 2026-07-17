import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { useSynchronizedTicketWorkspaceActions } from "@/features/workspace/components/use-synchronized-ticket-workspace-actions";
import {
  taskbarTestActionArgs,
  taskbarTestScope,
} from "./ticket-taskbar-test-scope";

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

describe("synchronized ticket workspace actions", () => {
  it("preserves every rapid open while sending only the latest activation", async () => {
    const providerIds: string[] = [];
    let activeTicketExternalId: string | undefined;
    const action = vi.fn(async (request: {
      kind: string;
      ticketExternalId?: string;
    }) => {
      if (
        (request.kind === "open" || request.kind === "activate") &&
        request.ticketExternalId &&
        !providerIds.includes(request.ticketExternalId)
      ) {
        providerIds.push(request.ticketExternalId);
      }
      if (request.kind === "activate") {
        activeTicketExternalId = request.ticketExternalId;
      }
      return {
        status: "available" as const,
        activeSelectionReliable: Boolean(activeTicketExternalId),
        initial: false,
        ticketExternalIds: providerIds,
        ...(activeTicketExternalId ? { activeTicketExternalId } : {}),
        unsynchronizedTicketExternalIds: [],
        pendingOpenTicketExternalIds: [],
        pendingCloseTicketExternalIds: [],
        activeNotSynchronized: false,
        orderNotSynchronized: false,
        synchronizedAt: new Date().toISOString(),
      };
    });
    const second = tab("2");
    const third = tab("3");
    const displayState = {
      activeTicketId: undefined,
      openTicketTabs: [],
      reconcileOpenTicketTabs: vi.fn(),
      showTicketFromRow: vi.fn(),
    };

    function Harness() {
      const synchronized = useSynchronizedTicketWorkspaceActions({
        action,
        displayState: displayState as never,
        loadTicketDetailAction: vi.fn(),
        onExplicitClose: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [second, third],
      });
      return (
        <button
          onClick={() => {
            synchronized.displayState.showTicketFromRow("2");
            synchronized.displayState.showTicketFromRow("3");
          }}
          type="button"
        >
          Open both
        </button>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    action.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Open both" }));

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "activate", ticketExternalId: "3" }),
    ));
    expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "open", ticketExternalId: "2" }),
    );
    expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "open", ticketExternalId: "3" }),
    );
    expect(action).not.toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "activate", ticketExternalId: "2" }),
    );
  });
});
