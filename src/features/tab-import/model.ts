import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketDetailLoadResult } from "@/features/tickets/detail-action-result";

type WorkspaceTabImportAvailable = {
  status: "available";
  ticketExternalIds: string[];
};

type WorkspaceTabImportUnavailable = {
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
