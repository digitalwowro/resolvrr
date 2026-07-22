import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTicketTabImport } from "@/features/workspace/components/use-ticket-tab-import";
import { detailPropsFor, highRow } from "./ticket-workspace-test-utils";

function deferredHydration() {
  let resolve: (
    value: ReturnType<typeof detailPropsFor>["detailResult"],
  ) => void = () => undefined;
  const promise = new Promise<
    ReturnType<typeof detailPropsFor>["detailResult"]
  >((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function ticketIds() {
  return Array.from({ length: 8 }, (_, index) => `ticket-${index}`);
}

describe("ticket-tab import lifecycle", () => {
  it("cancels after unmount without importing or starting another batch", async () => {
    const hydration = deferredHydration();
    const hydrateAction = vi.fn(() => hydration.promise);
    const importOpenTicketTabs = vi.fn();
    const view = renderHook(() => useTicketTabImport({
      action: vi.fn().mockResolvedValue({
        status: "available",
        ticketExternalIds: ticketIds(),
      }),
      hydrateAction,
      helpdeskConnectionId: "connection-1",
      identityVersion: "identity-1",
      importOpenTicketTabs,
      openTicketTabs: [],
      workspaceId: "workspace-1",
    }));

    let importPromise: Promise<void> | undefined;
    act(() => {
      importPromise = view.result.current.importTabs();
    });
    await waitFor(() => expect(hydrateAction).toHaveBeenCalledTimes(4));
    view.unmount();
    hydration.resolve(detailPropsFor(highRow).detailResult);
    await act(async () => importPromise);

    expect(hydrateAction).toHaveBeenCalledTimes(4);
    expect(importOpenTicketTabs).not.toHaveBeenCalled();
  });

  it("discards a pending import when its workspace scope changes", async () => {
    const hydration = deferredHydration();
    const hydrateAction = vi.fn(() => hydration.promise);
    const importOpenTicketTabs = vi.fn();
    const view = renderHook(
      ({ workspaceId }) => useTicketTabImport({
        action: vi.fn().mockResolvedValue({
          status: "available",
          ticketExternalIds: ticketIds(),
        }),
        hydrateAction,
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-1",
        importOpenTicketTabs,
        openTicketTabs: [],
        workspaceId,
      }),
      { initialProps: { workspaceId: "workspace-1" } },
    );

    let importPromise: Promise<void> | undefined;
    act(() => {
      importPromise = view.result.current.importTabs();
    });
    await waitFor(() => expect(hydrateAction).toHaveBeenCalledTimes(4));
    view.rerender({ workspaceId: "workspace-2" });
    hydration.resolve(detailPropsFor(highRow).detailResult);
    await act(async () => importPromise);

    expect(hydrateAction).toHaveBeenCalledTimes(4);
    expect(importOpenTicketTabs).not.toHaveBeenCalled();
    expect(view.result.current).toMatchObject({
      loading: false,
      notice: undefined,
    });
  });
});
