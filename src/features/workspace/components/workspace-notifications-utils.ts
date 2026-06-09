import type { WorkspaceNotification } from "@/features/notifications";
import { formatWorkspaceRelativeTime } from "@/features/tickets/date-time-format";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";

export const notificationTypeLabels: Record<
  WorkspaceNotification["type"],
  string
> = {
  "ticket-created": "New ticket",
  "ticket-updated": "Ticket updated",
  "ticket-reminder": "Reminder reached",
  "ticket-closed": "Ticket closed",
  "ticket-notification": "Ticket notification",
};

export function displayTicketNumber(number: string): string {
  return number.startsWith("#") ? number : `#${number}`;
}

export function notificationTab(
  notification: WorkspaceNotification,
): WorkspaceTicketTab {
  return {
    id: notification.ticketExternalId,
    number: displayTicketNumber(notification.ticketNumber),
    title: notification.ticketTitle,
    customer: "Unknown",
    owner: "Unknown",
    group: "Unknown",
    state: "Unknown",
    priority: "Unknown",
  };
}

export function relativeTime(value: string): string {
  const date = new Date(value);
  return formatWorkspaceRelativeTime(date);
}
