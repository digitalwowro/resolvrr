import type { ProviderContext } from "@/core/providers";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadGetJson } from "./client";
import {
  namedReferenceValue,
  relationId,
  zammadUserOrganizationName,
} from "./participants";
import {
  zammadOrganizationSchema,
  type ZammadAssets,
  type ZammadOrganization,
  type ZammadTicket,
  type ZammadUser,
} from "./schemas";

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}

function userRecords(
  assets: ZammadAssets | undefined,
  users: Record<string, ZammadUser> = {},
): ZammadUser[] {
  return Object.values({ ...assets?.User, ...users });
}

export function missingZammadOrganizationIds({
  assets,
  tickets = [],
  users,
}: {
  assets?: ZammadAssets;
  tickets?: ZammadTicket[];
  users?: Record<string, ZammadUser>;
}): string[] {
  const ids = new Set<string>();

  for (const ticket of tickets) {
    const organizationId = relationId(ticket.organization_id);
    if (
      organizationId &&
      !namedReferenceValue(ticket.organization) &&
      !assets?.Organization?.[organizationId]
    ) {
      ids.add(organizationId);
    }
  }

  for (const user of userRecords(assets, users)) {
    const organizationId = relationId(user.organization_id);
    if (organizationId && !zammadUserOrganizationName(user, assets)) {
      ids.add(organizationId);
    }
  }

  return [...ids];
}

export async function readOptionalZammadOrganizationAssets(
  context: ProviderContext,
  organizationIds: string[],
  operation: "detail" | "list",
): Promise<ZammadAssets | undefined> {
  if (organizationIds.length === 0) {
    return undefined;
  }

  return measureTicketReadPhase(
    "provider-organization-lookup-request",
    { ...timingMetadata(context), operation },
    async () => {
      const entries = await Promise.all(
        organizationIds.map(async (organizationId) => {
          try {
            const rawOrganization = await zammadGetJson(
              context,
              `/api/v1/organizations/${encodeURIComponent(organizationId)}`,
            );
            const parsed = zammadOrganizationSchema.safeParse(rawOrganization);
            return parsed.success
              ? ([organizationId, parsed.data] as const)
              : undefined;
          } catch {
            return undefined;
          }
        }),
      );
      const organizations = Object.fromEntries(
        entries.filter(
          (entry): entry is [string, ZammadOrganization] => Boolean(entry),
        ),
      );

      return Object.keys(organizations).length > 0
        ? { Organization: organizations }
        : undefined;
    },
  );
}
