import type {
  TicketAttachmentFile,
  TicketAttachmentLocator,
} from "@/core/ticket-attachments";
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

export type TicketAttachmentLoadResult =
  | { attachment: TicketAttachmentFile; status: "available" }
  | TicketReadUnavailable;

export async function loadWorkspaceTicketAttachment(input: {
  connectionId: string;
  encryptionKey: string;
  locator: TicketAttachmentLocator;
  registry: ProviderRegistry;
  repository: HelpdeskConnectionsRepository;
  userId: string;
}): Promise<TicketAttachmentLoadResult> {
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
    !plugin.capabilities.includes("ticket:attachments") ||
    !plugin.getTicketAttachment
  ) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    return {
      attachment: await plugin.getTicketAttachment(context, input.locator),
      status: "available",
    };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}
