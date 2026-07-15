import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "./repository";
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
  const [workspaces, activeWorkspaceId] = await Promise.all([
    repository.listForUser(userId),
    repository.getActiveWorkspaceId(userId),
  ]);

  return workspaces.map((workspace) => ({
    ...workspace,
    providerLabel:
      registry.get(workspace.providerKey)?.label ?? workspace.providerKey,
    active: workspace.id === activeWorkspaceId,
    connectionId: workspace.connection?.id ?? null,
    status: workspace.connection?.status ?? "disconnected",
    connectedAs: workspace.connection?.providerIdentityDisplayName ?? null,
    identityVersion: workspace.connection?.identityVersion ?? null,
  }));
}

export async function getConnectionForEdit(
  repository: HelpdeskConnectionsRepository,
  userId: string,
  workspaceId: string,
): ReturnType<HelpdeskConnectionsRepository["findWorkspaceForUser"]> {
  return repository.findWorkspaceForUser(userId, workspaceId);
}
