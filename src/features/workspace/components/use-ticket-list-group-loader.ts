"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
} from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import {
  appendUniqueRows,
  savedViewListRequest,
} from "./ticket-list-pager-rows";

type UseTicketListGroupLoaderOptions = {
  groupPageCountsRef: { current: Map<string, number> };
  groupBy?: "state" | "priority";
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  savedViewId: string;
  setGroups: Dispatch<SetStateAction<WorkspaceTicketListGroup[] | undefined>>;
  setRows: Dispatch<SetStateAction<WorkspaceTicketRow[]>>;
};

export function useTicketListGroupLoader({
  groupPageCountsRef,
  groupBy,
  loadTicketListPageAction,
  savedViewId,
  setGroups,
  setRows,
}: UseTicketListGroupLoaderOptions) {
  const [loadingGroupId, setLoadingGroupId] = useState<string>();
  const [groupError, setGroupError] =
    useState<{ groupId: string; reason: TicketReadUnavailableReason }>();

  async function loadMoreGroup(
    group: Pick<WorkspaceTicketListGroup, "id" | "nextCursor" | "value">,
  ) {
    if (
      !groupBy ||
      !group.nextCursor ||
      loadingGroupId ||
      !loadTicketListPageAction
    ) {
      return;
    }

    setLoadingGroupId(group.id);
    setGroupError(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({
        bucketValue: group.value,
        cursor: group.nextCursor,
        group: groupBy,
        ...savedViewListRequest(savedViewId),
      });
    } catch {
      setLoadingGroupId(undefined);
      setGroupError({
        groupId: group.id,
        reason: "provider-temporary-failure",
      });
      return;
    }
    setLoadingGroupId(undefined);

    if (result.status === "unavailable") {
      setGroupError({ groupId: group.id, reason: result.reason });
      return;
    }

    groupPageCountsRef.current.set(
      group.id,
      (groupPageCountsRef.current.get(group.id) ?? 1) + 1,
    );

    setGroups((current) => {
      const nextGroups = (current ?? []).map((currentGroup) =>
        currentGroup.id === group.id
          ? {
              ...currentGroup,
              loadedCount: currentGroup.loadedCount + result.rows.length,
              nextCursor: result.nextCursor,
              rows: appendUniqueRows(currentGroup.rows, result.rows),
              totalCount: result.totalCount,
            }
          : currentGroup,
      );
      setRows(nextGroups.flatMap((nextGroup) => nextGroup.rows));
      return nextGroups;
    });
  }

  return { groupError, loadMoreGroup, loadingGroupId, setGroupError };
}
