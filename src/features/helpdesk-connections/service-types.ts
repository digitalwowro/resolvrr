import type { HelpdeskProviderPlugin } from "@/core/providers";
import type { StoredHelpdeskConnection } from "./repository";
import type { HelpdeskConnectionMessageCode } from "./messages";

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

export type WorkspaceSettingsConnection = {
  id: string;
  label: string;
  providerKey: string;
  providerLabel: string;
  baseUrl: string;
  status: ConnectionListItem["status"];
  active: boolean;
};

export type HelpdeskConnectionActionResult = {
  ok: boolean;
  code: HelpdeskConnectionMessageCode;
  connections: WorkspaceSettingsConnection[];
};

export type HelpdeskConnectionFormAction = (
  formData: FormData,
) => Promise<HelpdeskConnectionActionResult>;
