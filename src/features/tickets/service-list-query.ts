import type { ProviderCapability, TicketListQueryInput } from "@/core/providers";

function hasProviderCapability(
  capabilities: ProviderCapability[],
  capability: ProviderCapability,
) {
  return capabilities.includes(capability);
}

export function countAwareListQueryInput(
  capabilities: ProviderCapability[],
  query: TicketListQueryInput,
): TicketListQueryInput {
  if (
    query.count ||
    query.group ||
    !hasProviderCapability(capabilities, "ticket:count")
  ) {
    return query;
  }

  return { ...query, count: { includeTotal: true } };
}
