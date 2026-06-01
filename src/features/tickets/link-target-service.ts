import type { TicketLinkTargetSearchInput } from "@/core/tickets";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  loadActiveTicketProviderContext,
  readUnavailableForProviderError,
} from "./connection-context";
import { dispatchTicketLinkTargetSearch } from "./provider-dispatch";
import type { WorkspaceTicketLinkTargetSearchResult } from "./link-target-search-action-result";

export async function searchWorkspaceTicketLinkTargets(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  input: TicketLinkTargetSearchInput,
): Promise<WorkspaceTicketLinkTargetSearchResult> {
  const normalizedQuery = input.query?.trim() ?? "";
  const normalizedCustomerExternalId = input.customerExternalId?.trim();
  if (!normalizedQuery && !normalizedCustomerExternalId) {
    return { status: "available", targets: [] };
  }

  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "lookup",
  );
  if (providerContext.status === "unavailable") {
    return providerContext;
  }

  try {
    const targets = await dispatchTicketLinkTargetSearch(providerContext.value, {
      ...(normalizedCustomerExternalId
        ? { customerExternalId: normalizedCustomerExternalId }
        : {}),
      ...(input.excludeTicketExternalId
        ? { excludeTicketExternalId: input.excludeTicketExternalId }
        : {}),
      limit: input.limit ?? 8,
      ...(normalizedQuery ? { query: normalizedQuery } : {}),
    });
    return {
      status: "available",
      targets,
    };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}
