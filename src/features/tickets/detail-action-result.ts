import type { TicketReadUnavailable } from "./read-model";
import type { TicketMergeResolution } from "@/core/tickets";
import type { WorkspaceTicketDetail } from "./workspace-adapter";
import type { TicketDetailCacheLoadOptions } from "./cache-repository";

export type WorkspaceTicketDetailLoadResult =
  | {
      status: "available";
      detail: WorkspaceTicketDetail;
      resolution?: TicketMergeResolution;
    }
  | {
      status: "retired";
      reason: "merged-target-unavailable";
      retryable: false;
      sourceExternalId: string;
      sourceNumber?: string;
    }
  | TicketReadUnavailable;

export type LoadWorkspaceTicketDetailAction = (
  ticketExternalId: string,
  options?: TicketDetailCacheLoadOptions,
) => Promise<WorkspaceTicketDetailLoadResult>;
