import type { WorkspaceTicketListSort } from "@/features/tickets/list-page-action-result";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import type { useCompleteTicketListSort } from "./use-complete-ticket-list-sort";

type CompleteSort = ReturnType<typeof useCompleteTicketListSort>;

export function useTicketListPagerCompleteValues({
  completeSort,
  fallback,
}: {
  completeSort: CompleteSort;
  fallback: {
    canLoadMore: boolean;
    hasMorePages: boolean;
    loadedCount: number;
    loading: boolean;
    loadMore(): Promise<void>;
    rows: WorkspaceTicketRow[];
    silentRefreshCurrentPage(): Promise<void>;
    silentRefreshing: boolean;
    sort?: WorkspaceTicketListSort;
    totalCount?: number;
  };
}) {
  const hiddenCompleteRows = completeSort.active &&
    (completeSort.visibleCount ?? 0) < (completeSort.totalCount ?? 0);
  return {
    canLoadMore: completeSort.active ? hiddenCompleteRows : fallback.canLoadMore,
    hasMorePages: completeSort.active ? hiddenCompleteRows : fallback.hasMorePages,
    loadedCount: completeSort.visibleCount ?? fallback.loadedCount,
    loading: fallback.loading || completeSort.loading,
    loadMore: completeSort.active ? completeSort.showMore : fallback.loadMore,
    rows: completeSort.rows ?? fallback.rows,
    silentRefreshCurrentPage: completeSort.active
      ? completeSort.refresh
      : fallback.silentRefreshCurrentPage,
    silentRefreshing: fallback.silentRefreshing || completeSort.loading,
    sort: completeSort.sort ?? fallback.sort,
    totalCount: completeSort.totalCount ?? fallback.totalCount,
  };
}
