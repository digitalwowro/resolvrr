import { ProviderError, type ProviderContext } from "@/core/providers";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadGetJson } from "./client";
import {
  zammadArticleListSchema,
  zammadFullTicketPayloadSchema,
  zammadTicketListSchema,
  zammadUserSchema,
  type ZammadArticle,
  type ZammadAssets,
  type ZammadTicket,
  type ZammadUser,
} from "./schemas";

function orderedAssetRecords<T>(
  records: Record<string, T> | undefined,
  recordIds: Array<string | number> | undefined,
): T[] {
  if (!records) return [];
  if (!recordIds?.length) return Object.values(records);
  return recordIds
    .map((id) => records[String(id)])
    .filter((record): record is T => Boolean(record));
}

function isFullPayload(payload: unknown): payload is {
  assets: ZammadAssets;
  record_ids?: Array<string | number>;
} {
  return zammadFullTicketPayloadSchema.safeParse(payload).success;
}

export function zammadTicketPayloadRecords(payload: unknown): {
  assets?: ZammadAssets;
  tickets: ZammadTicket[];
} {
  if (Array.isArray(payload)) {
    const parsed = zammadTicketListSchema.safeParse(payload);
    return { tickets: parsed.success ? parsed.data : [] };
  }
  if (!isFullPayload(payload)) return { tickets: [] };
  return {
    assets: payload.assets,
    tickets: orderedAssetRecords(payload.assets.Ticket, payload.record_ids),
  };
}

export function zammadArticlePayloadRecords(payload: unknown): {
  articles: ZammadArticle[];
  assets?: ZammadAssets;
} {
  if (Array.isArray(payload)) {
    const parsed = zammadArticleListSchema.safeParse(payload);
    return { articles: parsed.success ? parsed.data : [] };
  }
  if (!isFullPayload(payload)) return { articles: [] };
  return {
    articles: orderedAssetRecords(
      payload.assets.TicketArticle,
      payload.record_ids,
    ),
    assets: payload.assets,
  };
}

export function zammadDetailUserIds(
  ticket: ZammadTicket,
  articles: ZammadArticle[],
): string[] {
  return [
    ...new Set(
      [
        ticket.customer_id,
        ticket.owner_id,
        ...articles.map((article) => article.created_by_id),
      ]
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(String),
    ),
  ];
}

export function missingZammadDetailUserIds(
  assets: ZammadAssets | undefined,
  userIds: string[],
) {
  return userIds.filter((userId) => !assets?.User?.[userId]);
}

export async function fetchZammadDetailUsers(
  context: ProviderContext,
  userIds: string[],
): Promise<Record<string, ZammadUser>> {
  if (userIds.length === 0) return {};
  return measureTicketReadPhase(
    "provider-user-lookup-request",
    {
      connectionId: context.connection.id,
      providerKey: context.connection.providerKey,
      operation: "detail",
    },
    async () => {
      const entries = await Promise.all(
        userIds.map(async (userId) => {
          const raw = await zammadGetJson(
            context,
            `/api/v1/users/${encodeURIComponent(userId)}`,
          );
          const parsed = zammadUserSchema.safeParse(raw);
          if (!parsed.success) {
            throw new ProviderError(
              "provider-data-mismatch",
              "The helpdesk provider returned an unexpected response.",
            );
          }
          return [userId, parsed.data] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  );
}

export function mergeZammadDetailAssets(
  assets: ZammadAssets | undefined,
  users: Record<string, ZammadUser>,
  secondaryAssets: ZammadAssets | undefined,
  organizationAssets?: ZammadAssets,
): ZammadAssets {
  return {
    ...assets,
    ...secondaryAssets,
    ...organizationAssets,
    User: { ...assets?.User, ...secondaryAssets?.User, ...users },
    Organization: {
      ...assets?.Organization,
      ...secondaryAssets?.Organization,
      ...organizationAssets?.Organization,
    },
    Group: { ...assets?.Group, ...secondaryAssets?.Group },
  };
}
