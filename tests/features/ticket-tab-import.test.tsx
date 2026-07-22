import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTicketTabImport } from "@/features/workspace/components/use-ticket-tab-import";
import { hydrateImportedTicketTabs } from "@/features/workspace/components/ticket-tab-import-hydration";
import type { WorkspaceTicketRow, WorkspaceTicketTab } from "@/features/tickets";
import { detailPropsFor, highRow, row } from "./ticket-workspace-test-utils";

describe("manual ticket-tab import", () => {
  it("does nothing until the user explicitly requests an import", async () => {
    const action = vi.fn().mockResolvedValue({
      status: "available",
      ticketExternalIds: [row.id, highRow.id],
    });
    const importOpenTicketTabs = vi.fn();
    const hydrateAction = vi.fn().mockResolvedValue(
      detailPropsFor(highRow).detailResult,
    );
    const { result } = renderHook(() => useTicketTabImport({
      action,
      hydrateAction,
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs,
      openTicketTabs: [row],
      workspaceId: "workspace-1",
    }));

    expect(action).not.toHaveBeenCalled();
    await act(async () => result.current.importTabs());

    expect(action).toHaveBeenCalledTimes(1);
    expect(hydrateAction).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      ticketExternalId: highRow.id,
      workspaceId: "workspace-1",
    });
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
      hydrateAction: async ({ ticketExternalId }) =>
        detailPropsFor(
          remoteRows.find((ticket) => ticket.id === ticketExternalId)!,
        ).detailResult,
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs,
      openTicketTabs: localTabs,
      workspaceId: "workspace-1",
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
    const hydrateAction = vi.fn(async ({ ticketExternalId }: {
      ticketExternalId: string;
    }) => {
      if (ticketExternalId === "unavailable") {
        return {
          status: "unavailable" as const,
          reason: "provider-permission-denied" as const,
          retryable: false,
        };
      }
      return detailPropsFor(
        ticketExternalId === "merged" ? finalRow : otherRow,
      ).detailResult;
    });

    const result = await hydrateImportedTicketTabs({
      candidateTicketIds: ["unavailable", "merged", "other"],
      capacity: 2,
      hydrateAction,
      hydrationScope: {
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-1",
        workspaceId: "workspace-1",
      },
      knownTicketIds: new Set(["final"]),
    });

    expect(result.tabs.map((tab) => tab.id)).toEqual(["other"]);
    expect(result.unavailableCount).toBe(1);
    expect(hydrateAction).toHaveBeenCalledTimes(3);
  });

  it("shows a retryable error when the action transport rejects", async () => {
    const { result } = renderHook(() => useTicketTabImport({
      action: vi.fn().mockRejectedValue(new Error("network")),
      hydrateAction: vi.fn(),
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs: vi.fn(),
      openTicketTabs: [],
      workspaceId: "workspace-1",
    }));

    await act(async () => result.current.importTabs());

    expect(result.current.notice).toEqual({
      message: "Ticket tabs could not be imported. Try Sync tabs again.",
      tone: "error",
    });
  });

  it("reports the committed result when a ticket opens during import", async () => {
    let resolveHydration: (
      value: ReturnType<typeof detailPropsFor>["detailResult"],
    ) => void = () => undefined;
    const hydration = new Promise<
      ReturnType<typeof detailPropsFor>["detailResult"]
    >((resolve) => {
      resolveHydration = resolve;
    });
    const importOpenTicketTabs = vi.fn();
    const hydrateAction = vi.fn(() => hydration);
    const view = renderHook(
      ({ tabs }) => useTicketTabImport({
        action: vi.fn().mockResolvedValue({
          status: "available",
          ticketExternalIds: [highRow.id],
        }),
        hydrateAction,
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-1",
        importOpenTicketTabs,
        openTicketTabs: tabs,
        workspaceId: "workspace-1",
      }),
      { initialProps: { tabs: [row] as WorkspaceTicketTab[] } },
    );

    let importPromise: Promise<void> | undefined;
    act(() => {
      importPromise = view.result.current.importTabs();
    });
    await waitFor(() => expect(hydrateAction).toHaveBeenCalledOnce());
    view.rerender({ tabs: [row, highRow] });
    resolveHydration(detailPropsFor(highRow).detailResult);
    await act(async () => importPromise);

    expect(importOpenTicketTabs).not.toHaveBeenCalled();
    expect(view.result.current.notice?.message).toBe(
      "No ticket tabs were imported; 1 duplicate.",
    );
  });

  it("reports candidates omitted by the bounded import scan", async () => {
    const ticketExternalIds = Array.from(
      { length: 101 },
      (_, index) => `ticket-${index}`,
    );
    const hydrateAction = vi.fn(async () => ({
      status: "unavailable" as const,
      reason: "provider-permission-denied" as const,
      retryable: false,
    }));
    const directResult = await hydrateImportedTicketTabs({
      candidateTicketIds: ticketExternalIds,
      capacity: 20,
      hydrateAction,
      hydrationScope: {
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-1",
        workspaceId: "workspace-1",
      },
      knownTicketIds: new Set(),
    });

    expect(directResult).toMatchObject({
      attemptedCount: 100,
      scanLimitSkippedCount: 1,
      unavailableCount: 100,
    });

    const view = renderHook(() => useTicketTabImport({
      action: vi.fn().mockResolvedValue({
        status: "available",
        ticketExternalIds,
      }),
      hydrateAction: async () => ({
        status: "unavailable",
        reason: "provider-permission-denied",
        retryable: false,
      }),
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs: vi.fn(),
      openTicketTabs: [],
      workspaceId: "workspace-1",
    }));
    await act(async () => view.result.current.importTabs());

    expect(view.result.current.notice?.message).toContain("100 unavailable");
    expect(view.result.current.notice?.message).toContain(
      "1 skipped because the import scan limit was reached",
    );
  });
});
