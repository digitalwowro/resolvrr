import type { ProviderRegistry } from "@/providers";
import type {
  HelpdeskConnectionsRepository,
  StoredHelpdeskConnection,
} from "./repository";
import type {
  ConnectionListItem,
  ConnectionProviderOption,
} from "./service-types";

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
