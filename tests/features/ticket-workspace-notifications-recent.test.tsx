import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import type { WorkspaceNotificationsLoadResult } from "@/features/notifications/model";
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

function notificationResult(
  notifications: Extract<
    WorkspaceNotificationsLoadResult,
    { status: "available" }
  >["notifications"],
): WorkspaceNotificationsLoadResult {
  return {
    status: "available",
    notifications,
    measuredAt: "2026-06-03T08:01:00.000Z",
  };
}

describe("TicketWorkspace notification recent tickets", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    window.history.replaceState(null, "", "/workspace");
  });

  it("shows recent tickets separately from active notifications", async () => {
    const user = userEvent.setup();
    const detailProps = detailPropsFor(highRow, "Recent ticket detail");
    const loadTicketDetailAction = vi.fn(async () => detailProps.detailResult);
    const loadWorkspaceNotificationsAction = vi.fn(async () =>
      notificationResult([]),
    );

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialWorkspaceOpenTabsState={{
          activePane: "list",
          openTabs: [],
          recentTabs: [{ ...highRow }, { ...row }],
          tabOrientation: "horizontal",
          updatedAt: "2026-06-03T08:00:00.000Z",
          version: 1,
        }}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        loadWorkspaceNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Notifications" }));
    const dialog = screen.getByRole("dialog", {
      name: "Workspace notifications",
    });
    await user.click(within(dialog).getByRole("button", { name: "Recent" }));

    expect(within(dialog).getByText("#1002 Webhook failed")).toBeInTheDocument();
    expect(within(dialog).getByText("#1001 Cannot log in")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Mark all read" }))
      .toBeNull();

    await user.click(within(dialog).getByRole("button", { name: /#1002/u }));

    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-2");
  });

  it("does not poll notifications while the browser tab is hidden", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    const loadWorkspaceNotificationsAction = vi.fn(async () =>
      notificationResult([]),
    );

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadWorkspaceNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await act(async () => undefined);
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(loadWorkspaceNotificationsAction).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(loadWorkspaceNotificationsAction).toHaveBeenCalledTimes(1);
  });
});
