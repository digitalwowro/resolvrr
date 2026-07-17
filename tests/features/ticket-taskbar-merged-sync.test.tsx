import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useTicketTaskbarSync } from "@/features/workspace/components/use-ticket-taskbar-sync";
import { hydrateTaskbarTabs } from "@/features/workspace/components/ticket-taskbar-hydration";
import { detailPropsFor, highRow } from "./ticket-workspace-test-utils";
import {
  taskbarTestActionArgs,
  taskbarTestScope,
} from "./ticket-taskbar-test-scope";

const available = {
  status: "available" as const,
  activeSelectionReliable: true,
  initial: false,
  unsynchronizedTicketExternalIds: [],
  pendingOpenTicketExternalIds: [],
  pendingCloseTicketExternalIds: [],
  activeNotSynchronized: false,
  orderNotSynchronized: false,
  synchronizedAt: "2026-07-17T00:00:00.000Z",
};

describe("merged ticket taskbar synchronization", () => {
  it("reopens a known survivor when a corrected source reappears alone", async () => {
    const result = await hydrateTaskbarTabs({
      correctedSourceIds: new Set(),
      knownTabs: new Map([[highRow.id, highRow]]),
      loadTicketDetailAction: vi.fn(),
      providerTicketIds: ["merged-source"],
      replacements: new Map([["merged-source", highRow.id]]),
    });

    expect(result.tabs).toEqual([highRow]);
    expect(result.corrections).toEqual([
      { kind: "open", ticketExternalId: highRow.id },
      { kind: "reorder", ticketExternalIds: [highRow.id] },
    ]);
  });

  it("activates a known survivor before closing a reappeared active source", async () => {
    const result = await hydrateTaskbarTabs({
      activeProviderTicketId: "merged-source",
      correctedSourceIds: new Set(),
      knownTabs: new Map([[highRow.id, highRow]]),
      loadTicketDetailAction: vi.fn(),
      providerTicketIds: ["merged-source"],
      replacements: new Map([["merged-source", highRow.id]]),
    });

    expect(result.corrections).toEqual([
      { kind: "activate", ticketExternalId: highRow.id },
      { kind: "reorder", ticketExternalIds: [highRow.id] },
    ]);
  });

  it("does not lose a merged-source correction to a newer local action", async () => {
    const sourceId = "merged-source";
    const target = detailPropsFor(highRow);
    const mergedResult = {
      status: "available" as const,
      detail: target.detail,
      resolution: {
        cause: "merged" as const,
        sources: [{ externalId: sourceId }],
        targetExternalId: highRow.id,
      },
    };
    let providerIds = [sourceId, highRow.id];
    let resolveFirstLoad:
      ((value: typeof mergedResult) => void) | undefined;
    let sourceLoads = 0;
    const loadTicketDetailAction = vi.fn((ticketId: string) => {
      if (ticketId !== sourceId) return Promise.resolve(target.detailResult);
      sourceLoads += 1;
      if (sourceLoads > 1) return Promise.resolve(mergedResult);
      return new Promise<typeof mergedResult>((resolve) => {
        resolveFirstLoad = resolve;
      });
    });
    const action = vi.fn(async (request: {
      kind: string;
      ticketExternalId?: string;
    }) => {
      if (request.kind === "close" && request.ticketExternalId === sourceId) {
        providerIds = [highRow.id];
      }
      return {
        ...available,
        activeSelectionReliable: false,
        ticketExternalIds: providerIds,
      };
    });

    function Harness() {
      const taskbar = useTicketTaskbarSync({
        action,
        loadTicketDetailAction,
        openTicketTabs: [],
        reconcileOpenTicketTabs: vi.fn(),
        scope: taskbarTestScope,
        ticketTabs: [highRow],
      });
      return (
        <button onClick={() => void taskbar.deactivate()} type="button">
          Select List
        </button>
      );
    }

    render(<Harness />);
    await waitFor(() => expect(loadTicketDetailAction).toHaveBeenCalledWith(sourceId));
    await userEvent.click(screen.getByRole("button", { name: "Select List" }));
    resolveFirstLoad?.(mergedResult);

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "close", ticketExternalId: sourceId }),
    ));
    expect(sourceLoads).toBeGreaterThan(1);
  });

  it("normalizes a merged provider task to its surviving ticket", async () => {
    const sourceId = "merged-source";
    const target = detailPropsFor(highRow);
    let providerIds = [sourceId];
    let providerActiveId: string | undefined = sourceId;
    const action = vi.fn(async (request: {
      kind: string;
      ticketExternalId?: string;
    }) => {
      if (request.kind === "activate" && request.ticketExternalId === highRow.id) {
        providerIds = [sourceId, highRow.id];
        providerActiveId = highRow.id;
      }
      if (request.kind === "close" && request.ticketExternalId === sourceId) {
        providerIds = [highRow.id];
      }
      return {
        ...available,
        ticketExternalIds: providerIds,
        activeTicketExternalId: providerActiveId,
      };
    });
    const loadTicketDetailAction = vi.fn(async (ticketId: string) => {
      if (ticketId !== sourceId) return target.detailResult;
      return {
        status: "available" as const,
        detail: target.detail,
        resolution: {
          cause: "merged" as const,
          sources: [{ externalId: sourceId, number: "1001" }],
          targetExternalId: highRow.id,
        },
      };
    });
    const reconcile = vi.fn();

    function Harness() {
      useTicketTaskbarSync({
        action,
        loadTicketDetailAction,
        openTicketTabs: [],
        reconcileOpenTicketTabs: reconcile,
        scope: taskbarTestScope,
        ticketTabs: [],
      });
      return null;
    }

    render(<Harness />);

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({
        kind: "activate",
        ticketExternalId: highRow.id,
      }),
    ));
    await waitFor(() => expect(action).toHaveBeenCalledWith(
      ...taskbarTestActionArgs({ kind: "close", ticketExternalId: sourceId }),
    ));
    await waitFor(() => expect(reconcile).toHaveBeenLastCalledWith(
      [expect.objectContaining({ id: highRow.id })],
      [],
      highRow.id,
    ));
  });
});
