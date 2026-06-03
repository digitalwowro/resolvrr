import { ProviderError } from "@/core/providers";
import type { HelpdeskNotificationMarkReadInput } from "@/core/notifications";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  loadActiveTicketProviderContext,
  readUnavailableForProviderError,
  type TicketProviderContext,
} from "@/features/tickets/connection-context";
import { unavailableTicketRead } from "@/features/tickets/read-model";
import type {
  WorkspaceNotificationsLoadResult,
  WorkspaceNotificationsMarkReadResult,
} from "./model";
import { workspaceNotification } from "./model";

function hasNotificationList(providerContext: TicketProviderContext): boolean {
  return (
    providerContext.plugin.capabilities.includes("notifications:list") &&
    Boolean(providerContext.plugin.listNotifications)
  );
}

function hasNotificationMarkRead(providerContext: TicketProviderContext): boolean {
  return (
    providerContext.plugin.capabilities.includes("notifications:mark-read") &&
    Boolean(providerContext.plugin.markNotificationsRead)
  );
}

function failedResult(
  result: Awaited<ReturnType<typeof loadActiveTicketProviderContext>>,
): WorkspaceNotificationsMarkReadResult {
  return {
    status: "failed",
    reason: result.status === "unavailable"
      ? result.reason
      : "provider-unexpected-response",
    retryable: result.status === "unavailable" ? result.retryable : false,
  };
}

function failedProviderError(
  error: unknown,
): WorkspaceNotificationsMarkReadResult {
  const unavailable = readUnavailableForProviderError(error);
  return {
    status: "failed",
    reason: unavailable.reason,
    retryable: unavailable.retryable,
  };
}

function markReadInput(request: {
  all?: boolean;
  notificationIds?: string[];
}): HelpdeskNotificationMarkReadInput | undefined {
  if (request.all) {
    return { all: true };
  }

  const notificationIds = [
    ...new Set((request.notificationIds ?? []).map((id) => id.trim()).filter(Boolean)),
  ];
  return notificationIds.length > 0
    ? { notificationIds }
    : undefined;
}

export async function loadWorkspaceNotifications(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
): Promise<WorkspaceNotificationsLoadResult> {
  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "lookup",
  );
  if (providerContext.status === "unavailable") {
    return providerContext;
  }
  if (!hasNotificationList(providerContext.value)) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    const notifications =
      await providerContext.value.plugin.listNotifications!(
        providerContext.value.context,
      );
    return {
      status: "available",
      notifications: notifications.map(workspaceNotification),
      measuredAt: new Date().toISOString(),
    };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}

export async function markWorkspaceNotificationsRead(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  request: { all?: boolean; notificationIds?: string[] },
): Promise<WorkspaceNotificationsMarkReadResult> {
  const input = markReadInput(request);
  if (!input) {
    return { status: "saved" };
  }

  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "mutation",
  );
  if (providerContext.status === "unavailable") {
    return failedResult(providerContext);
  }
  if (!hasNotificationMarkRead(providerContext.value)) {
    return {
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    };
  }

  try {
    await providerContext.value.plugin.markNotificationsRead!(
      providerContext.value.context,
      input,
    );
    return { status: "saved" };
  } catch (error) {
    if (error instanceof ProviderError && error.kind === "validation-failure") {
      return {
        status: "failed",
        reason: "provider-unexpected-response",
        retryable: false,
      };
    }

    return failedProviderError(error);
  }
}
