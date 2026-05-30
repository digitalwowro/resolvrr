"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import { ticketInternalNoteActionInput } from "./communication-action-input";
import { addWorkspaceTicketInternalNote } from "./communication-service";
import type {
  TicketCommunicationErrorReason,
  TicketInternalNoteActionState,
  TicketInternalNotePayload,
  TicketInternalNoteResult,
} from "./communication-model";

function noteErrorMessage(reason: TicketCommunicationErrorReason): string {
  if (reason === "invalid-input") {
    return "Enter an internal note before adding it.";
  }
  if (reason === "unsupported-capability") {
    return "This workspace cannot add internal notes.";
  }
  if (reason === "provider-auth-failed") {
    return "The helpdesk rejected the saved credentials.";
  }
  if (reason === "provider-permission-denied") {
    return "The helpdesk account does not have permission to update this ticket.";
  }
  if (reason === "provider-rate-limited") {
    return "The helpdesk rate limit was reached. Try again later.";
  }
  if (reason === "provider-temporary-failure") {
    return "The helpdesk could not be reached. Try again.";
  }
  if (reason === "invalid-connection") {
    return "The active helpdesk workspace is no longer valid.";
  }
  if (
    reason === "no-active-connection" ||
    reason === "inactive-connection" ||
    reason === "missing-credentials" ||
    reason === "unknown-provider"
  ) {
    return "No active helpdesk workspace is available for ticket updates.";
  }

  return "The helpdesk returned an unexpected response.";
}

function actionStateForResult(
  result: TicketInternalNoteResult,
): TicketInternalNoteActionState {
  if (result.status === "saved") {
    return { status: "saved", message: "Note added." };
  }
  if (result.status === "saved-refresh-failed") {
    return {
      status: "saved-refresh-failed",
      message:
        "Note added, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
    };
  }

  return {
    status: "failed",
    message: noteErrorMessage(result.reason),
  };
}

export async function addTicketInternalNoteAction(
  request: TicketInternalNotePayload,
): Promise<TicketInternalNoteActionState> {
  const actionInput = ticketInternalNoteActionInput(request);
  if (actionInput.status === "invalid") {
    return {
      status: "failed",
      message: noteErrorMessage("invalid-input"),
    };
  }

  const user = await requireCurrentUser();
  const result = await addWorkspaceTicketInternalNote(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    actionInput.ticketExternalId,
    actionInput.input,
  );

  if (result.status === "saved" || result.status === "saved-refresh-failed") {
    revalidatePath("/workspace");
  }

  return actionStateForResult(result);
}
