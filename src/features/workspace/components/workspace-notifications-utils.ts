import type { WorkspaceNotification } from "@/features/notifications";
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
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (absolute < 60) {
    return formatter.format(seconds, "second");
  }
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }
  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}
