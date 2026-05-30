import { z } from "zod";
import type { ProviderContext } from "@/core/providers";
import type { TicketLink, TicketSubscription } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadBaseUrl, zammadGetJson } from "./client";
import { namedReferenceValue, relationId } from "./participants";
import {
  zammadAssetsSchema,
  zammadGenericNamedAssetSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";
import { readOptionalZammadTicketSubscription } from "./ticket-subscription";

const zammadTagsResponseSchema = z
  .object({ tags: z.array(z.string()).default([]) })
  .passthrough();

const zammadLinkSchema = z
  .object({
    link_type: z.string().nullish(),
    link_object: z.string().nullish(),
    link_object_value: z.union([z.number(), z.string()]).nullish(),
  })
  .passthrough();

const zammadLinksResponseSchema = z
  .object({
    links: z.array(zammadLinkSchema).default([]),
    assets: zammadAssetsSchema.optional(),
  })
  .passthrough();

export type ZammadSecondaryTicketData = {
  assets?: ZammadAssets;
  links: TicketLink[];
  subscription: TicketSubscription;
  tags: string[];
};

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}

async function optionalSecondary<T>(
  fallback: T,
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

function linkDirection(value: string | null | undefined): TicketLink["direction"] {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("parent")) {
    return "parent";
  }
  if (normalized.includes("child")) {
    return "child";
  }
  return "related";
}

function linkedTicketLabel(ticket: ZammadTicket | undefined, ticketId: string) {
  if (!ticket) {
    return `Ticket ${ticketId}`;
  }
  return `#${ticket.number} ${ticket.title}`;
}

function linkedTicketUrl(baseUrl: string, ticket: ZammadTicket | undefined) {
  return ticket ? `${baseUrl}/#ticket/zoom/${ticket.id}` : undefined;
}

function mapZammadLinks(
  raw: unknown,
  baseUrl: string,
  currentTicketId: string,
): { assets?: ZammadAssets; links: TicketLink[] } {
  const parsed = zammadLinksResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { links: [] };
  }

  return {
    assets: parsed.data.assets,
    links: parsed.data.links
      .filter((link) => link.link_object === "Ticket")
      .map((link) => {
        const externalId = String(link.link_object_value ?? "");
        const ticket = parsed.data.assets?.Ticket?.[externalId];
        return {
          direction: linkDirection(link.link_type),
          externalId,
          label: linkedTicketLabel(ticket, externalId),
          providerUrl: linkedTicketUrl(baseUrl, ticket),
        };
      })
      .filter((link) => link.externalId && link.externalId !== currentTicketId),
  };
}

export async function readZammadTicketTags(
  context: ProviderContext,
  ticketId: string,
): Promise<string[]> {
  return measureTicketReadPhase(
    "provider-secondary-tags-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const query = new URLSearchParams({ object: "Ticket", o_id: ticketId });
      const raw = await zammadGetJson(context, `/api/v1/tags?${query}`);
      return zammadTagsResponseSchema.safeParse(raw).data?.tags ?? [];
    },
  );
}

async function readZammadTicketLinks(
  context: ProviderContext,
  ticketId: string,
): Promise<{ assets?: ZammadAssets; links: TicketLink[] }> {
  return measureTicketReadPhase(
    "provider-secondary-links-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const query = new URLSearchParams({
        link_object: "Ticket",
        link_object_value: ticketId,
      });
      const raw = await zammadGetJson(context, `/api/v1/links?${query}`);
      return mapZammadLinks(raw, zammadBaseUrl(context), ticketId);
    },
  );
}

function missingGroupId(ticket: ZammadTicket, assets?: ZammadAssets) {
  const groupId = relationId(ticket.group_id);
  if (!groupId || namedReferenceValue(ticket.group) || assets?.Group?.[groupId]) {
    return undefined;
  }
  return groupId;
}

async function readZammadTicketGroup(
  context: ProviderContext,
  ticket: ZammadTicket,
  assets?: ZammadAssets,
): Promise<ZammadAssets | undefined> {
  const groupId = missingGroupId(ticket, assets);
  if (!groupId) {
    return undefined;
  }

  return measureTicketReadPhase(
    "provider-secondary-group-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const raw = await zammadGetJson(
        context,
        `/api/v1/groups/${encodeURIComponent(groupId)}`,
      );
      const parsed = zammadGenericNamedAssetSchema.safeParse(raw);
      return parsed.success ? { Group: { [groupId]: parsed.data } } : undefined;
    },
  );
}

export async function readZammadSecondaryTicketData(
  context: ProviderContext,
  ticket: ZammadTicket,
  assets?: ZammadAssets,
): Promise<ZammadSecondaryTicketData> {
  const ticketId = String(ticket.id);
  const [tags, linkResult, subscription, groupAssets] = await Promise.all([
    optionalSecondary([], () => readZammadTicketTags(context, ticketId)),
    optionalSecondary({ links: [] }, () => readZammadTicketLinks(context, ticketId)),
    readOptionalZammadTicketSubscription(context, ticketId),
    optionalSecondary(undefined, () => readZammadTicketGroup(context, ticket, assets)),
  ]);

  return {
    assets: { ...linkResult.assets, ...groupAssets },
    links: linkResult.links,
    subscription,
    tags,
  };
}
