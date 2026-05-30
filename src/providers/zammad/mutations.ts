import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  Ticket,
  TicketMetadataMutationInput,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadBaseUrl, zammadGetJson, zammadSendJson } from "./client";
import { mapTicket } from "./mapping";
import {
  zammadStateMutationUnavailableReason,
  zammadStateRequiresPendingDate,
} from "./mutation-policy";
import {
  zammadFullTicketPayloadSchema,
  zammadTicketSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";

const zammadStateByCanonical: Record<TicketState, string> = {
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

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function firstTicketPayloadRecord(raw: unknown): {
  assets?: ZammadAssets;
  ticket: ZammadTicket;
} {
  const fullPayload = zammadFullTicketPayloadSchema.safeParse(raw);
  if (fullPayload.success) {
    const firstRecordId = fullPayload.data.record_ids?.[0];
    const ticket =
      firstRecordId !== undefined
        ? fullPayload.data.assets.Ticket?.[String(firstRecordId)]
        : Object.values(fullPayload.data.assets.Ticket ?? {})[0];
    if (!ticket) {
      throw providerDataMismatch();
    }
    return { assets: fullPayload.data.assets, ticket };
  }

  const ticket = zammadTicketSchema.safeParse(raw);
  if (!ticket.success) {
    throw providerDataMismatch();
  }

  return { ticket: ticket.data };
}

async function currentTicketForMutation(
  context: ProviderContext,
  ticketExternalId: string,
): Promise<Ticket> {
  const ticketId = encodeURIComponent(ticketExternalId);
  const rawTicket = await zammadGetJson(
    context,
    `/api/v1/tickets/${ticketId}?expand=true&full=true`,
  );
  const { assets, ticket } = firstTicketPayloadRecord(rawTicket);

  return mapTicket(ticket, zammadBaseUrl(context), assets);
}

async function assertZammadStateMutationAllowed(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketMetadataMutationInput,
): Promise<void> {
  if (!input.state) {
    return;
  }

  const currentTicket = await measureTicketReadPhase(
    "provider-metadata-mutation-current-ticket-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () => currentTicketForMutation(context, ticketExternalId),
  );
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

export async function updateZammadTicketMetadata(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketMetadataMutationInput,
): Promise<void> {
  const payload = mutationPayload(input);
  if (Object.keys(payload).length === 0) {
    throw new ProviderError(
      "validation-failure",
      "No supported ticket metadata changes were provided.",
    );
  }
  assertNoOrphanPendingDate(input);
  await assertZammadStateMutationAllowed(context, ticketExternalId, input);

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
