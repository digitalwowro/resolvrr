"use server";

import { z } from "zod";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type { WorkspaceTabImportResult } from "./model";
import { importWorkspaceTicketTabs } from "./service";

const scopedValue = z.string().trim().min(1).max(128);

export async function importWorkspaceTicketTabsAction(
  rawHelpdeskConnectionId?: unknown,
  rawIdentityVersion?: unknown,
): Promise<WorkspaceTabImportResult> {
  const connectionId = scopedValue.safeParse(rawHelpdeskConnectionId);
  const identityVersion = scopedValue.safeParse(rawIdentityVersion);
  if (!connectionId.success || !identityVersion.success) {
    return {
      status: "unavailable",
      reason: "provider-unexpected-response",
      retryable: false,
    };
  }
  const user = await requireCurrentUser();
  return importWorkspaceTicketTabs(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    connectionId.data,
    identityVersion.data,
  );
}
