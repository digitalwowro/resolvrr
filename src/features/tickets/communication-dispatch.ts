import { ProviderError } from "@/core/providers";
import type { TicketInternalNoteInput } from "@/core/tickets";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import type { TicketInternalNoteResult } from "./communication-model";

export async function dispatchTicketInternalNote(
  providerContext: TicketProviderContext,
  ticketExternalId: string,
  input: TicketInternalNoteInput,
): Promise<TicketInternalNoteResult> {
  if (!input.body.trim()) {
    return { status: "failed", reason: "invalid-input", retryable: false };
  }
  if (
    !providerContext.plugin.capabilities.includes("ticket:add-internal-note") ||
    !providerContext.plugin.addTicketInternalNote
  ) {
    return {
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    };
  }

  try {
    await providerContext.plugin.addTicketInternalNote(
      providerContext.context,
      ticketExternalId,
      { body: input.body.trim() },
    );
    return { status: "saved" };
  } catch (error) {
    if (error instanceof ProviderError && error.kind === "validation-failure") {
      return { status: "failed", reason: "invalid-input", retryable: false };
    }

    const unavailable = readUnavailableForProviderError(error);
    return {
      status: "failed",
      reason: unavailable.reason,
      retryable: unavailable.retryable,
    };
  }
}
