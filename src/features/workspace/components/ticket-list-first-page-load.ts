import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListPageLoadResult,
  WorkspaceTicketListPageRequest,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import { savedViewListRequest } from "./ticket-list-pager-rows";

export async function loadFirstTicketListPage(
  loadAction: LoadWorkspaceTicketListPageAction,
  savedViewId: string,
  sort?: WorkspaceTicketListSort,
): Promise<WorkspaceTicketListPageLoadResult> {
  return loadTicketListPageSafely(loadAction, {
    ...savedViewListRequest(savedViewId),
    ...(sort ? { sort } : {}),
  });
}

export async function loadTicketListPageSafely(
  loadAction: LoadWorkspaceTicketListPageAction,
  request: WorkspaceTicketListPageRequest,
): Promise<WorkspaceTicketListPageLoadResult> {
  try {
    return await loadAction(request);
  } catch {
    return {
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    };
  }
}
