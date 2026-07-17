import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  Ticket,
  TicketMetadataMutationInput,
  TicketPriority,
  TicketMutableState,
} from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadBaseUrl, zammadSendJson } from "./client";
import { mapTicket } from "./mapping";
import {
  zammadStateMutationUnavailableReason,
  zammadStateRequiresPendingDate,
} from "./mutation-policy";
import {
  updateZammadTicketLinks,
  updateZammadTicketSubscription,
  updateZammadTicketTags,
} from "./ticket-secondary-mutations";
import { readZammadTicketForMutation } from "./ticket-mutation-preflight";
import { assertZammadOwnerGroupCompatible } from "./owner-assignment";

const zammadStateByCanonical: Record<TicketMutableState, string> = {
  new: "new",
  open: "open",
  pending_reminder: "pending reminder",
  pending_close: "pending close",
  closed: "closed",
};

const zammadPriorityByCanonical: Record<TicketPriority, string> = {
  low: "1 low",
  medium: "2 normal",
  high: "3 high",
};

function mutationPayload(input: TicketMetadataMutationInput) {
  return {
    ...(input.ownerExternalId
      ? { owner_id: zammadMutationId(input.ownerExternalId, "owner") }
      : {}),
    ...(input.groupExternalId
      ? { group_id: zammadMutationId(input.groupExternalId, "group") }
      : {}),
    ...(input.state ? { state: zammadStateByCanonical[input.state] } : {}),
    ...(input.state &&
    zammadStateRequiresPendingDate(input.state) &&
    input.pendingUntil
      ? { pending_time: input.pendingUntil.toISOString() }
      : {}),
    ...(input.priority ? { priority: zammadPriorityByCanonical[input.priority] } : {}),
  };
}

function zammadMutationId(value: string, field: string): number {
  if (!/^\d+$/u.test(value)) {
    throw new ProviderError(
      "validation-failure",
      `Invalid ${field} reference for the helpdesk provider.`,
    );
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ProviderError(
      "validation-failure",
      `Invalid ${field} reference for the helpdesk provider.`,
    );
  }

  return id;
}

function assertNoOrphanPendingDate(input: TicketMetadataMutationInput) {
  if (
    input.pendingUntil &&
    (!input.state || !zammadStateRequiresPendingDate(input.state))
  ) {
    throw new ProviderError(
      "validation-failure",
      "Pending date and time can only be saved with a pending state.",
    );
  }
}

async function currentTicketForMutation(
  context: ProviderContext,
  ticketExternalId: string,
) {
  return readZammadTicketForMutation(context, ticketExternalId);
}

function assertZammadStateMutationAllowed(
  currentTicket: Ticket,
  input: TicketMetadataMutationInput,
): void {
  if (!input.state) {
    return;
  }

  const unavailableReason = zammadStateMutationUnavailableReason(
    currentTicket,
    input.state,
  );
  if (unavailableReason) {
    throw new ProviderError("validation-failure", unavailableReason);
  }
  if (zammadStateRequiresPendingDate(input.state)) {
    const pendingUntil = input.pendingUntil;
    const pendingUntilTime = pendingUntil?.getTime() ?? Number.NaN;
    if (!Number.isFinite(pendingUntilTime) || pendingUntilTime <= Date.now()) {
      throw new ProviderError(
        "validation-failure",
        "Choose a future pending date and time.",
      );
    }
  }
}

function hasSecondaryMutation(input: TicketMetadataMutationInput): boolean {
  return (
    input.tags !== undefined ||
    Boolean(input.linkAddExternalId) ||
    Boolean(input.linkRemoveExternalIds?.length) ||
    input.subscriptionFollowing !== undefined
  );
}

export async function updateZammadTicketMetadata(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketMetadataMutationInput,
): Promise<void> {
  const payload = mutationPayload(input);
  if (Object.keys(payload).length === 0 && !hasSecondaryMutation(input)) {
    throw new ProviderError(
      "validation-failure",
      "No supported ticket metadata changes were provided.",
    );
  }
  assertNoOrphanPendingDate(input);
  const currentPayload = await measureTicketReadPhase(
    "provider-metadata-mutation-current-ticket-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () => currentTicketForMutation(context, ticketExternalId),
  );
  const currentTicket: Ticket = mapTicket(
    currentPayload.ticket,
    zammadBaseUrl(context),
    currentPayload.assets,
  );
  await assertZammadOwnerGroupCompatible(
    context,
    currentPayload.ticket,
    input,
  );
  assertZammadStateMutationAllowed(currentTicket, input);

  if (Object.keys(payload).length > 0) {
    await measureTicketReadPhase(
      "provider-metadata-mutation-request",
      {
        connectionId: context.connection.id,
        operation: "mutation",
        providerKey: context.connection.providerKey,
      },
      () =>
        zammadSendJson(
          context,
          `/api/v1/tickets/${encodeURIComponent(ticketExternalId)}`,
          "PUT",
          payload,
        ),
    );
  }

  await updateZammadTicketTags(context, ticketExternalId, input.tags);
  if (input.linkAddExternalId || input.linkRemoveExternalIds?.length) {
    const currentTicket = await currentTicketForMutation(context, ticketExternalId);
    await updateZammadTicketLinks(context, currentTicket.ticket.number, input);
  }
  await updateZammadTicketSubscription(
    context,
    ticketExternalId,
    input.subscriptionFollowing,
  );
}
