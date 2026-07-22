import { ProviderError, type ProviderContext } from "@/core/providers";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadGetJson } from "./client";
import {
  missingZammadOrganizationIds,
  readOptionalZammadOrganizationAssets,
} from "./organization-assets";
import { namedAssetValue, namedReferenceValue, relationId } from "./participants";
import {
  zammadGenericNamedAssetListResponseSchema,
  zammadUserSchema,
  type ZammadAssets,
  type ZammadGenericNamedAsset,
  type ZammadTicket,
  type ZammadUser,
} from "./schemas";
function providerDataMismatch() {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}

function relationIds(
  tickets: ZammadTicket[],
  field: "group_id" | "priority_id" | "state_id",
) {
  return [
    ...new Set(
      tickets
        .map((ticket) => ticket[field])
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(String),
    ),
  ];
}

function ticketUserIds(tickets: ZammadTicket[]) {
  return [
    ...new Set(
      tickets
        .flatMap((ticket) => [ticket.customer_id, ticket.owner_id])
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(String),
    ),
  ];
}

function namedAssetMap(assets: ZammadGenericNamedAsset[]) {
  return Object.fromEntries(
    assets
      .map((asset) => [relationId(asset.id), asset] as const)
      .filter((entry): entry is [string, ZammadGenericNamedAsset] =>
        Boolean(entry[0]),
      ),
  );
}

async function fetchZammadUsers(
  context: ProviderContext,
  userIds: string[],
): Promise<Record<string, ZammadUser>> {
  if (userIds.length === 0) return {};
  return measureTicketReadPhase(
    "provider-user-lookup-request",
    { ...timingMetadata(context), operation: "list" },
    async () => {
      const entries = await Promise.all(
        userIds.map(async (userId) => {
          const raw = await zammadGetJson(
            context,
            `/api/v1/users/${encodeURIComponent(userId)}`,
          );
          const parsed = zammadUserSchema.safeParse(raw);
          if (!parsed.success) throw providerDataMismatch();
          return [userId, parsed.data] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  );
}

export async function fetchZammadNamedAssets(
  context: ProviderContext,
  path: string,
): Promise<Record<string, ZammadGenericNamedAsset>> {
  return measureTicketReadPhase(
    "provider-lookup-request",
    { ...timingMetadata(context), operation: "list" },
    async () => {
      const parsed = zammadGenericNamedAssetListResponseSchema.safeParse(
        await zammadGetJson(context, path),
      );
      if (!parsed.success) throw providerDataMismatch();
      return namedAssetMap(parsed.data);
    },
  );
}

function missingNamedIds(
  tickets: ZammadTicket[],
  assets: ZammadAssets | undefined,
  type: "group" | "priority" | "state",
) {
  const configuration = {
    group: ["group_id", "group", assets?.Group],
    priority: ["priority_id", "priority", assets?.TicketPriority],
    state: ["state_id", "state", assets?.State],
  } as const;
  const [idField, referenceField, assetMap] = configuration[type];
  return relationIds(tickets, idField).filter((externalId) =>
    tickets.some(
      (ticket) =>
        relationId(ticket[idField]) === externalId &&
        !namedReferenceValue(ticket[referenceField]) &&
        !namedAssetValue(assetMap, externalId) &&
        (type !== "priority" ||
          !namedAssetValue(assets?.Priority, externalId)),
    ),
  );
}

function mergeAssets(
  assets: ZammadAssets | undefined,
  lookups: {
    groups: Record<string, ZammadGenericNamedAsset>;
    priorities: Record<string, ZammadGenericNamedAsset>;
    states: Record<string, ZammadGenericNamedAsset>;
    users: Record<string, ZammadUser>;
  },
  organizations?: ZammadAssets,
): ZammadAssets {
  return {
    ...assets,
    ...organizations,
    Group: { ...assets?.Group, ...lookups.groups },
    Organization: {
      ...assets?.Organization,
      ...organizations?.Organization,
    },
    State: { ...assets?.State, ...lookups.states },
    TicketPriority: {
      ...assets?.TicketPriority,
      ...lookups.priorities,
    },
    User: { ...assets?.User, ...lookups.users },
  };
}

export async function resolveZammadTicketListAssets(
  context: ProviderContext,
  assets: ZammadAssets | undefined,
  tickets: ZammadTicket[],
) {
  const [users, groups, states, priorities] = await Promise.all([
    fetchZammadUsers(
      context,
      ticketUserIds(tickets).filter((id) => !assets?.User?.[id]),
    ),
    missingNamedIds(tickets, assets, "group").length
      ? fetchZammadNamedAssets(context, "/api/v1/groups")
      : Promise.resolve({}),
    missingNamedIds(tickets, assets, "state").length
      ? fetchZammadNamedAssets(context, "/api/v1/ticket_states")
      : Promise.resolve({}),
    missingNamedIds(tickets, assets, "priority").length
      ? fetchZammadNamedAssets(context, "/api/v1/ticket_priorities")
      : Promise.resolve({}),
  ]);
  const lookups = { groups, priorities, states, users };
  const withLookups = mergeAssets(assets, lookups);
  const organizations = await readOptionalZammadOrganizationAssets(
    context,
    missingZammadOrganizationIds({ assets: withLookups, tickets }),
    "list",
  );
  return mergeAssets(assets, lookups, organizations);
}
