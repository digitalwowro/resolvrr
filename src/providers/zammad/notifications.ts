import type {
  HelpdeskNotification,
  HelpdeskNotificationMarkReadInput,
  HelpdeskNotificationType,
} from "@/core/notifications";
import { ProviderError, type ProviderContext } from "@/core/providers";
import { z } from "zod";
import { zammadGetJson, zammadSendJson } from "./client";
import { cleanString } from "./participants";
import {
  zammadTicketSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";
import { zammadTicketPayloadRecords } from "./ticket-detail-payload";
import { isZammadMergedTicket } from "./ticket-state";

const zammadNotificationSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    object: z.string().nullish(),
    o_id: z.union([z.number(), z.string()]).nullish(),
    seen: z.boolean(),
    type: z.string().nullish(),
    created_at: z.string().nullish(),
    created_by: z.string().nullish(),
    updated_by: z.string().nullish(),
  })
  .passthrough();

const zammadNotificationListSchema = z.array(zammadNotificationSchema);

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function dateValue(value: string | null | undefined): Date {
  if (!value) {
    return new Date(0);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function notificationType(value: string | null | undefined): HelpdeskNotificationType {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "create") {
    return "ticket-created";
  }
  if (normalized === "reminder_reached") {
    return "ticket-reminder";
  }
  if (normalized === "escalation" || normalized === "update") {
    return "ticket-updated";
  }
  if (normalized === "closed") {
    return "ticket-closed";
  }

  return "ticket-notification";
}

async function readZammadTicket(
  context: ProviderContext,
  ticketExternalId: string,
): Promise<{ assets?: ZammadAssets; ticket: ZammadTicket }> {
  const rawTicket = await zammadGetJson(
    context,
    `/api/v1/tickets/${encodeURIComponent(ticketExternalId)}?expand=true&full=true`,
  );
  const parsed = zammadTicketPayloadRecords(rawTicket);
  const directTicket = Array.isArray(rawTicket)
    ? undefined
    : zammadTicketSchema.safeParse(rawTicket);
  const ticket =
    parsed.tickets[0] ?? (directTicket?.success ? directTicket.data : undefined);
  if (!ticket) {
    throw providerDataMismatch();
  }
  return { assets: parsed.assets, ticket };
}

function isUnavailableNotificationTicket(error: unknown): boolean {
  return (
    error instanceof ProviderError &&
    (error.statusCode === 403 || error.statusCode === 404)
  );
}

export async function listZammadNotifications(
  context: ProviderContext,
): Promise<HelpdeskNotification[]> {
  const rawNotifications = await zammadGetJson(
    context,
    "/api/v1/online_notifications?expand=true",
  );
  const parsed = zammadNotificationListSchema.safeParse(rawNotifications);
  if (!parsed.success) {
    throw providerDataMismatch();
  }

  const ticketNotifications = parsed.data
    .map((notification) => {
      const objectName = cleanString(notification.object)?.toLowerCase();
      const ticketExternalId =
        notification.o_id === null || notification.o_id === undefined
          ? undefined
          : String(notification.o_id);
      return objectName === "ticket" && ticketExternalId
        ? { ...notification, ticketExternalId }
        : undefined;
    })
    .filter((notification): notification is NonNullable<typeof notification> =>
      Boolean(notification),
    );
  const ticketIds = [
    ...new Set(ticketNotifications.map((notification) => notification.ticketExternalId)),
  ];
  const ticketResults = await Promise.allSettled(
    ticketIds.map(async (ticketExternalId) => {
      const payload = await readZammadTicket(context, ticketExternalId);
      return [ticketExternalId, payload] as const;
    }),
  );
  const ticketEntries = ticketResults.flatMap((result) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }
    if (isUnavailableNotificationTicket(result.reason)) {
      return [];
    }
    throw result.reason;
  });
  const ticketsById = new Map(ticketEntries);

  return ticketNotifications
    .map((notification) => {
      const payload = ticketsById.get(notification.ticketExternalId);
      if (!payload) {
        return undefined;
      }
      if (isZammadMergedTicket(payload.ticket, payload.assets)) {
        return undefined;
      }
      const ticket = payload.ticket;

      return {
        id: String(notification.id),
        read: notification.seen,
        type: notificationType(notification.type),
        ticketExternalId: notification.ticketExternalId,
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
        createdAt: dateValue(notification.created_at),
        ...(cleanString(notification.created_by ?? notification.updated_by)
          ? { actor: cleanString(notification.created_by ?? notification.updated_by) }
          : {}),
      } satisfies HelpdeskNotification;
    })
    .filter((notification): notification is HelpdeskNotification =>
      Boolean(notification),
    );
}

export async function markZammadNotificationsRead(
  context: ProviderContext,
  input: HelpdeskNotificationMarkReadInput,
): Promise<void> {
  if (input.all) {
    await zammadSendJson(
      context,
      "/api/v1/online_notifications/mark_all_as_read",
      "POST",
      {},
    );
    return;
  }

  const ids = [...new Set(input.notificationIds.map((id) => id.trim()).filter(Boolean))];
  await Promise.all(
    ids.map((id) =>
      zammadSendJson(
        context,
        `/api/v1/online_notifications/${encodeURIComponent(id)}`,
        "PUT",
        { seen: true },
      ),
    ),
  );
}
