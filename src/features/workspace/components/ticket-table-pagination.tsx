import { Button } from "@/components/ui";

type TicketTablePaginationProps = {
  loadedCount: number;
  loadingMore: boolean;
  loadMoreError?: string;
  nextCursor?: string;
  onLoadMore?(): void;
  totalCount?: number;
};

export function TicketTablePagination({
  loadedCount,
  loadingMore,
  loadMoreError,
  nextCursor,
  onLoadMore,
  totalCount,
}: TicketTablePaginationProps) {
  const loadSummary =
    totalCount === undefined
      ? `${loadedCount} loaded`
      : `${loadedCount} of ${totalCount} loaded`;

  return (
    <div className="sticky bottom-0 flex h-11 items-center justify-between border-t border-slate-200 bg-white px-3 text-xs text-slate-600">
      <span>{loadSummary}</span>
      <div className="flex items-center gap-2">
        {loadMoreError ? (
          <span className="text-rose-700">Could not load more tickets.</span>
        ) : null}
        {nextCursor && onLoadMore ? (
          <Button
            className="h-8 px-2 text-xs"
            loading={loadingMore}
            onClick={onLoadMore}
            type="button"
            variant="secondary"
          >
            Load more
          </Button>
        ) : null}
      </div>
    </div>
  );
}
