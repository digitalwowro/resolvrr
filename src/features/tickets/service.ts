import type { TicketExternalId } from "@/core/tickets";
import type { TicketListQuery } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import { loadActiveTicketProviderContext } from "./connection-context";
import {
  dispatchTicketDetailRead,
  dispatchTicketListRead,
} from "./provider-dispatch";
import {
  defaultTicketListQuery,
  type TicketDetailReadResult,
  type TicketListReadResult,
} from "./read-model";

export async function loadWorkspaceTicketList(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  query: Partial<TicketListQuery> = {},
): Promise<TicketListReadResult> {
  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
  );
  if (providerContext.status === "unavailable") {
    return providerContext;
  }

  return dispatchTicketListRead(providerContext.value, {
    ...defaultTicketListQuery,
    ...query,
    filter: query.filter ?? defaultTicketListQuery.filter,
  });
}

export async function loadWorkspaceTicketDetail(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: TicketExternalId,
): Promise<TicketDetailReadResult> {
  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
  );
  if (providerContext.status === "unavailable") {
    return providerContext;
  }

  return dispatchTicketDetailRead(providerContext.value, ticketExternalId);
}
