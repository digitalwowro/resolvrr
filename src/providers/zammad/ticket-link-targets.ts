import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketLinkTarget,
  TicketLinkTargetSearchInput,
} from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { mapTicket } from "./mapping";
import { zammadBaseUrl, zammadGetJson } from "./client";
import { relationId } from "./participants";
import {
  zammadFullTicketPayloadSchema,
  zammadTicketListResponseSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    operation: "lookup" as const,
    providerKey: context.connection.providerKey,
  };
}

function isFullPayload(
  payload: unknown,
): payload is {
  assets: ZammadAssets;
  record_ids?: Array<string | number>;
} {
  return zammadFullTicketPayloadSchema.safeParse(payload).success;
}

function orderedAssetRecords<T>(
  records: Record<string, T> | undefined,
  recordIds: Array<string | number> | undefined,
): T[] {
  if (!records) {
    return [];
  }
  if (recordIds && recordIds.length > 0) {
    return recordIds
      .map((id) => records[String(id)])
      .filter((record): record is T => Boolean(record));
  }

  return Object.values(records);
}

function ticketPayloadRecords(payload: unknown): {
  assets?: ZammadAssets;
  tickets: ZammadTicket[];
} {
  if (Array.isArray(payload)) {
    return { tickets: payload };
  }
  if (isFullPayload(payload)) {
    return {
      assets: payload.assets,
      tickets: orderedAssetRecords(payload.assets.Ticket, payload.record_ids),
    };
  }

  return { tickets: [] };
}

function linkTarget(
  ticket: ZammadTicket,
  assets: ZammadAssets | undefined,
  baseUrl: string,
): TicketLinkTarget {
  const mapped = mapTicket(ticket, baseUrl, assets);
  return {
    customer: mapped.customer?.name ?? mapped.customer?.email,
    externalId: mapped.externalId,
    number: mapped.number,
    priority: mapped.priority,
    state: mapped.state,
    title: mapped.title,
  };
}

function zammadCustomerId(value: string): string {
  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new ProviderError(
      "validation-failure",
      "Invalid customer reference for the helpdesk provider.",
    );
  }

  return normalized;
}

function zammadCustomerLinkTargetQuery(input: TicketLinkTargetSearchInput) {
  const query = input.query?.trim() ?? "";
  if (!input.customerExternalId) {
    return query;
  }

  const customerQuery = `customer_id:${zammadCustomerId(input.customerExternalId)}`;
  return query ? `(${query}) AND ${customerQuery}` : customerQuery;
}

export async function searchZammadLinkTargets(
  context: ProviderContext,
  input: TicketLinkTargetSearchInput,
): Promise<TicketLinkTarget[]> {
  const query = zammadCustomerLinkTargetQuery(input);
  if (!query) {
    return [];
  }

  return measureTicketReadPhase(
    "provider-link-target-lookup-request",
    timingMetadata(context),
    async () => {
      const params = new URLSearchParams({
        full: "true",
        limit: String(input.limit ?? 8),
        query,
      });
      const raw = await zammadGetJson(
        context,
        `/api/v1/tickets/search?${params}`,
      );
      const parsed = zammadTicketListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw providerDataMismatch();
      }

      const payload = ticketPayloadRecords(parsed.data);
      return payload.tickets
        .filter((ticket) => {
          const externalId = relationId(ticket.id);
          return (
            externalId &&
            externalId !== input.excludeTicketExternalId
          );
        })
        .map((ticket) =>
          linkTarget(ticket, payload.assets, zammadBaseUrl(context)),
        );
    },
  );
}
