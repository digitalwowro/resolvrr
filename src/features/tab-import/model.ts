import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketDetailLoadResult } from "@/features/tickets/detail-action-result";

export type WorkspaceTabImportAvailable = {
  status: "available";
  ticketExternalIds: string[];
};

export type WorkspaceTabImportUnavailable = {
  status: "unavailable";
  reason: TicketReadUnavailableReason | "tab-import-incompatible";
  retryable: boolean;
};

export type WorkspaceTabImportResult =
  | WorkspaceTabImportAvailable
  | WorkspaceTabImportUnavailable;

export type WorkspaceTabImportHydrationInput = {
  helpdeskConnectionId: string;
  identityVersion: string;
  ticketExternalId: string;
  workspaceId: string;
};

export type HydrateWorkspaceTabImportAction = (
  input: WorkspaceTabImportHydrationInput,
) => Promise<WorkspaceTicketDetailLoadResult>;
