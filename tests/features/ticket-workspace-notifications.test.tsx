import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import type { WorkspaceNotificationsLoadResult } from "@/features/notifications/model";
import {
  availableList,
  detailPropsFor,
  highRow,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function notification(
  overrides: Partial<
    Extract<WorkspaceNotificationsLoadResult, { status: "available" }>["notifications"][number]
  > = {},
) {
  return {
    id: "notification-1",
    read: false,
    type: "ticket-updated" as const,
    ticketExternalId: "ticket-2",
    ticketNumber: "1002",
    ticketTitle: "Webhook failed",
    createdAt: "2026-06-03T08:00:00.000Z",
    actor: "Agent Smith",
    ...overrides,
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

describe("TicketWorkspace notifications", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    window.history.replaceState(null, "", "/workspace");
  });

  it("shows the unread count and lists notifications without marking them read", async () => {
    const user = userEvent.setup();
    const loadWorkspaceNotificationsAction = vi.fn(async () =>
      notificationResult([
        notification(),
        notification({
          id: "notification-2",
          read: true,
          ticketExternalId: "ticket-1",
          ticketNumber: "1001",
          ticketTitle: "Cannot log in",
        }),
      ]),
    );
    const markWorkspaceNotificationsReadAction = vi.fn(async () => ({
      status: "saved" as const,
    }));

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

    await screen.findByRole("button", { name: "Notifications, 1 unread" });
    expect(markWorkspaceNotificationsReadAction).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Workspace notifications",
    });
    expect(within(dialog).getByRole("button", { name: "Active" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getAllByText("Ticket updated")).toHaveLength(1);
    expect(within(dialog).getByText("#1002 Webhook failed")).toBeInTheDocument();
    expect(within(dialog).queryByText("#1001 Cannot log in")).toBeNull();
    expect(markWorkspaceNotificationsReadAction).not.toHaveBeenCalled();
  });

  it("handles active-ticket notifications by silently refreshing and marking read", async () => {
    const detailProps = selectedDetailProps();
    const refreshed = detailPropsFor(row, "Fresh reply from notification");
    const loadTicketDetailAction = vi.fn<() => Promise<WorkspaceTicketDetailLoadResult>>(
      async () => refreshed.detailResult,
    );
    const loadWorkspaceNotificationsAction = vi.fn(async () =>
      notificationResult([
        notification({
          id: "active-notification",
          ticketExternalId: "ticket-1",
          ticketNumber: "1001",
          ticketTitle: "Cannot log in",
        }),
      ]),
    );
    const markWorkspaceNotificationsReadAction = vi.fn(async () => ({
      status: "saved" as const,
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        loadWorkspaceNotificationsAction={loadWorkspaceNotificationsAction}
        logoutAction={noopAction}
        markWorkspaceNotificationsReadAction={markWorkspaceNotificationsReadAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await waitFor(() =>
      expect(markWorkspaceNotificationsReadAction).toHaveBeenCalledWith({
        notificationIds: ["active-notification"],
      }),
    );
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("clicking an inactive notification marks it read, opens the ticket, and leaves tabs without unread indicators", async () => {
    const user = userEvent.setup();
    const detailProps = detailPropsFor(highRow, "Loaded from notification");
    const loadTicketDetailAction = vi.fn(async () => detailProps.detailResult);
    const loadWorkspaceNotificationsAction = vi.fn(async () =>
      notificationResult([notification()]),
    );
    const markWorkspaceNotificationsReadAction = vi.fn(async () => ({
      status: "saved" as const,
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
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
    await user.click(screen.getByRole("button", { name: /#1002 Webhook failed/u }));

    await waitFor(() =>
      expect(markWorkspaceNotificationsReadAction).toHaveBeenCalledWith({
        notificationIds: ["notification-1"],
      }),
    );
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-2");
    expect(screen.queryByText("Unread")).toBeNull();
  });

  it("marks all visible unread notifications read", async () => {
    const user = userEvent.setup();
    const loadWorkspaceNotificationsAction = vi.fn(async () =>
      notificationResult([
        notification({ id: "notification-1" }),
        notification({
          id: "notification-2",
          ticketExternalId: "ticket-3",
          ticketNumber: "1003",
          ticketTitle: "Billing issue",
        }),
      ]),
    );
    const markWorkspaceNotificationsReadAction = vi.fn(async () => ({
      status: "saved" as const,
    }));

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
      await screen.findByRole("button", { name: "Notifications, 2 unread" }),
    );
    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() =>
      expect(markWorkspaceNotificationsReadAction).toHaveBeenCalledWith({
        notificationIds: ["notification-1", "notification-2"],
      }),
    );
    expect(screen.getByRole("button", { name: "Notifications" }))
      .toBeInTheDocument();
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
