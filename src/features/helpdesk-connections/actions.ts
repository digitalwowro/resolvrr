"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { providerRegistry } from "@/providers";
import { invalidateAiSummaryConnectionCache } from "@/features/ai/summary-cache-invalidation";
import { type HelpdeskConnectionMessageCode } from "./messages";
import {
  createConnection,
  deleteConnection,
  disableConnection,
  setActiveConnection,
  updateConnection,
  validateConnection,
  listConnectionsForUser,
} from "./service";
import type {
  ConnectionListItem,
  HelpdeskConnectionActionResult,
  WorkspaceSettingsConnection,
} from "./service-types";

function textValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function workspaceSettingsConnection(
  connection: ConnectionListItem,
): WorkspaceSettingsConnection {
  return {
    id: connection.id,
    label: connection.displayName,
    providerKey: connection.providerKey,
    providerLabel: connection.providerLabel,
    baseUrl: connection.baseUrl,
    status: connection.status,
    active: connection.active,
    connectionId: connection.connectionId,
    connectedAs: connection.connectedAs,
    identityVersion: connection.identityVersion,
    access: connection.access,
  };
}

async function resultWithConnections(
  userId: string,
  result: { ok: boolean; code: HelpdeskConnectionMessageCode },
): Promise<HelpdeskConnectionActionResult> {
  const connections = await listConnectionsForUser(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    userId,
  );

  return {
    ok: result.ok,
    code: result.code,
    connections: connections.map(workspaceSettingsConnection),
  };
}

export async function createHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await createConnection(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    formData,
  );

  return resultWithConnections(user.id, result);
}

export async function updateHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const workspaceId = textValue(formData, "connectionId");
  const result = await updateConnection(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    workspaceId,
    formData,
  );
  if (result.ok && result.connectionId) {
    await prismaTicketDetailCacheRepository.invalidateConnection({
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
    await invalidateAiSummaryConnectionCache({
      cacheRepository: prismaAiSummaryCacheRepository,
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
  }

  return resultWithConnections(user.id, result);
}

export async function validateHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await validateConnection(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    textValue(formData, "connectionId"),
  );
  if (result.ok && result.connectionId) {
    await prismaTicketDetailCacheRepository.invalidateConnection({
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
    await invalidateAiSummaryConnectionCache({
      cacheRepository: prismaAiSummaryCacheRepository,
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
  }

  return resultWithConnections(user.id, result);
}

export async function setActiveHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await setActiveConnection(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
  );

  return resultWithConnections(user.id, result);
}

export async function disableHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await disableConnection(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
  );
  if (result.ok && result.connectionId) {
    await prismaTicketDetailCacheRepository.invalidateConnection({
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
    await invalidateAiSummaryConnectionCache({
      cacheRepository: prismaAiSummaryCacheRepository,
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
  }

  return resultWithConnections(user.id, result);
}

export async function deleteHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await deleteConnection(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
  );
  if (result.ok && result.connectionId) {
    await prismaTicketDetailCacheRepository.invalidateConnection({
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
    await invalidateAiSummaryConnectionCache({
      cacheRepository: prismaAiSummaryCacheRepository,
      helpdeskConnectionId: result.connectionId,
      userId: user.id,
    });
  }

  return resultWithConnections(user.id, result);
}
