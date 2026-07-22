"use server";

import { z } from "zod";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { unavailableTicketRead } from "@/features/tickets/read-model";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";
import { workspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  WorkspaceTabImportHydrationInput,
  WorkspaceTabImportResult,
} from "./model";
import { importWorkspaceTicketTabs } from "./service";

const scopedValue = z.string().trim().min(1).max(128);
const hydrationInput = z.object({
  helpdeskConnectionId: scopedValue,
  identityVersion: scopedValue,
  ticketExternalId: scopedValue,
  workspaceId: scopedValue,
}).strict();

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

export async function hydrateWorkspaceTabImportAction(
  rawInput: WorkspaceTabImportHydrationInput,
) {
  const input = hydrationInput.safeParse(rawInput);
  if (!input.success) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const user = await requireCurrentUser();
  const result = await loadWorkspaceTicketDetail(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    input.data.ticketExternalId,
    prismaTicketDetailCacheRepository,
    {
      helpdeskConnectionId: input.data.helpdeskConnectionId,
      identityVersion: input.data.identityVersion,
      workspaceId: input.data.workspaceId,
    },
  );
  if (result.status !== "available") return result;
  return {
    detail: workspaceTicketDetail(result.detail),
    resolution: result.resolution,
    status: "available" as const,
  };
}
