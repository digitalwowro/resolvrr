import { z } from "zod";
import {
  ProviderError,
  type ProviderContext,
  type ProviderLookupOption,
} from "@/core/providers";
import type { TicketAssignableUserLookupInput } from "@/core/ticket-lookups";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import {
  cleanString,
  relationId,
  zammadUserDisplayName,
  zammadUserEmail,
} from "./participants";
import {
  zammadGroupListResponseSchema,
  zammadUserSchema,
  zammadUserListResponseSchema,
  type ZammadGroup,
  type ZammadUser,
} from "./schemas";
import { zammadGetJson } from "./client";

const lookupPageSize = 200;
const zammadTagListResponseSchema = z.array(
  z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
  }).passthrough(),
);

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

function lookupPath(path: string, page: number) {
  return `${path}?page=${page}&per_page=${lookupPageSize}`;
}

function lookupReferenceIds(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => {
    if (!/^\d+$/u.test(value) || Number(value) <= 0) {
      throw new ProviderError(
        "validation-failure",
        "Invalid helpdesk lookup reference.",
      );
    }
    return value;
  });
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

function tagLookupOption(tag: {
  id?: number | string;
  name?: string;
}): ProviderLookupOption | undefined {
  const label = cleanString(tag.name);
  if (!label) {
    return undefined;
  }

  return { externalId: relationId(tag.id) ?? label, label };
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
  input: TicketAssignableUserLookupInput = { groupExternalIds: [] },
): Promise<ProviderLookupOption[]> {
  return measureTicketReadPhase(
    "provider-user-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const groupExternalIds = lookupReferenceIds(input.groupExternalIds);
      const externalIds = lookupReferenceIds(input.externalIds);
      const options: ProviderLookupOption[] = [];
      const seenPageIds = new Set<string>();
      for (let page = 1; ; page += 1) {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(lookupPageSize),
          permissions: "ticket.agent",
          query: "*",
        });
        groupExternalIds.forEach((groupExternalId) => {
          params.append(`group_ids[${groupExternalId}]`, "full");
        });
        externalIds.forEach((externalId) => {
          params.append("ids[]", externalId);
        });
        const raw = await zammadGetJson(
          context,
          `/api/v1/users/search?${params.toString()}`,
        );
        const parsed = zammadUserListResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw providerDataMismatch();
        }
        const pageIds = parsed.data.map((user) => relationId(user.id)).filter(Boolean);
        if (pageIds.some((externalId) => seenPageIds.has(externalId!))) {
          throw providerDataMismatch();
        }
        pageIds.forEach((externalId) => seenPageIds.add(externalId!));
        options.push(
          ...parsed.data
            .filter((user) => user.active !== false)
            .map(userLookupOption)
            .filter((option): option is ProviderLookupOption => Boolean(option)),
        );
        if (parsed.data.length < lookupPageSize) {
          break;
        }
      }
      return uniqueOptions(options);
    },
  );
}

export async function getZammadCurrentUser(
  context: ProviderContext,
): Promise<ProviderLookupOption> {
  return measureTicketReadPhase(
    "provider-user-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const raw = await zammadGetJson(context, "/api/v1/users/me");
      const parsed = zammadUserSchema.safeParse(raw);
      if (!parsed.success) {
        throw providerDataMismatch();
      }
      const option = userLookupOption(parsed.data);
      if (!option) {
        throw providerDataMismatch();
      }
      return option;
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
      const options: ProviderLookupOption[] = [];
      for (let page = 1; ; page += 1) {
        const raw = await zammadGetJson(
          context,
          lookupPath("/api/v1/groups", page),
        );
        const parsed = zammadGroupListResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw providerDataMismatch();
        }
        options.push(
          ...parsed.data
            .filter((group) => group.active !== false)
            .map(groupLookupOption)
            .filter((option): option is ProviderLookupOption => Boolean(option)),
        );
        if (parsed.data.length < lookupPageSize) {
          break;
        }
      }
      return uniqueOptions(options);
    },
  );
}

export async function listZammadTags(
  context: ProviderContext,
): Promise<ProviderLookupOption[]> {
  return measureTicketReadPhase(
    "provider-tag-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      const raw = await zammadGetJson(context, "/api/v1/tag_list");
      const parsed = zammadTagListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw providerDataMismatch();
      }
      return uniqueOptions(
        parsed.data
          .map(tagLookupOption)
          .filter((option): option is ProviderLookupOption => Boolean(option)),
      );
    },
  );
}
