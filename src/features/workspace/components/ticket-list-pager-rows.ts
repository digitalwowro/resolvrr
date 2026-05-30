import { allTicketsSavedViewId } from "@/features/saved-views/workspace";
import type {
  WorkspaceTicketListPageRequest,
} from "@/features/tickets/list-page-action-result";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";

export function savedViewListRequest(
  savedViewId: string,
): Pick<WorkspaceTicketListPageRequest, "savedViewId"> {
  return savedViewId === allTicketsSavedViewId ? {} : { savedViewId };
}

export function appendUniqueRows(
  current: WorkspaceTicketRow[],
  incoming: WorkspaceTicketRow[],
) {
  const existingIds = new Set(current.map((row) => row.id));
  return [
    ...current,
    ...incoming.filter((row) => {
      if (existingIds.has(row.id)) {
        return false;
      }
      existingIds.add(row.id);
      return true;
    }),
  ];
}

export function ticketListIdentity(rows: WorkspaceTicketRow[]) {
  return rows.map((row) => row.id).join("\0");
}

export function mergeRefreshedBaselineRows(
  current: WorkspaceTicketRow[],
  baselineRows: WorkspaceTicketRow[],
) {
  const baselineIds = new Set(baselineRows.map((row) => row.id));
  return [
    ...baselineRows,
    ...current.filter((row) => !baselineIds.has(row.id)),
  ];
}
