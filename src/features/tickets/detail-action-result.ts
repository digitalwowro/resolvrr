import type { TicketReadUnavailable } from "./read-model";
import type { WorkspaceTicketDetail } from "./workspace-adapter";
import type { TicketDetailCacheLoadOptions } from "./cache-repository";

export type WorkspaceTicketDetailLoadResult =
  | {
      status: "available";
      detail: WorkspaceTicketDetail;
    }
  | TicketReadUnavailable;

export type LoadWorkspaceTicketDetailAction = (
  ticketExternalId: string,
  options?: TicketDetailCacheLoadOptions,
) => Promise<WorkspaceTicketDetailLoadResult>;
