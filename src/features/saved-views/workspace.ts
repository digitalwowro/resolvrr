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
  disabledLabel?: string;
};

export function savedViewQueryRejection(
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

export function savedViewDisabledLabel(
  reason: TicketListQueryRejection["kind"],
) {
  if (reason === "grouped-total-count-too-expensive") {
    return "too expensive";
  }
  if (reason === "full-text-search-unsupported") {
    return "search unsupported";
  }
  if (reason === "sort-unsupported") {
    return "sort unsupported";
  }
  if (reason === "grouping-unsupported") {
    return "grouping unsupported";
  }
  return "unsupported";
}

export function workspaceSavedViews(
  savedViews: StoredSavedView[],
  capabilities?: TicketListQueryCapabilities,
): WorkspaceSavedView[] {
  return [
    { id: allTicketsSavedViewId, label: "All tickets" },
    ...savedViews.map((savedView) => {
      const disabledReason = savedViewQueryRejection(
        savedView.query,
        capabilities,
      );

      return {
        id: savedView.id,
        label: savedView.name,
        query: savedView.query,
        ...(disabledReason
          ? {
              disabledLabel: savedViewDisabledLabel(disabledReason),
              disabledReason,
            }
          : {}),
      };
    }),
  ];
}

export function defaultWorkspaceSavedViewId(
  savedViews: StoredSavedView[],
  capabilities?: TicketListQueryCapabilities,
) {
  return (
    savedViews.find(
      (savedView) =>
        savedView.preference?.isDefault &&
        !savedViewQueryRejection(savedView.query, capabilities),
    )?.id ??
    allTicketsSavedViewId
  );
}
