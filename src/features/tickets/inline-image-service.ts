import type {
  TicketInlineImage,
  TicketInlineImageLocator,
} from "@/core/ticket-inline-images";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  loadTicketProviderContextForConnection,
  readUnavailableForProviderError,
} from "./connection-context";
import {
  unavailableTicketRead,
  type TicketReadUnavailable,
} from "./read-model";

export type TicketInlineImageLoadResult =
  | { image: TicketInlineImage; status: "available" }
  | TicketReadUnavailable;

export async function loadWorkspaceTicketInlineImage(input: {
  connectionId: string;
  encryptionKey: string;
  locator: TicketInlineImageLocator;
  registry: ProviderRegistry;
  repository: HelpdeskConnectionsRepository;
  userId: string;
}): Promise<TicketInlineImageLoadResult> {
  const providerContext = await loadTicketProviderContextForConnection(
    input.repository,
    input.registry,
    input.encryptionKey,
    input.userId,
    input.connectionId,
    "detail",
  );
  if (providerContext.status === "unavailable") return providerContext;

  const { context, plugin } = providerContext.value;
  if (
    !plugin.capabilities.includes("ticket:inline-images") ||
    !plugin.getTicketInlineImage
  ) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    return {
      image: await plugin.getTicketInlineImage(context, input.locator),
      status: "available",
    };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}
