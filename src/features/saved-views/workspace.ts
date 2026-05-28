import type {
  TicketListQueryCapabilities,
  TicketListQueryRejection,
} from "@/core/providers";
import type { SavedViewQuery } from "@/core/saved-views";
import type { StoredSavedView } from "./repository";

export const allTicketsSavedViewId = "all-tickets";

export type WorkspaceSavedView = {
  id: string;
  label: string;
  query?: SavedViewQuery;
  disabledReason?: TicketListQueryRejection["kind"];
};

function unsupportedReason(
  query: SavedViewQuery,
  capabilities?: TicketListQueryCapabilities,
): TicketListQueryRejection["kind"] | undefined {
  if (!capabilities) {
    return undefined;
  }
  if (query.filter.searchText && !capabilities.fullTextSearch) {
    return "full-text-search-unsupported";
  }
  if (query.sort && !capabilities.providerSort) {
    return "sort-unsupported";
  }
  if (
    (query.group?.key === "state" || query.group?.key === "priority") &&
    !capabilities.providerGrouping
  ) {
    return "grouping-unsupported";
  }
  if (
    (query.group?.key === "state" || query.group?.key === "priority") &&
    !capabilities.groupedTotalCount
  ) {
    return "grouped-total-count-too-expensive";
  }

  return undefined;
}

export function workspaceSavedViews(
  savedViews: StoredSavedView[],
  capabilities?: TicketListQueryCapabilities,
): WorkspaceSavedView[] {
  return [
    { id: allTicketsSavedViewId, label: "All tickets" },
    ...savedViews.map((savedView) => ({
      id: savedView.id,
      label: savedView.name,
      query: savedView.query,
      disabledReason: unsupportedReason(savedView.query, capabilities),
    })),
  ];
}

export function defaultWorkspaceSavedViewId(savedViews: StoredSavedView[]) {
  return (
    savedViews.find((savedView) => savedView.preference?.isDefault)?.id ??
    allTicketsSavedViewId
  );
}
