import type { TicketExternalId } from "./tickets";

export type HelpdeskNotificationType =
  | "ticket-created"
  | "ticket-updated"
  | "ticket-reminder"
  | "ticket-closed"
  | "ticket-notification";

export type HelpdeskNotification = {
  id: string;
  read: boolean;
  type: HelpdeskNotificationType;
  ticketExternalId: TicketExternalId;
  ticketNumber: string;
  ticketTitle: string;
  createdAt: Date;
  actor?: string;
};

export type HelpdeskNotificationMarkReadInput =
  | {
      all: true;
      notificationIds?: never;
    }
  | {
      all?: false;
      notificationIds: string[];
    };
