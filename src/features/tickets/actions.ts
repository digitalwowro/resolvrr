"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { prismaWorkspaceSignatureRepository } from "@/data/workspace-signature-repository";
import { providerRegistry } from "@/providers";
import {
  addWorkspaceTicketCustomerReply,
  forwardWorkspaceTicketEmail,
  addWorkspaceTicketInternalNote,
} from "./communication-service";
import { ticketMetadataMutationActionInput } from "./metadata-action-input";
import { hasTicketMetadataMutationInput } from "./mutation-model";
import { updateWorkspaceTicketMetadata } from "./service";
import { finalizeWorkspaceTicketMutation } from "./mutation-finalization-service";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationResult,
} from "./mutation-model";
import {
  actionStateForResult,
  communicationActionStateForResult,
  metadataMutationErrorMessage,
  partialCommunicationActionState,
} from "./mutation-action-results";

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
      message: metadataMutationErrorMessage("invalid-input"),
    };
  }

  const user = await requireCurrentUser();
  let finalResult: TicketMetadataMutationResult | undefined;
  let mutationSaved = false;

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
      { finalize: false },
    );

    if (result.status === "failed") {
      return actionStateForResult(actionInput.field, result);
    }
    finalResult = result;
    mutationSaved = true;
  }

  if (actionInput.communication?.kind === "internal-comment") {
    const result = metadataResultFromCommunicationResult(
      await addWorkspaceTicketInternalNote(
        prismaHelpdeskConnectionsRepository,
        providerRegistry,
        env.APP_ENCRYPTION_KEY,
        user.id,
        actionInput.ticketExternalId,
        {
          body: actionInput.communication.body,
          bodyFormat: actionInput.communication.bodyFormat,
        },
        prismaTicketDetailCacheRepository,
        prismaAiSummaryCacheRepository,
        { finalize: false },
      ),
    );
    if (result.status === "failed") {
      if (mutationSaved || result.reason === "delivery-uncertain") {
        await finalizeWorkspaceTicketMutation(
          prismaHelpdeskConnectionsRepository,
          providerRegistry,
          env.APP_ENCRYPTION_KEY,
          user.id,
          actionInput.ticketExternalId,
          prismaTicketDetailCacheRepository,
          prismaAiSummaryCacheRepository,
        );
      }
      return finalResult
        ? partialCommunicationActionState(result)
        : communicationActionStateForResult(result);
    }
    finalResult = finalResult?.status === "saved-refresh-failed"
      ? finalResult
      : result;
    mutationSaved = true;
  }

  if (actionInput.communication?.kind === "customer-reply") {
    const result = metadataResultFromCommunicationResult(
      await addWorkspaceTicketCustomerReply(
        prismaHelpdeskConnectionsRepository,
        providerRegistry,
        env.APP_ENCRYPTION_KEY,
        user.id,
        actionInput.ticketExternalId,
        actionInput.communication,
        prismaTicketDetailCacheRepository,
        prismaAiSummaryCacheRepository,
        {
          finalize: false,
          signatureRepository: prismaWorkspaceSignatureRepository,
        },
      ),
    );
    if (result.status === "failed") {
      if (mutationSaved || result.reason === "delivery-uncertain") {
        await finalizeWorkspaceTicketMutation(
          prismaHelpdeskConnectionsRepository,
          providerRegistry,
          env.APP_ENCRYPTION_KEY,
          user.id,
          actionInput.ticketExternalId,
          prismaTicketDetailCacheRepository,
          prismaAiSummaryCacheRepository,
        );
      }
      return finalResult
        ? partialCommunicationActionState(result)
        : communicationActionStateForResult(result);
    }
    finalResult = finalResult?.status === "saved-refresh-failed"
      ? finalResult
      : result;
    mutationSaved = true;
  }

  if (actionInput.communication?.kind === "customer-forward") {
    const result = metadataResultFromCommunicationResult(
      await forwardWorkspaceTicketEmail(
        prismaHelpdeskConnectionsRepository,
        providerRegistry,
        env.APP_ENCRYPTION_KEY,
        user.id,
        actionInput.ticketExternalId,
        actionInput.communication,
        prismaTicketDetailCacheRepository,
        prismaAiSummaryCacheRepository,
        {
          finalize: false,
          signatureRepository: prismaWorkspaceSignatureRepository,
        },
      ),
    );
    if (result.status === "failed") {
      if (mutationSaved || result.reason === "delivery-uncertain") {
        await finalizeWorkspaceTicketMutation(
          prismaHelpdeskConnectionsRepository, providerRegistry,
          env.APP_ENCRYPTION_KEY, user.id, actionInput.ticketExternalId,
          prismaTicketDetailCacheRepository, prismaAiSummaryCacheRepository,
        );
      }
      return finalResult
        ? partialCommunicationActionState(result)
        : communicationActionStateForResult(result);
    }
    finalResult = finalResult?.status === "saved-refresh-failed" ? finalResult : result;
    mutationSaved = true;
  }

  if (mutationSaved) {
    finalResult = await finalizeWorkspaceTicketMutation(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
      actionInput.ticketExternalId,
      prismaTicketDetailCacheRepository,
      prismaAiSummaryCacheRepository,
    );
  }

  const result =
    finalResult ?? { status: "failed", reason: "invalid-input", retryable: false };

  if (result.status === "saved" || result.status === "saved-refresh-failed") {
    revalidatePath("/workspace");
  }

  return actionStateForResult(actionInput.field, result);
}
