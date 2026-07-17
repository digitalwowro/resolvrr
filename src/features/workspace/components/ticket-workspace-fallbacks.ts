import type { LoadWorkspaceNotificationsAction, MarkWorkspaceNotificationsReadAction } from "@/features/notifications";
import type { SummarizeWorkspaceTicketAction } from "@/features/ai";
import type { LoadWorkspaceTicketDetailHydrationAction } from "@/features/workspace/ticket-detail-hydration";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";

export const unavailableTicketDetailAction: LoadWorkspaceTicketDetailHydrationAction =
  async () => ({
    status: "unavailable",
    reason: "provider-temporary-failure",
    retryable: true,
  });

export const unavailableLinkTargetSearchAction: SearchWorkspaceTicketLinkTargetsAction =
  async () => ({
    status: "unavailable",
    reason: "unsupported-capability",
    retryable: false,
  });

export const unavailableNotificationsAction: LoadWorkspaceNotificationsAction =
  async () => ({
    status: "unavailable",
    reason: "unsupported-capability",
    retryable: false,
  });

export const unavailableNotificationMarkReadAction: MarkWorkspaceNotificationsReadAction =
  async () => ({
    status: "failed",
    reason: "unsupported-capability",
    retryable: false,
  });

export const unavailableTicketAiSummaryAction: SummarizeWorkspaceTicketAction =
  async () => ({
    status: "unconfigured",
    reason: "ai-disabled",
    retryable: false,
  });
