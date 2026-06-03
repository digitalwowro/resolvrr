import type {
  HelpdeskNotification,
  HelpdeskNotificationType,
} from "@/core/notifications";
import type {
  TicketReadUnavailable,
  TicketReadUnavailableReason,
} from "@/features/tickets/read-model";

export type WorkspaceNotification = {
  id: string;
  read: boolean;
  type: HelpdeskNotificationType;
  ticketExternalId: string;
  ticketNumber: string;
  ticketTitle: string;
  createdAt: string;
  actor?: string;
};

export type WorkspaceNotificationsLoadResult =
  | {
      status: "available";
      notifications: WorkspaceNotification[];
      measuredAt: string;
    }
  | TicketReadUnavailable;

export type WorkspaceNotificationsMarkReadResult =
  | { status: "saved" }
  | {
      status: "failed";
      reason: TicketReadUnavailableReason;
      retryable: boolean;
    };

export type LoadWorkspaceNotificationsAction =
  () => Promise<WorkspaceNotificationsLoadResult>;

export type MarkWorkspaceNotificationsReadAction = (request: {
  all?: boolean;
  notificationIds?: string[];
}) => Promise<WorkspaceNotificationsMarkReadResult>;

export function workspaceNotification(
  notification: HelpdeskNotification,
): WorkspaceNotification {
  return {
    id: notification.id,
    read: notification.read,
    type: notification.type,
    ticketExternalId: notification.ticketExternalId,
    ticketNumber: notification.ticketNumber,
    ticketTitle: notification.ticketTitle,
    createdAt: notification.createdAt.toISOString(),
    ...(notification.actor ? { actor: notification.actor } : {}),
  };
}
