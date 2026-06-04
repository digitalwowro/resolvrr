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
  isDefault?: boolean;
  query?: SavedViewQuery;
  disabledReason?: TicketListQueryRejection["kind"];
  disabledLabel?: string;
};

export type InitialWorkspaceSavedViewSelection =
  | {
      status: "selected";
      selectedSavedViewId: string;
      selectedSavedView?: StoredSavedView;
    }
  | {
      status: "blocked";
      reason: "my-work-current-user-unavailable";
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
  const views = savedViews.map((savedView) => {
      const disabledReason = savedViewQueryRejection(
        savedView.query,
        capabilities,
      );

      return {
        id: savedView.id,
        label: savedView.name,
        isDefault: Boolean(savedView.preference?.isDefault),
        query: savedView.query,
        ...(disabledReason
          ? {
              disabledLabel: savedViewDisabledLabel(disabledReason),
              disabledReason,
            }
          : {}),
      };
    });

  return views.length > 0
    ? views
    : [{ id: allTicketsSavedViewId, label: "All tickets" }];
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
    savedViews.find(
      (savedView) => !savedViewQueryRejection(savedView.query, capabilities),
    )?.id ??
    allTicketsSavedViewId
  );
}

export function initialWorkspaceSavedViewSelection({
  blockUnfilteredFallback,
  capabilities,
  savedViews,
}: {
  savedViews: StoredSavedView[];
  capabilities?: TicketListQueryCapabilities;
  blockUnfilteredFallback?: boolean;
}): InitialWorkspaceSavedViewSelection {
  const selectedSavedViewId = defaultWorkspaceSavedViewId(
    savedViews,
    capabilities,
  );

  if (blockUnfilteredFallback && selectedSavedViewId === allTicketsSavedViewId) {
    return {
      status: "blocked",
      reason: "my-work-current-user-unavailable",
    };
  }

  return {
    status: "selected",
    selectedSavedViewId,
    selectedSavedView: savedViews.find(
      (savedView) => savedView.id === selectedSavedViewId,
    ),
  };
}
