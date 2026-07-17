import { ProviderError } from "@/core/providers";
import type {
  TicketCustomerForwardInput,
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";
import type { ResolvedTicketSignature } from "@/core/ticket-signatures";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import type {
  TicketCustomerReplyResult,
  TicketCustomerForwardResult,
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
    ...input,
    body: input.body.trim(),
    cc: [...input.cc],
    to: [...input.to],
  };
}

function normalizedCustomerForwardInput(
  input: TicketCustomerForwardInput,
): TicketCustomerForwardInput {
  return {
    ...input,
    attachmentExternalIds: [...new Set(input.attachmentExternalIds)],
    body: input.body.trim(),
    cc: [...input.cc],
    subject: input.subject.trim(),
    to: [...input.to],
  };
}

function replyFailureReason(error: ProviderError) {
  if (error.diagnosticCode === "invalid-mention") {
    return "invalid-mention" as const;
  }
  if (error.diagnosticCode === "invalid-recipient") {
    return "invalid-recipient" as const;
  }
  if (error.diagnosticCode === "reply-context-stale") {
    return "reply-context-stale" as const;
  }
  if (error.diagnosticCode === "reply-context-unavailable") {
    return "reply-context-unavailable" as const;
  }
  if (error.diagnosticCode === "unsupported-reply-intent") {
    return "unsupported-reply-intent" as const;
  }
  if (error.diagnosticCode === "delivery-uncertain") {
    return "delivery-uncertain" as const;
  }
  if (error.diagnosticCode === "forward-context-stale") {
    return "forward-context-stale" as const;
  }
  if (error.diagnosticCode === "forward-context-unavailable") {
    return "forward-context-unavailable" as const;
  }
  if (error.diagnosticCode === "invalid-forward-attachment") {
    return "invalid-forward-attachment" as const;
  }
  if (error.diagnosticCode === "forward-attachments-too-large") {
    return "forward-attachments-too-large" as const;
  }
  if (error.diagnosticCode === "invalid-forward-subject") {
    return "invalid-forward-subject" as const;
  }
  return undefined;
}

export async function dispatchTicketCustomerForward(
  providerContext: TicketProviderContext,
  ticketExternalId: string,
  input: TicketCustomerForwardInput,
  resolvedSignature?: ResolvedTicketSignature,
): Promise<TicketCustomerForwardResult> {
  if (!input.subject.trim() || input.to.length + input.cc.length === 0) {
    return { status: "failed", reason: "invalid-input", retryable: false };
  }
  if (
    !providerContext.plugin.capabilities.includes("ticket:forward-customer-email") ||
    !providerContext.plugin.forwardTicketEmail
  ) {
    return { status: "failed", reason: "unsupported-capability", retryable: false };
  }
  try {
    await providerContext.plugin.forwardTicketEmail(
      providerContext.context,
      ticketExternalId,
      { ...normalizedCustomerForwardInput(input), resolvedSignature },
    );
    return { status: "saved" };
  } catch (error) {
    if (error instanceof ProviderError) {
      const reason = replyFailureReason(error);
      if (reason) return { status: "failed", reason, retryable: false };
      if (error.kind === "validation-failure") {
        return { status: "failed", reason: "invalid-input", retryable: false };
      }
    }
    const unavailable = readUnavailableForProviderError(error);
    return { status: "failed", reason: unavailable.reason, retryable: unavailable.retryable };
  }
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
    if (error instanceof ProviderError) {
      const reason = replyFailureReason(error);
      if (reason) {
        return { status: "failed", reason, retryable: false };
      }
    }
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
  resolvedSignature?: ResolvedTicketSignature,
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
      { ...normalizedCustomerReplyInput(input), resolvedSignature },
    );
    return { status: "saved" };
  } catch (error) {
    if (error instanceof ProviderError) {
      const reason = replyFailureReason(error);
      if (reason) {
        return { status: "failed", reason, retryable: false };
      }
    }
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
