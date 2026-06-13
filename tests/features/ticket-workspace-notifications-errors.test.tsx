import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import type { WorkspaceNotificationsLoadResult } from "@/features/notifications/model";
import {
  availableList,
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

function notification(): Extract<
  WorkspaceNotificationsLoadResult,
  { status: "available" }
>["notifications"][number] {
  return {
    id: "notification-1",
    read: false,
    type: "ticket-updated",
    ticketExternalId: "ticket-2",
    ticketNumber: "1002",
    ticketTitle: "Webhook failed",
    createdAt: "2026-06-03T08:00:00.000Z",
    actor: "Agent Smith",
  };
}

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

describe("TicketWorkspace notification errors", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  it("handles rejected notification requests without surfacing an unhandled rejection", async () => {
    const user = userEvent.setup();
    const loadWorkspaceNotificationsAction = vi
      .fn()
      .mockResolvedValueOnce(notificationResult([notification()]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const markWorkspaceNotificationsReadAction = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadWorkspaceNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={noopAction}
        markWorkspaceNotificationsReadAction={markWorkspaceNotificationsReadAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Notifications, 1 unread" }),
    );
    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() =>
      expect(markWorkspaceNotificationsReadAction).toHaveBeenCalledWith({
        notificationIds: ["notification-1"],
      }),
    );
    expect(loadWorkspaceNotificationsAction).toHaveBeenCalledTimes(2);
  });
});
