import { decryptSecret, encryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type {
  HelpdeskConnectionsRepository,
  StoredHelpdeskConnection,
} from "./repository";
import type { HelpdeskConnectionMessageCode } from "./messages";
import { parseConnectionForm } from "./form-parsing";
import {
  statusForProviderError,
  validateExistingProviderConnection,
  validateWithProvider,
} from "./provider-validation";

export type ConnectionProviderOption = {
  key: string;
  label: string;
  credentialSchemes: HelpdeskProviderPlugin["credentialSchemes"];
};

export type ConnectionListItem = StoredHelpdeskConnection & {
  providerLabel: string;
  active: boolean;
};

export type ConnectionMutationResult =
  | { ok: true; connectionId?: string; code: HelpdeskConnectionMessageCode }
  | { ok: false; code: HelpdeskConnectionMessageCode };

function providerOptions(registry: ProviderRegistry): ConnectionProviderOption[] {
  return registry.list().map((provider) => ({
    key: provider.key,
    label: provider.label,
    credentialSchemes: provider.credentialSchemes,
  }));
}

export function listConnectionProviderOptions(
  registry: ProviderRegistry,
): ConnectionProviderOption[] {
  return providerOptions(registry);
}

export async function listConnectionsForUser(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  userId: string,
): Promise<ConnectionListItem[]> {
  const [connections, activeConnectionId] = await Promise.all([
    repository.listForUser(userId),
    repository.getActiveConnectionId(userId),
  ]);

  return connections.map((connection) => ({
    ...connection,
    providerLabel:
      registry.get(connection.providerKey)?.label ?? connection.providerKey,
    active: connection.id === activeConnectionId,
  }));
}

export async function getConnectionForEdit(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  connectionId: string,
): Promise<StoredHelpdeskConnection | null> {
  const connection = await repository.findForUser(userId, connectionId);
  if (!connection) {
    return null;
  }

  return {
    id: connection.id,
    userId: connection.userId,
    providerKey: connection.providerKey,
    displayName: connection.displayName,
    baseUrl: connection.baseUrl,
    status: connection.status,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
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
  if (validation === "invalid-base-url" || validation === "provider-validation-failed") {
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

  const parsed = parseConnectionForm(formData, registry, "update");
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
    existing.providerKey !== parsed.providerKey ||
    Boolean(parsed.credentialPayload);

  const updated = await repository.update({
    id: connectionId,
    userId,
    displayName: parsed.displayName,
    baseUrl: canonicalBaseUrl,
    status: metadataChanged ? "disconnected" : undefined,
    ...credentialUpdate,
  });

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
    return {
      ok: false,
      code:
        error instanceof ProviderError
          ? "provider-validation-failed"
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

  await repository.setActiveConnectionId(userId, connectionId);
  return { ok: true, code: "active-set", connectionId };
}

export async function setConnectionEnabled(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  connectionId: string,
  enabled: boolean,
): Promise<ConnectionMutationResult> {
  const updated = await repository.updateStatus(
    userId,
    connectionId,
    enabled ? "active" : "disconnected",
  );
  if (!updated) {
    return { ok: false, code: "connection-not-found" };
  }

  if (!enabled && (await repository.getActiveConnectionId(userId)) === connectionId) {
    await repository.clearActiveConnectionId(userId);
  }

  return { ok: true, code: enabled ? "enabled" : "disabled", connectionId };
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
