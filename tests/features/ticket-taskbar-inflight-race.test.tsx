import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";
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

describe("ticket taskbar in-flight races", () => {
  it("does not apply a response superseded while it was in flight", async () => {
    let resolveFirst: ((value: typeof available) => void) | undefined;
    const reconcile = vi.fn();
    const action = vi.fn((request: {
      kind: string;
      ticketExternalId?: string;
    }) => {
      if (request.kind === "reconcile") return Promise.resolve(available);
      if (request.ticketExternalId === "1") {
        return new Promise<typeof available>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({
        ...available,
        ticketExternalIds: ["1", "2"],
        activeTicketExternalId: "2",
      });
    });
    const first = tab("1");
    const second = tab("2");

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [first, second],
        reconcileOpenTicketTabs: reconcile,
        scope: taskbarTestScope,
        ticketTabs: [first, second],
      });
      return (
        <>
          <button onClick={() => void state.activate("1")} type="button">
            Select first
          </button>
          <button onClick={() => void state.activate("2")} type="button">
            Select second
          </button>
        </>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    reconcile.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Select first" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "activate", ticketExternalId: "1" }),
    ));
    await userEvent.click(screen.getByRole("button", { name: "Select second" }));
    resolveFirst?.(available);

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "activate", ticketExternalId: "2" }),
    ));
    expect(reconcile).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "1",
    );
    expect(reconcile).toHaveBeenLastCalledWith(
      [expect.objectContaining({ id: "1" }), expect.objectContaining({ id: "2" })],
      [],
      "2",
    );
  });
});
