"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import {
  ticketPriorities,
  ticketStates,
  type TicketMetadataMutationInput,
  type TicketPriority,
  type TicketState,
} from "@/core/tickets";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import { updateWorkspaceTicketMetadata } from "./service";
import type {
  TicketMetadataMutationActionState,
  TicketMetadataMutationErrorReason,
  TicketMetadataMutationField,
  TicketMetadataMutationResult,
} from "./mutation-model";

function textValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isTicketState(value: string): value is TicketState {
  return ticketStates.includes(value as TicketState);
}

function isTicketPriority(value: string): value is TicketPriority {
  return ticketPriorities.includes(value as TicketPriority);
}

function errorMessage(reason: TicketMetadataMutationErrorReason): string {
  if (reason === "invalid-input") {
    return "Choose a state or priority to save.";
  }
  if (reason === "unsupported-capability") {
    return "This workspace cannot update that field.";
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

export async function updateTicketMetadataAction(
  formData: FormData,
): Promise<TicketMetadataMutationActionState> {
  const ticketExternalId = textValue(formData, "ticketExternalId");
  const field = textValue(formData, "field");
  const value = textValue(formData, "value");

  let input: TicketMetadataMutationInput | undefined;
  let mutationField: TicketMetadataMutationField | undefined;
  if (field === "state" && isTicketState(value)) {
    input = { state: value };
    mutationField = "state";
  }
  if (field === "priority" && isTicketPriority(value)) {
    input = { priority: value };
    mutationField = "priority";
  }

  if (!ticketExternalId || !input || !mutationField) {
    return {
      status: "failed",
      field: field === "priority" ? "priority" : "state",
      message: errorMessage("invalid-input"),
    };
  }

  const user = await requireCurrentUser();
  const result = await updateWorkspaceTicketMetadata(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    ticketExternalId,
    input,
  );

  if (result.status === "saved") {
    revalidatePath("/workspace");
  }

  return actionStateForResult(mutationField, result);
}
