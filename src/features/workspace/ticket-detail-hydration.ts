import type { TicketAiSummaryResult } from "@/features/ai";
import type {
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type { TicketDetailCacheLoadOptions } from "@/features/tickets/cache-repository";

export type InitialTicketAiSummary = {
  result: Extract<TicketAiSummaryResult, { status: "available" }>;
  ticketId: string;
};

type AvailableTicketDetail = Extract<
  WorkspaceTicketDetailLoadResult,
  { status: "available" }
>;

export type WorkspaceTicketDetailHydrationResult =
  | (AvailableTicketDetail & {
      initialTicketAiSummary?: InitialTicketAiSummary;
      summaryHydrated?: true;
    })
  | Exclude<WorkspaceTicketDetailLoadResult, { status: "available" }>;

export type LoadWorkspaceTicketDetailHydrationAction = (
  ticketExternalId: string,
  options?: TicketDetailCacheLoadOptions,
) => Promise<WorkspaceTicketDetailHydrationResult>;
