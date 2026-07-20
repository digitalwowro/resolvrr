import { ProviderError, type ProviderContext } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskProviderPlugin } from "@/core/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import { decryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import {
  recordTicketReadTiming,
  ticketReadTimingDuration,
  ticketReadTimingStart,
  type TicketReadOperation,
} from "@/telemetry/ticket-read-timing";
import { unavailableTicketRead, type TicketReadUnavailable } from "./read-model";

export type TicketProviderContext = {
  plugin: HelpdeskProviderPlugin;
  context: ProviderContext;
};

export type TicketProviderContextResult =
  | { status: "available"; value: TicketProviderContext }
  | TicketReadUnavailable;

export async function loadActiveTicketProviderContext(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  operation: TicketReadOperation,
): Promise<TicketProviderContextResult> {
  const lookupStart = ticketReadTimingStart();
  const activeWorkspaceId = await repository.getActiveWorkspaceId(userId);
  if (!activeWorkspaceId) {
    recordTicketReadTiming({
      durationMs: ticketReadTimingDuration(lookupStart),
      operation,
      phase: "active-connection-lookup",
      reason: "no-active-connection",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("no-active-connection");
  }

  const connection = await repository.findForUserWorkspace(userId, activeWorkspaceId);
  if (!connection) {
    recordTicketReadTiming({
      durationMs: ticketReadTimingDuration(lookupStart),
      operation,
      phase: "active-connection-lookup",
      reason: "personal-connection-required",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("personal-connection-required");
  }

  return loadTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    connection,
    operation,
    lookupStart,
  );
}

export async function loadTicketProviderContextForConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  connectionId: string,
  operation: TicketReadOperation,
): Promise<TicketProviderContextResult> {
  const lookupStart = ticketReadTimingStart();
  const connection = await repository.findForUser(userId, connectionId);
  if (!connection) return unavailableTicketRead("no-active-connection");
  return loadTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    connection,
    operation,
    lookupStart,
  );
}

async function loadTicketProviderContext(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  connection: NonNullable<Awaited<ReturnType<HelpdeskConnectionsRepository["findForUser"]>>>,
  operation: TicketReadOperation,
  lookupStart: number,
): Promise<TicketProviderContextResult> {
  void repository;
  if (connection.status !== "active") {
    recordTicketReadTiming({
      connectionId: connection.id,
      durationMs: ticketReadTimingDuration(lookupStart),
      operation,
      phase: "active-connection-lookup",
      providerKey: connection.workspace.providerKey,
      reason: "inactive-connection",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("inactive-connection");
  }
  if (!connection.credential) {
    recordTicketReadTiming({
      connectionId: connection.id,
      durationMs: ticketReadTimingDuration(lookupStart),
      operation,
      phase: "active-connection-lookup",
      providerKey: connection.workspace.providerKey,
      reason: "missing-credentials",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("missing-credentials");
  }

  const plugin = registry.get(connection.workspace.providerKey);
  if (!plugin) {
    recordTicketReadTiming({
      connectionId: connection.id,
      durationMs: ticketReadTimingDuration(lookupStart),
      operation,
      phase: "active-connection-lookup",
      providerKey: connection.workspace.providerKey,
      reason: "unknown-provider",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("unknown-provider");
  }
  recordTicketReadTiming({
    connectionId: connection.id,
    durationMs: ticketReadTimingDuration(lookupStart),
    operation,
    phase: "active-connection-lookup",
    providerKey: connection.workspace.providerKey,
    status: "ok",
  });

  let validated: Awaited<ReturnType<typeof validateProviderBaseUrl>>;
  const revalidationStart = ticketReadTimingStart();
  try {
    validated = await validateProviderBaseUrl(connection.workspace.baseUrl);
    recordTicketReadTiming({
      connectionId: connection.id,
      durationMs: ticketReadTimingDuration(revalidationStart),
      operation,
      phase: "base-url-security-revalidation",
      providerKey: connection.workspace.providerKey,
      status: "ok",
    });
  } catch {
    recordTicketReadTiming({
      connectionId: connection.id,
      durationMs: ticketReadTimingDuration(revalidationStart),
      operation,
      phase: "base-url-security-revalidation",
      providerKey: connection.workspace.providerKey,
      reason: "invalid-connection",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("invalid-connection");
  }

  let credentialPayload: unknown;
  const decryptStart = ticketReadTimingStart();
  try {
    credentialPayload = JSON.parse(
      decryptSecret(connection.credential.encryptedPayload, encryptionKey),
    );
  } catch {
    recordTicketReadTiming({
      connectionId: connection.id,
      durationMs: ticketReadTimingDuration(decryptStart),
      operation,
      phase: "credential-decrypt",
      providerKey: connection.workspace.providerKey,
      reason: "invalid-connection",
      retryable: false,
      status: "unavailable",
    });
    return unavailableTicketRead("invalid-connection");
  }
  recordTicketReadTiming({
    connectionId: connection.id,
    durationMs: ticketReadTimingDuration(decryptStart),
    operation,
    phase: "credential-decrypt",
    providerKey: connection.workspace.providerKey,
    status: "ok",
  });

  return {
    status: "available",
    value: {
      plugin,
      context: {
        connection: {
          id: connection.id,
          workspaceId: connection.workspaceId,
          identityVersion: connection.identityVersion,
          providerKey: connection.workspace.providerKey,
          displayName: connection.workspace.displayName,
          baseUrl: validated.canonicalUrl,
          status: connection.status,
        },
        credentialScheme: connection.credential.scheme,
        credentialPayload,
        requestSecurity: {
          validatedAddresses: validated.addresses,
        },
      },
    },
  };
}

export function readUnavailableForProviderError(
  error: unknown,
): TicketReadUnavailable {
  if (!(error instanceof ProviderError)) {
    return unavailableTicketRead("provider-temporary-failure", true);
  }

  if (error.kind === "credential-auth-failure") {
    return unavailableTicketRead("provider-auth-failed");
  }
  if (error.kind === "permission-denied") {
    return unavailableTicketRead("provider-permission-denied");
  }
  if (error.kind === "rate-limited") {
    return unavailableTicketRead("provider-rate-limited", true);
  }
  if (error.kind === "temporary-provider-failure") {
    return unavailableTicketRead("provider-temporary-failure", true);
  }
  if (error.kind === "unsupported-capability") {
    return unavailableTicketRead("unsupported-capability");
  }
  if (
    error.kind === "validation-failure" &&
    error.diagnosticCode === "invalid-search-query"
  ) {
    return unavailableTicketRead("invalid-search-query");
  }

  return unavailableTicketRead("provider-unexpected-response", error.retryable);
}
