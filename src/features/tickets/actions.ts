"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { providerRegistry } from "@/providers";
import {
  addWorkspaceTicketCustomerReply,
  addWorkspaceTicketInternalNote,
} from "./communication-service";
import { ticketMetadataMutationActionInput } from "./metadata-action-input";
import { hasTicketMetadataMutationInput } from "./mutation-model";
import { updateWorkspaceTicketMetadata } from "./service";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationErrorReason,
  TicketMetadataMutationField,
  TicketMetadataMutationResult,
} from "./mutation-model";

function errorMessage(reason: TicketMetadataMutationErrorReason): string {
  if (reason === "invalid-input") {
    return "Choose a metadata value to save.";
  }
  if (reason === "unsupported-capability") {
    return "This workspace cannot update that field.";
  }
  if (reason === "unavailable-transition") {
    return "That state change is not available for this ticket.";
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

function communicationErrorMessage(reason: TicketMetadataMutationErrorReason): string {
  if (reason === "invalid-input") {
    return "Enter a reply or comment before updating.";
  }
  if (reason === "unsupported-capability") {
    return "This workspace cannot add that message.";
  }
  return errorMessage(reason);
}

function actionStateForResult(
  field: TicketMetadataMutationField,
  result: TicketMetadataMutationResult,
): TicketMetadataMutationActionState {
  if (result.status === "saved") {
    return { status: "saved", field, message: "Saved." };
  }
  if (result.status === "saved-refresh-failed") {
    return {
      status: "saved-refresh-failed",
      field,
      message:
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
    };
  }

  return {
    status: "failed",
    field,
    message: errorMessage(result.reason),
  };
}

function communicationActionStateForResult(
  result: TicketMetadataMutationResult,
): TicketMetadataMutationActionState {
  if (result.status === "saved") {
    return { status: "saved", field: "communication", message: "Saved." };
  }
  if (result.status === "saved-refresh-failed") {
    return {
      status: "saved-refresh-failed",
      field: "communication",
      message:
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
    };
  }

  return {
    status: "failed",
    field: "communication",
    message: communicationErrorMessage(result.reason),
  };
}

function metadataResultFromCommunicationResult(
  result: Awaited<ReturnType<typeof addWorkspaceTicketInternalNote>>,
): TicketMetadataMutationResult {
  return result;
}

export async function updateTicketMetadataAction(
  request: SelectedTicketUpdatePayload,
): Promise<TicketMetadataMutationActionState> {
  const actionInput = ticketMetadataMutationActionInput(request);
  if (actionInput.status === "invalid") {
    return {
      status: "failed",
      field: actionInput.field,
      message: errorMessage("invalid-input"),
    };
  }

  const user = await requireCurrentUser();
  let finalResult: TicketMetadataMutationResult | undefined;

  if (hasTicketMetadataMutationInput(actionInput.input)) {
    const result = await updateWorkspaceTicketMetadata(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
      actionInput.ticketExternalId,
      actionInput.input,
      prismaTicketDetailCacheRepository,
      prismaAiSummaryCacheRepository,
    );

    if (result.status === "failed") {
      return actionStateForResult(actionInput.field, result);
    }
    finalResult = result;
  }

  if (actionInput.commentBody) {
    const result = metadataResultFromCommunicationResult(
      await addWorkspaceTicketInternalNote(
        prismaHelpdeskConnectionsRepository,
        providerRegistry,
        env.APP_ENCRYPTION_KEY,
        user.id,
        actionInput.ticketExternalId,
        { body: actionInput.commentBody, bodyFormat: actionInput.bodyFormat },
        prismaTicketDetailCacheRepository,
        prismaAiSummaryCacheRepository,
      ),
    );
    if (result.status === "failed") {
      return communicationActionStateForResult(result);
    }
    finalResult = finalResult?.status === "saved-refresh-failed"
      ? finalResult
      : result;
  }

  if (actionInput.replyBody) {
    const result = metadataResultFromCommunicationResult(
      await addWorkspaceTicketCustomerReply(
        prismaHelpdeskConnectionsRepository,
        providerRegistry,
        env.APP_ENCRYPTION_KEY,
        user.id,
        actionInput.ticketExternalId,
        { body: actionInput.replyBody, bodyFormat: actionInput.bodyFormat },
        prismaTicketDetailCacheRepository,
        prismaAiSummaryCacheRepository,
      ),
    );
    if (result.status === "failed") {
      return communicationActionStateForResult(result);
    }
    finalResult = finalResult?.status === "saved-refresh-failed"
      ? finalResult
      : result;
  }

  const result =
    finalResult ?? { status: "failed", reason: "invalid-input", retryable: false };

  if (result.status === "saved" || result.status === "saved-refresh-failed") {
    revalidatePath("/workspace");
  }

  return actionStateForResult(actionInput.field, result);
}
