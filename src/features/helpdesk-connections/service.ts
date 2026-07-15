import { decryptSecret, encryptSecret } from "@/security/encryption";
import {
  normalizeProviderBaseUrl,
  validateProviderBaseUrl,
} from "@/security/base-url-validation";
import { ProviderError } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "./repository";
import type { HelpdeskConnectionMessageCode } from "./messages";
import type { ConnectionMutationResult } from "./service-types";
import { parseConnectionForm, textValue } from "./form-parsing";
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

function isValidationFailureCode(value: unknown): value is HelpdeskConnectionMessageCode {
  return typeof value === "string" && validationFailureCodes.has(value as HelpdeskConnectionMessageCode);
}

function encryptedCredential(payload: unknown, encryptionKey: string): string {
  return encryptSecret(JSON.stringify(payload), encryptionKey);
}

export async function createConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  formData: FormData,
): Promise<ConnectionMutationResult> {
  const parsed = parseConnectionForm(formData, registry, "create");
  if (typeof parsed === "string") return { ok: false, code: parsed };
  if (!parsed.credentialPayload) return { ok: false, code: "credential-required" };

  const validation = await validateWithProvider(registry.require(parsed.providerKey), {
    baseUrl: parsed.baseUrl,
    credentialScheme: parsed.credentialScheme,
    credentialPayload: parsed.credentialPayload,
  });
  if (isValidationFailureCode(validation)) return { ok: false, code: validation };

  const workspace = await repository.create({
    userId,
    providerKey: parsed.providerKey,
    displayName: parsed.displayName,
    baseUrl: validation.baseUrl,
    credentialScheme: parsed.credentialScheme,
    encryptedCredentialPayload: encryptedCredential(parsed.credentialPayload, encryptionKey),
    providerIdentityExternalId: validation.identity.externalId,
    providerIdentityDisplayName: validation.identity.displayName,
  });
  if (!(await repository.getActiveWorkspaceId(userId))) {
    await repository.setActiveWorkspaceId(userId, workspace.id);
  }
  return {
    ok: true,
    code: "created",
    workspaceId: workspace.id,
    connectionId: workspace.connection?.id,
  };
}

export async function updateConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  workspaceId: string,
  formData: FormData,
): Promise<ConnectionMutationResult> {
  const workspace = await repository.findWorkspaceForUser(userId, workspaceId);
  if (!workspace) return { ok: false, code: "connection-not-found" };
  const parsed = parseConnectionForm(formData, registry, "update", workspace.providerKey);
  if (typeof parsed === "string") return { ok: false, code: parsed };

  const mayEditWorkspace = workspace.access.role === "ADMIN";
  let requestedBaseUrl = workspace.baseUrl;
  if (mayEditWorkspace) {
    try {
      requestedBaseUrl = normalizeProviderBaseUrl(parsed.baseUrl);
    } catch {
      return { ok: false, code: "invalid-base-url" };
    }
  }
  const requestedName = mayEditWorkspace ? parsed.displayName : workspace.displayName;
  const baseUrlChanged = requestedBaseUrl !== workspace.baseUrl;
  if (baseUrlChanged && textValue(formData, "confirmBaseUrlChange") !== "yes") {
    return { ok: false, code: "base-url-change-confirmation-required" };
  }

  let validation: Awaited<ReturnType<typeof validateWithProvider>> | undefined;
  if (parsed.credentialPayload) {
    validation = await validateWithProvider(registry.require(workspace.providerKey), {
      baseUrl: requestedBaseUrl,
      credentialScheme: parsed.credentialScheme,
      credentialPayload: parsed.credentialPayload,
    });
    if (isValidationFailureCode(validation)) return { ok: false, code: validation };
    if (
      !baseUrlChanged &&
      workspace.connection?.providerIdentityExternalId &&
      workspace.connection.providerIdentityExternalId !== validation.identity.externalId
    ) {
      return { ok: false, code: "identity-change-requires-reconnect" };
    }
  } else if (baseUrlChanged) {
    try {
      requestedBaseUrl = (await validateProviderBaseUrl(requestedBaseUrl)).canonicalUrl;
    } catch {
      return { ok: false, code: "invalid-base-url" };
    }
  }

  if (mayEditWorkspace && (requestedName !== workspace.displayName || baseUrlChanged)) {
    const updated = await repository.updateWorkspace({
      userId, workspaceId, displayName: requestedName,
      baseUrl: validation && typeof validation !== "string" ? validation.baseUrl : requestedBaseUrl,
    });
    if (!updated) return { ok: false, code: "connection-not-found" };
  }

  if (!parsed.credentialPayload || !validation || typeof validation === "string") {
    if (!mayEditWorkspace) return { ok: false, code: "credential-required" };
    return { ok: true, code: "updated", workspaceId };
  }

  const personal = workspace.connection
    ? await repository.updatePersonalConnection({
        connectionId: workspace.connection.id,
        userId,
        credentialScheme: parsed.credentialScheme,
        encryptedCredentialPayload: encryptedCredential(parsed.credentialPayload, encryptionKey),
        providerIdentityExternalId: validation.identity.externalId,
        providerIdentityDisplayName: validation.identity.displayName,
        status: "active",
        rotateIdentityVersion: !workspace.connection.providerIdentityExternalId || baseUrlChanged,
      })
    : await repository.createPersonalConnection({
        workspaceId,
        userId,
        credentialScheme: parsed.credentialScheme,
        encryptedCredentialPayload: encryptedCredential(parsed.credentialPayload, encryptionKey),
        providerIdentityExternalId: validation.identity.externalId,
        providerIdentityDisplayName: validation.identity.displayName,
      });
  if (personal === "identity-taken") return { ok: false, code: "provider-identity-already-linked" };
  if (!personal) return { ok: false, code: "connection-not-found" };
  return { ok: true, code: "updated", workspaceId, connectionId: personal.id };
}

export async function validateConnection(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  workspaceId: string,
): Promise<ConnectionMutationResult> {
  const connection = await repository.findForUserWorkspace(userId, workspaceId);
  if (!connection?.credential) return { ok: false, code: "personal-connection-required" };
  const plugin = registry.get(connection.workspace.providerKey);
  if (!plugin) return { ok: false, code: "unknown-provider" };

  try {
    const validation = await validateExistingProviderConnection(plugin, {
      baseUrl: connection.workspace.baseUrl,
      credentialScheme: connection.credential.scheme,
      credentialPayload: JSON.parse(decryptSecret(connection.credential.encryptedPayload, encryptionKey)),
    });
    if (
      connection.providerIdentityExternalId &&
      connection.providerIdentityExternalId !== validation.identity.externalId
    ) {
      return { ok: false, code: "identity-change-requires-reconnect" };
    }
    const updated = await repository.updatePersonalConnection({
      connectionId: connection.id,
      userId,
      status: "active",
      providerIdentityExternalId: validation.identity.externalId,
      providerIdentityDisplayName: validation.identity.displayName,
      rotateIdentityVersion: !connection.providerIdentityExternalId,
    });
    if (updated === "identity-taken") return { ok: false, code: "provider-identity-already-linked" };
    return updated
      ? { ok: true, code: "validated", workspaceId, connectionId: connection.id }
      : { ok: false, code: "connection-not-found" };
  } catch (error) {
    await repository.updateStatus(userId, connection.id, statusForProviderError(error));
    if (error instanceof ProviderError) {
      logProviderValidationFailure(plugin, error, {
        baseUrl: connection.workspace.baseUrl,
        phase: "validate-existing-connection",
      });
    }
    return {
      ok: false,
      code: error instanceof ProviderError ? messageCodeForProviderError(error) : "invalid-base-url",
    };
  }
}

export async function setActiveConnection(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  workspaceId: string,
): Promise<ConnectionMutationResult> {
  const workspace = await repository.findWorkspaceForUser(userId, workspaceId);
  if (!workspace) return { ok: false, code: "connection-not-found" };
  await repository.setActiveWorkspaceId(userId, workspaceId);
  return { ok: true, code: "active-set", workspaceId };
}

export async function disableConnection(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  workspaceId: string,
): Promise<ConnectionMutationResult> {
  const connection = await repository.findForUserWorkspace(userId, workspaceId);
  if (!connection) return { ok: false, code: "personal-connection-required" };
  await repository.updateStatus(userId, connection.id, "disconnected");
  return { ok: true, code: "disabled", workspaceId, connectionId: connection.id };
}

export async function deleteConnection(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  workspaceId: string,
): Promise<ConnectionMutationResult> {
  const connection = await repository.findForUserWorkspace(userId, workspaceId);
  if (!connection) return { ok: false, code: "personal-connection-required" };
  const deleted = await repository.deleteForUser(userId, connection.id);
  return deleted
    ? { ok: true, code: "deleted", workspaceId, connectionId: connection.id }
    : { ok: false, code: "connection-not-found" };
}
