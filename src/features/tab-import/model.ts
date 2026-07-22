import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";

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
