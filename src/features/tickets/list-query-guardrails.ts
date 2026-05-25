import type {
  ProviderCapability,
  TicketListQuery,
  TicketListQueryCapabilities,
  TicketListQueryInput,
  TicketListQueryRejection,
} from "@/core/providers";
import {
  defaultTicketListQueryCapabilities,
  ticketListPageSizeLimits,
} from "@/core/ticket-list-query";

function hasCapability(
  capabilities: ProviderCapability[],
  capability: ProviderCapability,
) {
  return capabilities.includes(capability);
}

export function ticketListQueryCapabilities(
  providerCapabilities: ProviderCapability[],
): TicketListQueryCapabilities {
  const groupedTotalCount = hasCapability(
    providerCapabilities,
    "ticket:group-count",
  );

  return {
    ...defaultTicketListQueryCapabilities,
    totalCount: hasCapability(providerCapabilities, "ticket:count"),
    providerSort: hasCapability(providerCapabilities, "ticket:sort"),
    providerGrouping: hasCapability(providerCapabilities, "ticket:group"),
    groupedTotalCount,
    fullTextSearch: hasCapability(providerCapabilities, "search:full-text"),
    maxPageSize: ticketListPageSizeLimits.max,
    unsupportedCombinations: groupedTotalCount ? [] : ["grouped-total-count"],
  };
}

export type TicketListQueryGuardrailResult =
  | { status: "supported"; capabilities: TicketListQueryCapabilities }
  | {
      status: "unsupported";
      reason: "unsupported-query" | "query-too-expensive";
      rejection: TicketListQueryRejection;
      capabilities: TicketListQueryCapabilities;
    };

export function guardTicketListQuery(
  providerCapabilities: ProviderCapability[],
  query: TicketListQuery,
  input: TicketListQueryInput,
): TicketListQueryGuardrailResult {
  const capabilities = ticketListQueryCapabilities(providerCapabilities);

  if (query.filter.searchText && !capabilities.fullTextSearch) {
    return unsupported("full-text-search-unsupported", capabilities);
  }
  if (query.count?.includeTotal && !capabilities.totalCount) {
    return unsupported("count-unsupported", capabilities);
  }
  if (input.sort && !capabilities.providerSort) {
    return unsupported("sort-unsupported", capabilities);
  }
  if (query.group && !capabilities.providerGrouping) {
    return unsupported("grouping-unsupported", capabilities);
  }
  if (
    query.group &&
    query.count?.includeTotal &&
    !capabilities.groupedTotalCount
  ) {
    return {
      status: "unsupported",
      reason: "query-too-expensive",
      rejection: { kind: "grouped-total-count-too-expensive" },
      capabilities,
    };
  }

  return { status: "supported", capabilities };
}

function unsupported(
  kind: TicketListQueryRejection["kind"],
  capabilities: TicketListQueryCapabilities,
): TicketListQueryGuardrailResult {
  return {
    status: "unsupported",
    reason: "unsupported-query",
    rejection: { kind },
    capabilities,
  };
}
