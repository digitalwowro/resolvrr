import type { TicketReadUnavailable } from "./read-model";
import type { WorkspaceTicketDetail } from "./workspace-adapter";

export type WorkspaceTicketDetailLoadResult =
  | {
      status: "available";
      detail: WorkspaceTicketDetail;
    }
  | TicketReadUnavailable;

export type LoadWorkspaceTicketDetailAction = (
  ticketExternalId: string,
) => Promise<WorkspaceTicketDetailLoadResult>;
