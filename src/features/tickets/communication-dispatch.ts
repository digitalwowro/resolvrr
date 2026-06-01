import { ProviderError } from "@/core/providers";
import type {
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import type {
  TicketCustomerReplyResult,
  TicketInternalNoteResult,
} from "./communication-model";

function normalizedInternalNoteInput(
  input: TicketInternalNoteInput,
): TicketInternalNoteInput {
  return {
    body: input.body.trim(),
    ...(input.bodyFormat ? { bodyFormat: input.bodyFormat } : {}),
  };
}

function normalizedCustomerReplyInput(
  input: TicketCustomerReplyInput,
): TicketCustomerReplyInput {
  return {
    body: input.body.trim(),
    ...(input.bodyFormat ? { bodyFormat: input.bodyFormat } : {}),
  };
}

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
      normalizedInternalNoteInput(input),
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

export async function dispatchTicketCustomerReply(
  providerContext: TicketProviderContext,
  ticketExternalId: string,
  input: TicketCustomerReplyInput,
): Promise<TicketCustomerReplyResult> {
  if (!input.body.trim()) {
    return { status: "failed", reason: "invalid-input", retryable: false };
  }
  if (
    !providerContext.plugin.capabilities.includes("ticket:add-customer-reply") ||
    !providerContext.plugin.addTicketCustomerReply
  ) {
    return {
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    };
  }

  try {
    await providerContext.plugin.addTicketCustomerReply(
      providerContext.context,
      ticketExternalId,
      normalizedCustomerReplyInput(input),
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
