import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
  WorkspaceTicketListPageLoadResult,
  WorkspaceTicketListPageRequest,
} from "@/features/tickets/list-page-action-result";
import { appendUniqueRows } from "./ticket-list-pager-rows";

type AvailableResult = Extract<
  WorkspaceTicketListPageLoadResult,
  { status: "available" }
>;

export type AuthoritativeListRefreshResult =
  | {
      status: "unavailable";
      result: Exclude<WorkspaceTicketListPageLoadResult, AvailableResult>;
    }
  | {
      status: "available";
      result: AvailableResult;
      loadedPageCount: number;
      loadedGroupPageCounts: Map<string, number>;
    };

async function refreshGroupWindow({
  group,
  groupBy,
  load,
  pageCount,
  request,
}: {
  group: WorkspaceTicketListGroup;
  groupBy: "state" | "priority";
  load: LoadWorkspaceTicketListPageAction;
  pageCount: number;
  request: WorkspaceTicketListPageRequest;
}): Promise<
  | { status: "available"; group: WorkspaceTicketListGroup; pageCount: number }
  | { status: "unavailable"; result: Exclude<WorkspaceTicketListPageLoadResult, AvailableResult> }
> {
  let rows = group.rows;
  let nextCursor = group.nextCursor;
  let loadedPages = 1;
  let totalCount = group.totalCount;

  while (loadedPages < pageCount && nextCursor) {
    const result = await load({
      ...request,
      bucketValue: group.value,
      cursor: nextCursor,
      group: groupBy,
    });
    if (result.status === "unavailable") {
      return { status: "unavailable", result };
    }
    rows = appendUniqueRows(rows, result.rows);
    nextCursor = result.nextCursor;
    totalCount = result.totalCount ?? totalCount;
    loadedPages += 1;
  }

  return {
    status: "available",
    group: {
      ...group,
      loadedCount: rows.length,
      nextCursor,
      rows,
      totalCount,
    },
    pageCount: loadedPages,
  };
}

export async function refreshAuthoritativeTicketList({
  groupBy,
  groupPageCounts,
  load,
  pageCount,
  request,
}: {
  groupBy?: "state" | "priority";
  groupPageCounts: Map<string, number>;
  load: LoadWorkspaceTicketListPageAction;
  pageCount: number;
  request: WorkspaceTicketListPageRequest;
}): Promise<AuthoritativeListRefreshResult> {
  const first = await load(request);
  if (first.status === "unavailable") {
    return { status: "unavailable", result: first };
  }

  if (groupBy) {
    const refreshed = await Promise.all(
      (first.groups ?? []).map((group) =>
        refreshGroupWindow({
          group,
          groupBy,
          load,
          pageCount: groupPageCounts.get(group.id) ?? 1,
          request,
        }),
      ),
    );
    const unavailable = refreshed.find(
      (entry): entry is Extract<typeof entry, { status: "unavailable" }> =>
        entry.status === "unavailable",
    );
    if (unavailable) {
      return { status: "unavailable", result: unavailable.result };
    }
    const available = refreshed.filter(
      (entry): entry is Extract<typeof entry, { status: "available" }> =>
        entry.status === "available",
    );
    const groups = available.map((entry) => entry.group);
    return {
      result: {
        ...first,
        groups,
        loadedCount: groups.reduce(
          (count, group) => count + group.rows.length,
          0,
        ),
        rows: groups.flatMap((group) => group.rows),
      },
      loadedGroupPageCounts: new Map(
        available.map((entry) => [entry.group.id, entry.pageCount]),
      ),
      loadedPageCount: 1,
      status: "available",
    };
  }

  let rows = first.rows;
  let nextCursor = first.nextCursor;
  let loadedPages = 1;
  let totalCount = first.totalCount;
  while (loadedPages < pageCount && nextCursor) {
    const result = await load({ ...request, cursor: nextCursor });
    if (result.status === "unavailable") {
      return { status: "unavailable", result };
    }
    rows = appendUniqueRows(rows, result.rows);
    nextCursor = result.nextCursor;
    totalCount = result.totalCount ?? totalCount;
    loadedPages += 1;
  }

  return {
    result: {
      ...first,
      loadedCount: rows.length,
      nextCursor,
      rows,
      totalCount,
    },
    loadedGroupPageCounts: new Map(),
    loadedPageCount: loadedPages,
    status: "available",
  };
}
