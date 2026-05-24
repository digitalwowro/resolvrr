import { ProviderError, type ProviderContext } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskProviderPlugin } from "@/core/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import { decryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
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
): Promise<TicketProviderContextResult> {
  const activeConnectionId = await repository.getActiveConnectionId(userId);
  if (!activeConnectionId) {
    return unavailableTicketRead("no-active-connection");
  }

  const connection = await repository.findForUser(userId, activeConnectionId);
  if (!connection) {
    return unavailableTicketRead("no-active-connection");
  }
  if (connection.status !== "active") {
    return unavailableTicketRead("inactive-connection");
  }
  if (!connection.credential) {
    return unavailableTicketRead("missing-credentials");
  }

  const plugin = registry.get(connection.providerKey);
  if (!plugin) {
    return unavailableTicketRead("unknown-provider");
  }

  let validated: Awaited<ReturnType<typeof validateProviderBaseUrl>>;
  let credentialPayload: unknown;
  try {
    validated = await validateProviderBaseUrl(connection.baseUrl);
    credentialPayload = JSON.parse(
      decryptSecret(connection.credential.encryptedPayload, encryptionKey),
    );
  } catch {
    return unavailableTicketRead("invalid-connection");
  }

  return {
    status: "available",
    value: {
      plugin,
      context: {
        connection: {
          id: connection.id,
          providerKey: connection.providerKey,
          displayName: connection.displayName,
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

  return unavailableTicketRead("provider-unexpected-response", error.retryable);
}
