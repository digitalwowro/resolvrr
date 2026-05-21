"use client";

import { useState } from "react";
import type { SortDirection } from "./table-header-cell";

type UseTableSortOptions<TKey extends string> = {
  initialSortKey: TKey;
  initialSortDirection?: SortDirection;
  newKeyDirection?: SortDirection;
};

export function useTableSort<TKey extends string>({
  initialSortKey,
  initialSortDirection = "ascending",
  newKeyDirection = "ascending",
}: UseTableSortOptions<TKey>) {
  const [sortKey, setSortKey] = useState<TKey>(initialSortKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);

  function toggleSort(key: TKey) {
    if (key === sortKey) {
      setSortDirection((current) =>
        current === "ascending" ? "descending" : "ascending",
      );
      return;
    }

    setSortKey(key);
    setSortDirection(newKeyDirection);
  }

  function sortDirectionFor(key: TKey) {
    return key === sortKey ? sortDirection : undefined;
  }

  return {
    sortKey,
    sortDirection,
    toggleSort,
    sortDirectionFor,
  };
}
