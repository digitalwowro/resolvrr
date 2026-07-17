import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";
import {
  reconciledTicketTabs,
  ticketTabsWithOpenedTicket,
} from "@/features/workspace/components/ticket-workspace-tab-reconciliation";
import { loadPersistedCommunicationDrafts } from "@/features/workspace/components/ticket-communication-draft-persistence";
import {
  taskbarTestActionArgs,
  taskbarTestScope,
} from "./ticket-taskbar-test-scope";

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

describe("ticket taskbar reconciliation", () => {
  it("reuses unchanged tab state", () => {
    const current = [tab("1"), tab("2")];

    expect(
      reconciledTicketTabs(current.map((item) => ({ ...item })), current, []),
    ).toBe(current);
  });

  it("keeps a newly opened ticket within the local tab limit", () => {
    const current = Array.from({ length: 20 }, (_, index) =>
      tab(String(index + 1))
    );

    const next = ticketTabsWithOpenedTicket(current, tab("21"));

    expect(next).toHaveLength(20);
    expect(next.at(-1)?.id).toBe("21");
    expect(next.some((item) => item.id === "20")).toBe(false);
  });

  it("retains a draft-protected local tab when the remote taskbar is full", () => {
    const remote = Array.from({ length: 20 }, (_, index) =>
      tab(String(index + 1))
    );
    const current = [...remote, tab("draft")];

    const next = reconciledTicketTabs(remote, current, ["draft"], "20");

    expect(next).toHaveLength(20);
    expect(next.some((item) => item.id === "draft")).toBe(true);
    expect(next.some((item) => item.id === "20")).toBe(true);
  });

  it("keeps a transport-failed local action visible and retries it on focus", async () => {
    vi.mocked(loadPersistedCommunicationDrafts).mockResolvedValue([]);
    let providerContainsTicket = false;
    let openAttempts = 0;
    const available = () => ({
      status: "available" as const,
      activeSelectionReliable: true,
      initial: false,
      ticketExternalIds: providerContainsTicket ? ["3"] : [],
      unsynchronizedTicketExternalIds: [],
      pendingOpenTicketExternalIds: [],
      pendingCloseTicketExternalIds: [],
      activeNotSynchronized: false,
      orderNotSynchronized: false,
      synchronizedAt: new Date().toISOString(),
    });
    const action = vi.fn(async (request: { kind: string }) => {
      if (request.kind === "open") {
        openAttempts += 1;
        if (openAttempts === 1) throw new Error("transport failed");
        providerContainsTicket = true;
      }
      return available();
    });

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [],
        reconcileOpenTicketTabs: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [tab("3")],
      });
      return (
        <>
          <button onClick={() => void state.open("3")} type="button">Open</button>
          <span>{state.unsynchronizedIds.join(",")}</span>
        </>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("3")).toBeInTheDocument();
    await waitFor(() => expect(openAttempts).toBe(1));

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(openAttempts).toBe(2));
    await waitFor(() => expect(screen.queryByText("3")).not.toBeInTheDocument());
  });

  it("does not report an in-flight selection as failed", async () => {
    vi.mocked(loadPersistedCommunicationDrafts).mockResolvedValue([]);
    let rejectFirstActivation: ((error: Error) => void) | undefined;
    let activationAttempts = 0;
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
      synchronizedAt: new Date().toISOString(),
    };
    const action = vi.fn((request: { kind: string }) => {
      if (request.kind !== "activate") return Promise.resolve(available);
      activationAttempts += 1;
      if (activationAttempts > 1) return Promise.resolve(available);
      return new Promise<typeof available>((_resolve, reject) => {
        rejectFirstActivation = reject;
      });
    });

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "1",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab("1")],
        reconcileOpenTicketTabs: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [tab("1")],
      });
      return (
        <>
          <button onClick={() => void state.activate("1")} type="button">
            Activate
          </button>
          <span>{state.selectionUnsynchronized ? "Not synchronized" : "Synchronized"}</span>
          <span>
            {state.unsynchronizedIds.length > 0
              ? "Ticket marked unsynchronized"
              : "No ticket sync warning"}
          </span>
        </>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    await userEvent.click(screen.getByRole("button", { name: "Activate" }));
    await waitFor(() => expect(activationAttempts).toBe(1));
    expect(screen.getByText("Synchronized")).toBeInTheDocument();
    expect(screen.getByText("No ticket sync warning")).toBeInTheDocument();

    rejectFirstActivation?.(new Error("transport failed"));
    expect(await screen.findByText("Not synchronized")).toBeInTheDocument();
    expect(screen.getByText("Ticket marked unsynchronized")).toBeInTheDocument();

    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(activationAttempts).toBe(2));
    await waitFor(() => expect(screen.getByText("Synchronized")).toBeInTheDocument());
    expect(screen.getByText("No ticket sync warning")).toBeInTheDocument();
  });

  it("does not adopt an old remote active ticket between open and activate", async () => {
    vi.mocked(loadPersistedCommunicationDrafts).mockResolvedValue([]);
    const reconcile = vi.fn();
    const action = vi.fn(async (request: { kind: string }) => ({
      status: "available" as const,
      activeSelectionReliable: true,
      initial: request.kind === "reconcile",
      ticketExternalIds: request.kind === "reconcile" ? ["1"] : ["1", "3"],
      activeTicketExternalId: request.kind === "activate" ? "3" : "1",
      unsynchronizedTicketExternalIds: [],
      pendingOpenTicketExternalIds: [],
      pendingCloseTicketExternalIds: [],
      activeNotSynchronized: false,
      orderNotSynchronized: false,
      synchronizedAt: new Date().toISOString(),
    }));

    function Harness() {
      const state = useTicketTaskbarSync({
        action,
        activeTicketId: "3",
        loadTicketDetailAction: vi.fn(),
        openTicketTabs: [tab("1"), tab("3")],
        reconcileOpenTicketTabs: reconcile,
        scope: taskbarTestScope,
        ticketTabs: [tab("1"), tab("3")],
      });
      return (
        <button
          onClick={() => {
            void state.open("3");
            void state.activate("3");
          }}
          type="button"
        >
          Open and activate
        </button>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "reconcile" }),
    ));
    action.mockClear();
    reconcile.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Open and activate" }));

    await waitFor(() => expect(reconcile).toHaveBeenCalledTimes(2));
    expect(reconcile.mock.calls[0]?.[2]).toBeUndefined();
    expect(reconcile.mock.calls[1]?.[2]).toBe("3");
  });
});
