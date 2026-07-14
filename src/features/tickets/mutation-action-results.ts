import type {
  TicketMetadataMutationActionState,
  TicketMetadataMutationErrorReason,
  TicketMetadataMutationField,
  TicketMetadataMutationResult,
} from "./mutation-model";

export function metadataMutationErrorMessage(reason: TicketMetadataMutationErrorReason): string {
  const messages: Partial<Record<TicketMetadataMutationErrorReason, string>> = {
    "invalid-input": "Choose a metadata value to save.",
    "unsupported-capability": "This workspace cannot update that field.",
    "unavailable-transition": "That state change is not available for this ticket.",
    "provider-auth-failed": "The helpdesk rejected the saved credentials.",
    "provider-permission-denied": "The helpdesk account does not have permission to update this ticket.",
    "provider-rate-limited": "The helpdesk rate limit was reached. Try again later.",
    "provider-temporary-failure": "The helpdesk could not be reached. Try again.",
    "invalid-connection": "The active helpdesk workspace is no longer valid.",
  };
  if (["no-active-connection", "inactive-connection", "missing-credentials", "unknown-provider"].includes(reason)) {
    return "No active helpdesk workspace is available for ticket updates.";
  }
  return messages[reason] ?? "The helpdesk returned an unexpected response.";
}

function communicationErrorMessage(reason: TicketMetadataMutationErrorReason): string {
  const messages: Partial<Record<TicketMetadataMutationErrorReason, string>> = {
    "invalid-input": "Enter a reply, forward, or comment before updating.",
    "unsupported-capability": "This workspace cannot add that message.",
    "invalid-recipient": "Review the To and Cc recipients before updating.",
    "reply-context-stale": "The reply context changed. Reload the ticket and review recipients again.",
    "reply-context-unavailable": "The selected message can no longer be used for a reply.",
    "forward-context-stale": "The source message changed. Reload the ticket and review the forward again.",
    "forward-context-unavailable": "The selected message can no longer be forwarded.",
    "invalid-forward-attachment": "One of the selected attachments is no longer available.",
    "forward-attachments-too-large": "The selected attachments are too large to forward.",
    "invalid-forward-subject": "Review the forward subject before updating.",
    "unsupported-reply-intent": "Reply all is no longer available for the selected message.",
    "delivery-uncertain": "Delivery could not be confirmed. Check the refreshed thread before retrying.",
  };
  return messages[reason] ?? metadataMutationErrorMessage(reason);
}

export function actionStateForResult(
  field: TicketMetadataMutationField,
  result: TicketMetadataMutationResult,
): TicketMetadataMutationActionState {
  if (result.status === "saved") return { status: "saved", field, message: "Saved." };
  if (result.status === "saved-refresh-failed") return {
    status: "saved-refresh-failed", field,
    message: "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
  };
  return { status: "failed", field, message: metadataMutationErrorMessage(result.reason) };
}

export function communicationActionStateForResult(
  result: TicketMetadataMutationResult,
): TicketMetadataMutationActionState {
  if (result.status === "saved") {
    return { status: "saved", field: "communication", message: "Saved." };
  }
  if (result.status === "saved-refresh-failed") return {
    status: "saved-refresh-failed", field: "communication",
    message: "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
  };
  return { status: "failed", field: "communication", message: communicationErrorMessage(result.reason) };
}

export function partialCommunicationActionState(
  result: Extract<TicketMetadataMutationResult, { status: "failed" }>,
): TicketMetadataMutationActionState {
  return {
    status: "partially-saved", field: "communication",
    message: `Ticket changes were saved, but the helpdesk did not confirm accepting the message. ${communicationErrorMessage(result.reason)}`,
  };
}
