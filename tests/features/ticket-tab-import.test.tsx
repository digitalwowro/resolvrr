import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTicketTabImport } from "@/features/workspace/components/use-ticket-tab-import";
import { hydrateImportedTicketTabs } from "@/features/workspace/components/ticket-tab-import-hydration";
import type { WorkspaceTicketRow } from "@/features/tickets";
import { detailPropsFor, highRow, row } from "./ticket-workspace-test-utils";

describe("manual ticket-tab import", () => {
  it("does nothing until the user explicitly requests an import", async () => {
    const action = vi.fn().mockResolvedValue({
      status: "available",
      ticketExternalIds: [row.id, highRow.id],
    });
    const importOpenTicketTabs = vi.fn();
    const loadTicketDetailAction = vi.fn().mockResolvedValue(
      detailPropsFor(highRow).detailResult,
    );
    const { result } = renderHook(() => useTicketTabImport({
      action,
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs,
      loadTicketDetailAction,
      openTicketTabs: [row],
    }));

    expect(action).not.toHaveBeenCalled();
    await act(async () => result.current.importTabs());

    expect(action).toHaveBeenCalledTimes(1);
    expect(loadTicketDetailAction).toHaveBeenCalledWith(highRow.id);
    expect(importOpenTicketTabs).toHaveBeenCalledWith([
      expect.objectContaining({ id: highRow.id }),
    ]);
    expect(result.current.notice?.message).toBe("Imported 1 ticket tab.");
  });

  it("never evicts local tabs when only one import slot remains", async () => {
    const localTabs = Array.from({ length: 19 }, (_, index) => ({
      ...row,
      id: `local-${index}`,
      number: `#${index}`,
    }));
    const remoteRows = ["remote-1", "remote-2", "remote-3"].map(
      (id, index) => ({
        ...highRow,
        id,
        number: `#20${index}`,
      } satisfies WorkspaceTicketRow),
    );
    const importOpenTicketTabs = vi.fn();
    const { result } = renderHook(() => useTicketTabImport({
      action: vi.fn().mockResolvedValue({
        status: "available",
        ticketExternalIds: remoteRows.map((ticket) => ticket.id),
      }),
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs,
      loadTicketDetailAction: async (id) =>
        detailPropsFor(remoteRows.find((ticket) => ticket.id === id)!).detailResult,
      openTicketTabs: localTabs,
    }));

    await act(async () => result.current.importTabs());

    expect(importOpenTicketTabs).toHaveBeenCalledWith([
      expect.objectContaining({ id: "remote-1" }),
    ]);
    expect(result.current.notice?.message).toContain(
      "2 skipped because the tab limit was reached",
    );
  });

  it("continues after unavailable and duplicate merged destinations", async () => {
    const finalRow = { ...highRow, id: "final", number: "#9000" };
    const otherRow = { ...highRow, id: "other", number: "#9001" };
    const loadTicketDetailAction = vi.fn(async (id: string) => {
      if (id === "unavailable") {
        return {
          status: "unavailable" as const,
          reason: "provider-permission-denied" as const,
          retryable: false,
        };
      }
      return detailPropsFor(id === "merged" ? finalRow : otherRow).detailResult;
    });

    const result = await hydrateImportedTicketTabs({
      candidateTicketIds: ["unavailable", "merged", "other"],
      capacity: 2,
      knownTicketIds: new Set(["final"]),
      loadTicketDetailAction,
    });

    expect(result.tabs.map((tab) => tab.id)).toEqual(["other"]);
    expect(result.unavailableCount).toBe(1);
    expect(loadTicketDetailAction).toHaveBeenCalledTimes(3);
  });

  it("shows a retryable error when the action transport rejects", async () => {
    const { result } = renderHook(() => useTicketTabImport({
      action: vi.fn().mockRejectedValue(new Error("network")),
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs: vi.fn(),
      loadTicketDetailAction: vi.fn(),
      openTicketTabs: [],
    }));

    await act(async () => result.current.importTabs());

    expect(result.current.notice).toEqual({
      message: "Ticket tabs could not be imported. Try Sync tabs again.",
      tone: "error",
    });
  });
});
