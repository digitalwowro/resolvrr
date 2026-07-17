import type {
  TicketSignatureContext,
  TicketSignatureSource,
} from "@/core/ticket-signatures";
import type { ProviderLookupOption } from "@/core/providers";

export type WorkspaceSignatureTemplateData = {
  bodyHtml: string;
  contextVersion: string;
  groupExternalId?: string;
  id: string;
};

export type WorkspaceSignatureSettingsData = {
  canManage: boolean;
  groupOptions: ProviderLookupOption[];
  source: TicketSignatureSource;
  templates: WorkspaceSignatureTemplateData[];
  workspaceLabel: string;
};

export type WorkspaceSignatureSettingsResult = {
  data: WorkspaceSignatureSettingsData;
  message: string;
  ok: boolean;
};

export type TicketSignaturePreviewResult =
  | { status: "available"; signature: TicketSignatureContext }
  | {
      status: "unavailable";
      message: string;
      retryable: boolean;
    };

export type LoadTicketSignaturePreviewAction = (input: {
  groupExternalId?: string;
  ticketExternalId: string;
}) => Promise<TicketSignaturePreviewResult>;

export type LoadWorkspaceSignatureSettingsAction =
  () => Promise<WorkspaceSignatureSettingsData>;

export type SaveWorkspaceSignatureSourceAction = (
  source: TicketSignatureSource,
) => Promise<WorkspaceSignatureSettingsResult>;

export type SaveWorkspaceSignatureTemplateAction = (input: {
  bodyHtml: string;
  groupExternalId?: string;
}) => Promise<WorkspaceSignatureSettingsResult>;

export type DeleteWorkspaceSignatureTemplateAction = (input: {
  groupExternalId?: string;
}) => Promise<WorkspaceSignatureSettingsResult>;
