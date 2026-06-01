import type { TicketLinkTarget } from "@/core/tickets";
import type { TicketReadUnavailable } from "./read-model";

export type WorkspaceTicketLinkTarget = TicketLinkTarget;

export type WorkspaceTicketLinkTargetSearchRequest = {
  excludeTicketExternalId?: string;
  query: string;
};

export type WorkspaceTicketLinkTargetSearchResult =
  | {
      status: "available";
      targets: WorkspaceTicketLinkTarget[];
    }
  | TicketReadUnavailable;

export type SearchWorkspaceTicketLinkTargetsAction = (
  request: WorkspaceTicketLinkTargetSearchRequest,
) => Promise<WorkspaceTicketLinkTargetSearchResult>;
