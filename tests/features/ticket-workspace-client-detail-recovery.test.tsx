import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { TICKET_DETAIL_LOAD_TIMEOUT_MS } from
  "@/features/workspace/components/ticket-detail-request-timeout";
import type {
  LoadWorkspaceTicketDetailHydrationAction,
  WorkspaceTicketDetailHydrationResult,
} from "@/features/workspace/ticket-detail-hydration";
import {
  availableList,
  detailPropsFor,
  highRow,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function renderWorkspace(
  loadTicketDetailAction: LoadWorkspaceTicketDetailHydrationAction,
) {
  return render(
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      listResult={availableList}
      loadTicketDetailAction={loadTicketDetailAction}
      logoutAction={noopAction}
      rows={[row, highRow]}
      setActiveConnectionAction={noopAction}
      tabs={[{ ...row }, { ...highRow }]}
      updateTicketMetadataAction={noopMutationAction}
      userEmail="agent@example.com"
    />,
  );
}

describe("TicketWorkspace client detail recovery", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/workspace");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ends a stranded detail load and offers an explicit retry", async () => {
    vi.useFakeTimers();
    const loadTicketDetailAction = vi.fn(
      () => new Promise<WorkspaceTicketDetailHydrationResult>(() => undefined),
    );
    renderWorkspace(loadTicketDetailAction);

    fireEvent.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(loadTicketDetailAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Loading ticket thread" }))
      .toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_DETAIL_LOAD_TIMEOUT_MS);
    });

    expect(
      screen.getByText("The helpdesk workspace could not be reached."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(loadTicketDetailAction).toHaveBeenCalledTimes(2);
    expect(loadTicketDetailAction).toHaveBeenLastCalledWith(
      highRow.id,
      { cacheMode: "bypass" },
    );
  });

  it("retries a temporary failure when its open tab is selected again", async () => {
    const detail = detailPropsFor(highRow, "Recovered ticket detail");
    const loadTicketDetailAction = vi.fn()
      .mockResolvedValueOnce({
        status: "unavailable" as const,
        reason: "provider-temporary-failure" as const,
        retryable: true,
      })
      .mockResolvedValueOnce(detail.detailResult);
    renderWorkspace(loadTicketDetailAction);

    fireEvent.click(screen.getByRole("row", { name: /Webhook failed/u }));
    expect(
      await screen.findByText("The helpdesk workspace could not be reached."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Return to list/u }));
    fireEvent.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(await screen.findByText("Recovered ticket detail")).toBeInTheDocument();
    await waitFor(() => expect(loadTicketDetailAction).toHaveBeenCalledTimes(2));
  });
});
