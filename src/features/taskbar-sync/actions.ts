"use server";

import { z } from "zod";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import { taskbarSyncRequestSchema, type WorkspaceTaskbarSyncResult } from "./model";
import { synchronizeWorkspaceTaskbar } from "./service";

export async function synchronizeWorkspaceTaskbarAction(
  rawRequest: unknown,
  rawHelpdeskConnectionId?: unknown,
  rawIdentityVersion?: unknown,
): Promise<WorkspaceTaskbarSyncResult> {
  const request = taskbarSyncRequestSchema.safeParse(rawRequest);
  const connectionId = z.string().trim().min(1).max(128).safeParse(
    rawHelpdeskConnectionId,
  );
  const identityVersion = z.string().trim().min(1).max(128).safeParse(
    rawIdentityVersion,
  );
  if (!request.success || !connectionId.success || !identityVersion.success) {
    return {
      status: "unavailable",
      reason: "provider-unexpected-response",
      retryable: false,
      unsynchronizedTicketExternalIds: [],
      pendingOpenTicketExternalIds: [],
      pendingCloseTicketExternalIds: [],
      activeNotSynchronized: false,
      orderNotSynchronized: false,
    };
  }
  const user = await requireCurrentUser();
  return synchronizeWorkspaceTaskbar(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    connectionId.data,
    identityVersion.data,
    request.data,
  );
}
