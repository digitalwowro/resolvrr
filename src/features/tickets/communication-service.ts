import type { TicketInternalNoteInput } from "@/core/tickets";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import { loadActiveTicketProviderContext } from "./connection-context";
import { dispatchTicketInternalNote } from "./communication-dispatch";
import { dispatchTicketDetailRead } from "./provider-dispatch";
import type { TicketInternalNoteResult } from "./communication-model";

function failedNoteResult(
  result: Awaited<ReturnType<typeof loadActiveTicketProviderContext>>,
): TicketInternalNoteResult {
  return {
    status: "failed",
    reason: result.status === "unavailable"
      ? result.reason
      : "provider-unexpected-response",
    retryable: result.status === "unavailable" ? result.retryable : false,
  };
}

export async function addWorkspaceTicketInternalNote(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: string,
  input: TicketInternalNoteInput,
): Promise<TicketInternalNoteResult> {
  if (!ticketExternalId.trim() || !input.body.trim()) {
    return { status: "failed", reason: "invalid-input", retryable: false };
  }

  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "mutation",
  );
  if (providerContext.status === "unavailable") {
    return failedNoteResult(providerContext);
  }

  const result = await dispatchTicketInternalNote(
    providerContext.value,
    ticketExternalId,
    input,
  );
  if (result.status !== "saved") {
    return result;
  }

  const detailRefresh = await dispatchTicketDetailRead(
    providerContext.value,
    ticketExternalId,
  );
  if (detailRefresh.status === "unavailable") {
    return {
      status: "saved-refresh-failed",
      reason: detailRefresh.reason,
      retryable: detailRefresh.retryable,
    };
  }

  return { status: "saved" };
}
