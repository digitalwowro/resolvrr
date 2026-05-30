import { decryptSecret, encryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import { ProviderError } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "./repository";
import type { HelpdeskConnectionMessageCode } from "./messages";
import type { ConnectionMutationResult } from "./service-types";
import { parseConnectionForm } from "./form-parsing";
import {
  logProviderValidationFailure,
  messageCodeForProviderError,
  statusForProviderError,
  validateExistingProviderConnection,
  validateWithProvider,
} from "./provider-validation";

export type {
  ConnectionListItem,
  ConnectionMutationResult,
  ConnectionProviderOption,
} from "./service-types";
export {
  getConnectionForEdit,
  listConnectionProviderOptions,
  listConnectionsForUser,
} from "./service-listing";

const validationFailureCodes = new Set<HelpdeskConnectionMessageCode>([
  "invalid-base-url",
  "provider-validation-failed",
  "provider-auth-failed",
  "provider-permission-denied",
  "provider-rate-limited",
  "provider-temporary-failure",
  "provider-unexpected-response",
]);

function isValidationFailureCode(
  value: string,
): value is HelpdeskConnectionMessageCode {
  return validationFailureCodes.has(value as HelpdeskConnectionMessageCode);
}

export async function createConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  formData: FormData,
): Promise<ConnectionMutationResult> {
  const parsed = parseConnectionForm(formData, registry, "create");
  if (typeof parsed === "string") {
    return { ok: false, code: parsed };
  }

  if (!parsed.credentialPayload) {
    return { ok: false, code: "credential-required" };
  }

  const plugin = registry.require(parsed.providerKey);
  const validation = await validateWithProvider(plugin, {
    baseUrl: parsed.baseUrl,
    credentialScheme: parsed.credentialScheme,
    credentialPayload: parsed.credentialPayload,
  });
  if (isValidationFailureCode(validation)) {
    return { ok: false, code: validation };
  }

  const connection = await repository.create({
    userId,
    providerKey: parsed.providerKey,
    displayName: parsed.displayName,
    baseUrl: validation,
    status: "active",
    credentialScheme: parsed.credentialScheme,
    encryptedCredentialPayload: encryptSecret(
      JSON.stringify(parsed.credentialPayload),
      encryptionKey,
    ),
  });

  if (!(await repository.getActiveConnectionId(userId))) {
    await repository.setActiveConnectionId(userId, connection.id);
  }

  return { ok: true, code: "created", connectionId: connection.id };
}

export async function updateConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  connectionId: string,
  formData: FormData,
): Promise<ConnectionMutationResult> {
  const existing = await repository.findForUser(userId, connectionId);
  if (!existing) {
    return { ok: false, code: "connection-not-found" };
  }

  const parsed = parseConnectionForm(formData, registry, "update", existing.providerKey);
  if (typeof parsed === "string") {
    return { ok: false, code: parsed };
  }

  let canonicalBaseUrl: string;
  try {
    canonicalBaseUrl = (await validateProviderBaseUrl(parsed.baseUrl)).canonicalUrl;
  } catch {
    return { ok: false, code: "invalid-base-url" };
  }

  const credentialUpdate = parsed.credentialPayload
    ? {
        credentialScheme: parsed.credentialScheme,
        encryptedCredentialPayload: encryptSecret(
          JSON.stringify(parsed.credentialPayload),
          encryptionKey,
        ),
      }
    : {};

  const metadataChanged =
    existing.baseUrl !== canonicalBaseUrl ||
    Boolean(parsed.credentialPayload);

  const updated = await repository.update({
    id: connectionId,
    userId,
    displayName: parsed.displayName,
    baseUrl: canonicalBaseUrl,
    status: metadataChanged ? "disconnected" : undefined,
    ...credentialUpdate,
  });

  if (
    metadataChanged &&
    (await repository.getActiveConnectionId(userId)) === connectionId
  ) {
    await repository.clearActiveConnectionId(userId);
  }

  return updated
    ? { ok: true, code: "updated", connectionId }
    : { ok: false, code: "connection-not-found" };
}

export async function validateConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  connectionId: string,
): Promise<ConnectionMutationResult> {
  const connection = await repository.findForUser(userId, connectionId);
  if (!connection?.credential) {
    return { ok: false, code: "connection-not-found" };
  }

  const plugin = registry.get(connection.providerKey);
  if (!plugin) {
    return { ok: false, code: "unknown-provider" };
  }

  const credentialPayload = JSON.parse(
    decryptSecret(connection.credential.encryptedPayload, encryptionKey),
  );

  try {
    await validateExistingProviderConnection(plugin, {
      baseUrl: connection.baseUrl,
      credentialScheme: connection.credential.scheme,
      credentialPayload,
    });
    await repository.updateStatus(userId, connectionId, "active");
    return { ok: true, code: "validated", connectionId };
  } catch (error) {
    await repository.updateStatus(
      userId,
      connectionId,
      statusForProviderError(error),
    );
    if ((await repository.getActiveConnectionId(userId)) === connectionId) {
      await repository.clearActiveConnectionId(userId);
    }
    if (error instanceof ProviderError) {
      logProviderValidationFailure(plugin, error, {
        baseUrl: connection.baseUrl,
        phase: "validate-existing-connection",
      });
    }
    return {
      ok: false,
      code:
        error instanceof ProviderError
          ? messageCodeForProviderError(error)
          : "invalid-base-url",
    };
  }
}

export async function setActiveConnection(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  connectionId: string,
): Promise<ConnectionMutationResult> {
  const connection = await repository.findForUser(userId, connectionId);
  if (!connection) {
    return { ok: false, code: "connection-not-found" };
  }
  if (connection.status !== "active") {
    return { ok: false, code: "connection-not-active" };
  }

  await repository.setActiveConnectionId(userId, connectionId);
  return { ok: true, code: "active-set", connectionId };
}

export async function disableConnection(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  connectionId: string,
): Promise<ConnectionMutationResult> {
  const updated = await repository.updateStatus(
    userId,
    connectionId,
    "disconnected",
  );
  if (!updated) {
    return { ok: false, code: "connection-not-found" };
  }

  if ((await repository.getActiveConnectionId(userId)) === connectionId) {
    await repository.clearActiveConnectionId(userId);
  }

  return { ok: true, code: "disabled", connectionId };
}

export async function deleteConnection(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  connectionId: string,
): Promise<ConnectionMutationResult> {
  const activeConnectionId = await repository.getActiveConnectionId(userId);
  const deleted = await repository.deleteForUser(userId, connectionId);
  if (!deleted) {
    return { ok: false, code: "connection-not-found" };
  }

  if (activeConnectionId === connectionId) {
    await repository.clearActiveConnectionId(userId);
  }

  return { ok: true, code: "deleted" };
}
