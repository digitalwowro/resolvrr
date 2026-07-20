import type { WorkspaceTicketSearchProps } from "./workspace-ticket-search";
import type { useTicketSearchController } from "./use-ticket-search-controller";

type SearchController = ReturnType<typeof useTicketSearchController>;

export function workspaceTicketSearchProps({
  controller,
  onSelectTicket,
  onSubmit,
}: {
  controller: SearchController;
  onSelectTicket(ticketId: string): void;
  onSubmit(): void;
}): WorkspaceTicketSearchProps {
  return {
    enabled: controller.enabled,
    error: controller.quickError,
    loading: controller.quickLoading,
    onQueryChange: controller.setQuery,
    onSelectTicket,
    onSubmit,
    query: controller.query,
    rows: controller.quickRows,
    totalCount: controller.quickTotalCount,
  };
}
