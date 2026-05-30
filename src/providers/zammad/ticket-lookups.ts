import {
  ProviderError,
  type ProviderContext,
  type ProviderLookupOption,
} from "@/core/providers";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import {
  cleanString,
  relationId,
  zammadUserDisplayName,
  zammadUserEmail,
} from "./participants";
import {
  zammadGroupListResponseSchema,
  zammadUserListResponseSchema,
  type ZammadGroup,
  type ZammadUser,
} from "./schemas";
import { zammadGetJson } from "./client";

const lookupPageSize = 50;

function providerDataMismatch(): ProviderError {
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

function lookupPath(path: string) {
  return `${path}?page=1&per_page=${lookupPageSize}`;
}

function userHasGroupAccess(user: ZammadUser): boolean {
  return Object.keys(user.group_ids ?? {}).length > 0;
}

function userLookupOption(user: ZammadUser): ProviderLookupOption | undefined {
  const externalId = relationId(user.id);
  const label = zammadUserDisplayName(user) ?? zammadUserEmail(user);

  return externalId && label ? { externalId, label } : undefined;
}

function groupLookupOption(group: ZammadGroup): ProviderLookupOption | undefined {
  const externalId = relationId(group.id);
  const label = cleanString(group.name);

  return externalId && label ? { externalId, label } : undefined;
}

function uniqueOptions(options: ProviderLookupOption[]): ProviderLookupOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.externalId)) {
      return false;
    }
    seen.add(option.externalId);
    return true;
  });
}

export async function listZammadAssignableUsers(
  context: ProviderContext,
): Promise<ProviderLookupOption[]> {
  return measureTicketReadPhase(
    "provider-user-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const raw = await zammadGetJson(context, lookupPath("/api/v1/users"));
      const parsed = zammadUserListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw providerDataMismatch();
      }
      return uniqueOptions(
        parsed.data
          .filter((user) => user.active !== false && userHasGroupAccess(user))
          .map(userLookupOption)
          .filter((option): option is ProviderLookupOption => Boolean(option)),
      );
    },
  );
}

export async function listZammadGroups(
  context: ProviderContext,
): Promise<ProviderLookupOption[]> {
  return measureTicketReadPhase(
    "provider-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const raw = await zammadGetJson(context, lookupPath("/api/v1/groups"));
      const parsed = zammadGroupListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw providerDataMismatch();
      }
      return uniqueOptions(
        parsed.data
          .filter((group) => group.active !== false)
          .map(groupLookupOption)
          .filter((option): option is ProviderLookupOption => Boolean(option)),
      );
    },
  );
}
