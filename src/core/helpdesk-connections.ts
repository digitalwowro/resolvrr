export type HelpdeskProviderKey = string;

export type HelpdeskConnectionStatus =
  | "active"
  | "disconnected"
  | "auth_failed";

export type HelpdeskConnection = {
  id: string;
  workspaceId: string;
  identityVersion: string;
  providerKey: HelpdeskProviderKey;
  displayName: string;
  baseUrl: string;
  status: HelpdeskConnectionStatus;
};
