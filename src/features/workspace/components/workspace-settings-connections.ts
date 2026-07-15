import type { WorkspaceSettingsConnection } from "@/features/helpdesk-connections/service-types";
import type { WorkspaceMenuConnection } from "./workspace-header";

export function workspaceSettingsConnectionFromMenu(
  connection: WorkspaceMenuConnection,
): WorkspaceSettingsConnection {
  return {
    id: connection.id,
    label: connection.label,
    providerKey: connection.providerKey ?? "unknown",
    providerLabel: connection.providerLabel ?? connection.providerKey ?? "Unknown provider",
    baseUrl: connection.baseUrl ?? "",
    status: connection.status ?? "disconnected",
    active: connection.active,
    connectionId: connection.connectionId ?? null,
    connectedAs: connection.connectedAs ?? null,
    identityVersion: connection.identityVersion ?? null,
    access: connection.access ?? {
      role: "AGENT",
      canEditAiRephraseStyleOverrides: false,
      canEditMyStyle: false,
    },
  };
}
