import type { HelpdeskProviderPlugin } from "@/core/providers";
import type {
  AccessibleWorkspace,
  WorkspaceAccess,
} from "./repository";
import type { HelpdeskConnectionMessageCode } from "./messages";

export type ConnectionProviderOption = {
  key: string;
  label: string;
  credentialSchemes: HelpdeskProviderPlugin["credentialSchemes"];
};

export type ConnectionListItem = AccessibleWorkspace & {
  providerLabel: string;
  active: boolean;
  connectionId: string | null;
  status: "active" | "disconnected" | "auth_failed";
  connectedAs: string | null;
  identityVersion: string | null;
};

export type ConnectionMutationResult =
  | { ok: true; workspaceId?: string; connectionId?: string; code: HelpdeskConnectionMessageCode }
  | { ok: false; code: HelpdeskConnectionMessageCode };

export type WorkspaceSettingsConnection = {
  id: string;
  label: string;
  providerKey: string;
  providerLabel: string;
  baseUrl: string;
  status: ConnectionListItem["status"];
  active: boolean;
  connectionId?: string | null;
  connectedAs?: string | null;
  identityVersion?: string | null;
  access?: WorkspaceAccess;
};

export type HelpdeskConnectionActionResult = {
  ok: boolean;
  code: HelpdeskConnectionMessageCode;
  connections: WorkspaceSettingsConnection[];
};

export type HelpdeskConnectionFormAction = (
  formData: FormData,
) => Promise<HelpdeskConnectionActionResult>;
