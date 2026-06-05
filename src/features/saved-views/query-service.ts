import type { ProviderCapability, TicketListQueryInput } from "@/core/providers";
import {
  normalizeSavedViewFilter,
  normalizeSavedViewGroup,
  normalizeSavedViewSort,
  type SavedViewQuery,
} from "@/core/saved-views";
import { normalizeTicketListQuery } from "@/core/ticket-list-query";
import { guardTicketListQuery } from "@/features/tickets/list-query-guardrails";

function savedViewQueryInput(query: TicketListQueryInput): TicketListQueryInput {
  const filter = normalizeSavedViewFilter(query.filter);
  const sort = normalizeSavedViewSort(query.sort);
  const group = normalizeSavedViewGroup(query.group);

  return {
    filter,
    ...(sort ? { sort } : {}),
    ...(group ? { group } : {}),
  };
}

export function savedViewQueryFromInput(
  query: TicketListQueryInput,
): SavedViewQuery {
  const input = savedViewQueryInput(query);

  return {
    filter: input.filter ?? {},
    ...(input.sort ? { sort: input.sort } : {}),
    ...(input.group ? { group: input.group } : {}),
  };
}

export function validateSavedViewQuery(
  providerCapabilities: ProviderCapability[],
  query: TicketListQueryInput,
) {
  const input = savedViewQueryInput(query);

  return guardTicketListQuery(
    providerCapabilities,
    normalizeTicketListQuery(input),
    input,
  );
}
