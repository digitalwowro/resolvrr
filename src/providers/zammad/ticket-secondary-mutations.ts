import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketLinkRelationKind,
  TicketMetadataMutationInput,
} from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadSendJson } from "./client";
import { readZammadTicketTags } from "./ticket-secondary";
import { readZammadTicketSubscription } from "./ticket-subscription";

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    operation: "mutation" as const,
    providerKey: context.connection.providerKey,
  };
}

function zammadTicketId(value: string, field: string): number {
  const normalized = value.trim().replace(/^#/u, "");
  if (!/^\d+$/u.test(normalized)) {
    throw new ProviderError(
      "validation-failure",
      `Invalid ${field} ticket reference for the helpdesk provider.`,
    );
  }

  const id = Number(normalized);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ProviderError(
      "validation-failure",
      `Invalid ${field} ticket reference for the helpdesk provider.`,
    );
  }

  return id;
}

function zammadTicketNumber(value: string): string {
  const normalized = value.trim().replace(/^#/u, "");
  if (!/^\d+$/u.test(normalized)) {
    throw new ProviderError(
      "validation-failure",
      "Invalid source ticket reference for the helpdesk provider.",
    );
  }

  return normalized;
}

function zammadLinkType(relation: TicketLinkRelationKind | undefined): string {
  if (relation === "parent") {
    return "child";
  }
  if (relation === "child") {
    return "parent";
  }
  return "normal";
}

async function sendSecondaryMutation(
  context: ProviderContext,
  path: string,
  method: "POST" | "DELETE",
  body: unknown,
) {
  await measureTicketReadPhase(
    "provider-metadata-mutation-request",
    timingMetadata(context),
    () => zammadSendJson(context, path, method, body),
  );
}

export async function updateZammadTicketTags(
  context: ProviderContext,
  ticketExternalId: string,
  tags: string[] | undefined,
): Promise<void> {
  if (tags === undefined) {
    return;
  }

  const currentTags = await readZammadTicketTags(context, ticketExternalId);
  const current = new Set(currentTags);
  const next = new Set(tags);
  const mutationBody = (tag: string) => ({
    item: tag,
    object: "Ticket",
    o_id: zammadTicketId(ticketExternalId, "tag"),
  });

  for (const tag of currentTags.filter((tag) => !next.has(tag))) {
    await sendSecondaryMutation(
      context,
      "/api/v1/tags/remove",
      "DELETE",
      mutationBody(tag),
    );
  }
  for (const tag of tags.filter((tag) => !current.has(tag))) {
    await sendSecondaryMutation(
      context,
      "/api/v1/tags/add",
      "POST",
      mutationBody(tag),
    );
  }
}

export async function updateZammadTicketLinks(
  context: ProviderContext,
  ticketNumber: string,
  input: Pick<
    TicketMetadataMutationInput,
    "linkAddExternalId" | "linkAddRelation" | "linkRemoveExternalIds"
  >,
): Promise<void> {
  const sourceNumber = zammadTicketNumber(ticketNumber);

  for (const externalId of input.linkRemoveExternalIds ?? []) {
    await sendSecondaryMutation(context, "/api/v1/links/remove", "DELETE", {
      link_type: "normal",
      link_object_source: "Ticket",
      link_object_source_value: Number(sourceNumber),
      link_object_target: "Ticket",
      link_object_target_value: zammadTicketId(externalId, "linked"),
    });
  }

  if (input.linkAddExternalId) {
    await sendSecondaryMutation(context, "/api/v1/links/add", "POST", {
      link_type: zammadLinkType(input.linkAddRelation),
      link_object_target: "Ticket",
      link_object_target_value: zammadTicketId(input.linkAddExternalId, "linked"),
      link_object_source: "Ticket",
      link_object_source_number: sourceNumber,
    });
  }
}

export async function updateZammadTicketSubscription(
  context: ProviderContext,
  ticketExternalId: string,
  following: boolean | undefined,
): Promise<void> {
  if (following === undefined) {
    return;
  }

  const subscription = await readZammadTicketSubscription(context, ticketExternalId);
  if (following && !subscription.following) {
    await sendSecondaryMutation(context, "/api/v1/mentions", "POST", {
      mentionable_type: "Ticket",
      mentionable_id: zammadTicketId(ticketExternalId, "subscription"),
    });
  }
  if (!following && subscription.externalId) {
    await sendSecondaryMutation(
      context,
      `/api/v1/mentions/${encodeURIComponent(subscription.externalId)}`,
      "DELETE",
      {},
    );
  }
}
