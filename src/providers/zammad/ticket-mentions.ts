import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketMentionLookupInput,
  TicketMentionOption,
} from "@/core/ticket-mentions";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadBaseUrl, zammadPostJsonRead } from "./client";

const mentionSuggestionsQuery = `
  query mentionSuggestions($query: String!, $groupId: ID!) {
    mentionSuggestions(query: $query, groupId: $groupId) {
      internalId
      fullname
      email
      active
    }
  }
`;

const responseSchema = z.object({
  data: z.object({
    mentionSuggestions: z.array(z.object({
      active: z.boolean().optional(),
      email: z.string().nullish(),
      fullname: z.string().nullish(),
      internalId: z.union([z.number(), z.string()]),
    }).passthrough()).nullish(),
  }).nullish(),
  errors: z.array(z.unknown()).optional(),
}).passthrough();

const neutralMentionPattern =
  /<span\b[^>]*\bdata-resolvrr-mention-id="([^"]+)"[^>]*>([\s\S]*?)<\/span>/giu;

function numericId(value: string, name: string): number {
  if (!/^\d+$/u.test(value)) {
    throw new ProviderError(
      "validation-failure",
      `Invalid ${name} reference for the helpdesk provider.`,
      false,
      undefined,
      "invalid-mention",
    );
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ProviderError(
      "validation-failure",
      `Invalid ${name} reference for the helpdesk provider.`,
      false,
      undefined,
      "invalid-mention",
    );
  }
  return id;
}

function providerMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function searchableMentionText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase();
}

export async function listZammadMentionableUsers(
  context: ProviderContext,
  input: TicketMentionLookupInput,
): Promise<TicketMentionOption[]> {
  const groupId = numericId(input.groupExternalId, "group");
  const query = input.query.trim();
  if (!query || query.length > 80 || /[\0\r\n]/u.test(query)) {
    throw new ProviderError("validation-failure", "Invalid mention search.");
  }
  return measureTicketReadPhase(
    "provider-user-lookup-request",
    {
      connectionId: context.connection.id,
      operation: "lookup",
      providerKey: context.connection.providerKey,
    },
    async () => {
      const raw = await zammadPostJsonRead(context, "/graphql", {
        query: mentionSuggestionsQuery,
        variables: {
          groupId: `gid://zammad/Group/${groupId}`,
          query,
        },
      });
      const parsed = responseSchema.safeParse(raw);
      if (
        !parsed.success ||
        parsed.data.errors?.length ||
        !parsed.data.data?.mentionSuggestions
      ) {
        throw providerMismatch();
      }
      const seen = new Set<string>();
      const normalizedQuery = searchableMentionText(query);
      return parsed.data.data.mentionSuggestions.flatMap((user) => {
        const externalId = String(user.internalId);
        const label = user.fullname?.trim() || user.email?.trim();
        const matchIndex = label
          ? searchableMentionText(label).indexOf(normalizedQuery)
          : -1;
        if (
          user.active === false ||
          !label ||
          matchIndex < 0 ||
          !/^\d+$/u.test(externalId) ||
          seen.has(externalId)
        ) {
          return [];
        }
        seen.add(externalId);
        return [{ externalId, label, matchIndex }];
      })
        .sort((left, right) =>
          left.matchIndex - right.matchIndex ||
          left.label.localeCompare(right.label),
        )
        .map(({ externalId, label }) => ({ externalId, label }));
    },
  );
}

export function zammadMentionHtml(
  context: ProviderContext,
  body: string,
  bodyFormat: "plain" | "html" = "plain",
): string {
  if (!body.includes("data-resolvrr-mention-id")) {
    return body;
  }
  if (bodyFormat !== "html") {
    throw new ProviderError(
      "validation-failure",
      "Mentions require an HTML article.",
      false,
      undefined,
      "invalid-mention",
    );
  }
  const origin = zammadBaseUrl(context);
  const transformed = body.replace(
    neutralMentionPattern,
    (_match, rawId: string, rawLabel: string) => {
      const id = numericId(rawId, "mention user");
      const label = sanitizeHtml(rawLabel, {
        allowedAttributes: {},
        allowedTags: [],
      }).trim();
      if (!label) {
        throw new ProviderError(
          "validation-failure",
          "A mentioned helpdesk user needs a display label.",
          false,
          undefined,
          "invalid-mention",
        );
      }
      return `<a href="${origin}/#user/profile/${id}" data-mention-user-id="${id}">${label}</a>`;
    },
  );
  if (transformed.includes("data-resolvrr-mention-id")) {
    throw new ProviderError(
      "validation-failure",
      "The mention markup is invalid.",
      false,
      undefined,
      "invalid-mention",
    );
  }
  return transformed;
}

export function rethrowZammadMentionWriteError(
  error: unknown,
  originalBody: string,
): never {
  if (
    originalBody.includes("data-resolvrr-mention-id") &&
    error instanceof ProviderError &&
    error.statusCode === 422
  ) {
    throw new ProviderError(
      "validation-failure",
      "A mentioned helpdesk user is no longer available for this ticket.",
      false,
      422,
      "invalid-mention",
    );
  }
  throw error;
}
