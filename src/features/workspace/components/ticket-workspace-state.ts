"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTableSort } from "@/components/ui";
import type {
  TicketDetailReadResult,
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketDetail,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
  WorkspaceTicketTab,
} from "@/features/tickets";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import {
  groupTicketRows,
  sortTicketRows,
} from "./ticket-table-grouping";
import { patchTicketTabMetadata } from "./ticket-tab-metadata";
import type { TicketTabOrientation } from "./ticket-tabs-panel";

type ActiveWorkspacePane = "list" | { ticketId: string };

type CachedTicketDetail = {
  detail?: WorkspaceTicketDetail;
  result?: TicketDetailReadResult;
};

type TicketWorkspaceStateProps = {
  columns: WorkspaceTicketColumn[];
  detail?: WorkspaceTicketDetail;
  detailResult?: TicketDetailReadResult;
  rows: WorkspaceTicketRow[];
  selectedTicketId?: string;
  ticketTabs: WorkspaceTicketTab[];
};

function ticketPath(ticketId?: string) {
  return ticketId ? `/workspace?ticket=${encodeURIComponent(ticketId)}` : "/workspace";
}

function initialDetailCache({
  detail,
  detailResult,
  selectedTicketId,
}: {
  detail?: WorkspaceTicketDetail;
  detailResult?: TicketDetailReadResult;
  selectedTicketId?: string;
}) {
  if (!selectedTicketId || (!detail && !detailResult)) {
    return {};
  }

  return {
    [selectedTicketId]: {
      detail,
      result: detailResult,
    },
  };
}

export function useTicketWorkspaceDisplayState({
  columns,
  detail,
  detailResult,
  rows,
  selectedTicketId,
  ticketTabs,
}: TicketWorkspaceStateProps) {
  const router = useRouter();
  const [tabOrientation, setTabOrientation] =
    useState<TicketTabOrientation>("horizontal");
  const [activeWorkspacePane, setActiveWorkspacePane] =
    useState<ActiveWorkspacePane>(
      selectedTicketId ? { ticketId: selectedTicketId } : "list",
    );
  const [openTicketTabs, setOpenTicketTabs] = useState<WorkspaceTicketTab[]>(
    () => {
      const selectedTab = selectedTicketId
        ? ticketTabs.find((tab) => tab.id === selectedTicketId)
        : undefined;
      return selectedTab ? [selectedTab] : [];
    },
  );
  const [detailCache, setDetailCache] = useState<Record<string, CachedTicketDetail>>(
    () => initialDetailCache({ detail, detailResult, selectedTicketId }),
  );
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(
    () => new Set(columns.map((column) => column.key)),
  );
  const [groupBy, setGroupBy] = useState<WorkspaceTicketGroupKey>("none");
  const { setSort, sortDirection, sortDirectionFor, sortKey, toggleSort } =
    useTableSort<WorkspaceTicketSortKey>({
      initialSortKey: "updatedAt",
      initialSortDirection: "descending",
    });

  const activeTicketId =
    activeWorkspacePane === "list" ? undefined : activeWorkspacePane.ticketId;
  const listActive = activeWorkspacePane === "list";
  const activeDetail =
    activeTicketId === selectedTicketId && (detail || detailResult)
      ? { detail, result: detailResult }
      : activeTicketId
        ? detailCache[activeTicketId]
        : undefined;
  const groupedRows = useMemo(
    () => groupTicketRows(rows, groupBy, sortKey, sortDirection),
    [groupBy, rows, sortDirection, sortKey],
  );
  const sortedRows = useMemo(
    () =>
      groupBy === "none"
        ? sortTicketRows(rows, sortKey, sortDirection)
        : groupedRows.flatMap((group) => group.rows),
    [groupBy, groupedRows, rows, sortDirection, sortKey],
  );
  const allSelected = sortedRows.length > 0 && selectedRowIds.size === sortedRows.length;
  const partiallySelected = selectedRowIds.size > 0 && !allSelected;
  const visibleColumnSet = useMemo(
    () => new Set<WorkspaceTicketColumnKey>(visibleColumns),
    [visibleColumns],
  );

  function toggleSelectAll() {
    setSelectedRowIds(
      allSelected ? new Set() : new Set(sortedRows.map((row) => row.id)),
    );
  }

  function toggleRow(ticketId: string) {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  }

  function toggleColumn(column: WorkspaceTicketColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }

  function refreshList() {
    setSelectedRowIds(new Set());
  }

  function updateOpenTicketTabMetadata({
    priority,
    state,
    ticketExternalId,
  }: TicketMetadataSavedPatch) {
    setOpenTicketTabs((current) =>
      patchTicketTabMetadata(current, { priority, state, ticketExternalId }),
    );
  }

  function handleGroupByChange(nextGroupBy: WorkspaceTicketGroupKey) {
    setGroupBy(nextGroupBy);
    if (nextGroupBy !== "none" && nextGroupBy === sortKey) {
      setSort("updatedAt", "descending");
    }
  }

  function rememberOpenTicket(ticketId: string) {
    const tab = ticketTabs.find((ticketTab) => ticketTab.id === ticketId);
    if (!tab) {
      return;
    }

    setOpenTicketTabs((current) =>
      current.some((currentTab) => currentTab.id === ticketId)
        ? current
        : [...current, tab],
    );
  }

  function cacheSelectedDetail() {
    if (!selectedTicketId || (!detail && !detailResult)) {
      return;
    }

    setDetailCache((current) => {
      const cached = current[selectedTicketId];
      if (cached?.detail === detail && cached?.result === detailResult) {
        return current;
      }

      return {
        ...current,
        [selectedTicketId]: {
          detail,
          result: detailResult,
        },
      };
    });
  }

  function showTicketFromRow(ticketId: string) {
    cacheSelectedDetail();
    rememberOpenTicket(ticketId);
    setActiveWorkspacePane({ ticketId });
    if (ticketId !== selectedTicketId) {
      router.push(ticketPath(ticketId));
    }
  }

  function showList() {
    cacheSelectedDetail();
    setActiveWorkspacePane("list");
  }

  function returnActiveTicketToList() {
    cacheSelectedDetail();
    if (activeTicketId) {
      setOpenTicketTabs((current) =>
        current.filter((tab) => tab.id !== activeTicketId),
      );
    }
    setActiveWorkspacePane("list");
    router.push(ticketPath());
  }

  function showOpenTicket(ticketId: string) {
    cacheSelectedDetail();
    setActiveWorkspacePane({ ticketId });
    if (ticketId !== selectedTicketId) {
      router.push(ticketPath(ticketId));
    }
  }

  function closeTicket(ticketId: string) {
    cacheSelectedDetail();
    const closingIndex = openTicketTabs.findIndex((tab) => tab.id === ticketId);
    if (closingIndex === -1) {
      return;
    }

    const next = openTicketTabs.filter((tab) => tab.id !== ticketId);
    setOpenTicketTabs(next);

    if (activeTicketId === ticketId) {
      const nextActive = next[closingIndex] ?? next[closingIndex - 1];
      if (nextActive) {
        setActiveWorkspacePane({ ticketId: nextActive.id });
        if (nextActive.id !== selectedTicketId) {
          router.push(ticketPath(nextActive.id));
        }
      } else {
        setActiveWorkspacePane("list");
      }
    }
  }

  return {
    activeDetail,
    activeTicketId,
    allSelected,
    closeTicket,
    groupBy,
    groupedRows,
    handleGroupByChange,
    listActive,
    openTicketTabs,
    partiallySelected,
    refreshList,
    returnActiveTicketToList,
    selectedRowIds,
    setTabOrientation,
    showList,
    showOpenTicket,
    showTicketFromRow,
    sortDirectionFor,
    sortedRows,
    tabOrientation,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort,
    updateOpenTicketTabMetadata,
    visibleColumnSet,
  };
}
