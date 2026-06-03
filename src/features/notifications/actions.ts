"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type {
  WorkspaceNotificationsLoadResult,
  WorkspaceNotificationsMarkReadResult,
} from "./model";
import {
  loadWorkspaceNotifications,
  markWorkspaceNotificationsRead,
} from "./service";

export async function loadWorkspaceNotificationsAction(): Promise<WorkspaceNotificationsLoadResult> {
  const user = await requireCurrentUser();
  return loadWorkspaceNotifications(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
  );
}

export async function markWorkspaceNotificationsReadAction(request: {
  all?: boolean;
  notificationIds?: string[];
}): Promise<WorkspaceNotificationsMarkReadResult> {
  const user = await requireCurrentUser();
  return markWorkspaceNotificationsRead(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    request,
  );
}
