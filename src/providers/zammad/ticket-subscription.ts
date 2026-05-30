import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketSubscription } from "@/core/tickets";
import { safeLogMetadata } from "@/security/safe-log";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadGetJson } from "./client";
import { zammadUserSchema } from "./schemas";

const zammadMentionSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    mentionable_type: z.string().nullish(),
    mentionable_id: z.union([z.number(), z.string()]).nullish(),
    user_id: z.union([z.number(), z.string()]).nullish(),
  })
  .passthrough();

const zammadMentionsResponseSchema = z
  .object({ mentions: z.array(zammadMentionSchema) })
  .passthrough();

const unimplementedSubscription: TicketSubscription = {
  supported: false,
  following: false,
};

type ZammadSubscriptionDiagnosticEndpoint = "users-me" | "mentions";

type ZammadSubscriptionDiagnosticIssue =
  | "request-failed"
  | "missing-current-user-id"
  | "unexpected-users-me-shape"
  | "unexpected-mentions-shape";

function providerErrorKind(error: unknown): string | undefined {
  return error instanceof ProviderError ? error.kind : undefined;
}

function providerErrorRetryable(error: unknown): boolean | undefined {
  return error instanceof ProviderError ? error.retryable : undefined;
}

function providerErrorStatusCode(error: unknown): number | undefined {
  return error instanceof ProviderError ? error.statusCode : undefined;
}

function providerErrorDiagnosticCode(error: unknown): string | undefined {
  return error instanceof ProviderError ? error.diagnosticCode : undefined;
}

function statusClass(statusCode: number | undefined): string | undefined {
  if (statusCode === undefined) {
    return undefined;
  }
  return `${Math.floor(statusCode / 100)}xx`;
}

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}

function subscriptionReadError(
  endpoint: ZammadSubscriptionDiagnosticEndpoint,
  issue: ZammadSubscriptionDiagnosticIssue,
  error?: unknown,
): ProviderError {
  const diagnosticCode = [
    endpoint,
    issue,
    providerErrorKind(error),
    providerErrorDiagnosticCode(error),
  ]
    .filter(Boolean)
    .join(":");
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    providerErrorRetryable(error) ?? false,
    providerErrorStatusCode(error),
    diagnosticCode,
  );
}

function logSubscriptionUnavailable(
  context: ProviderContext,
  error: ProviderError,
) {
  const [endpoint, issue, upstreamProviderErrorKind, upstreamDiagnosticCode] = (
    error.diagnosticCode ?? "unknown:unknown"
  ).split(":", 4);
  console.warn(
    "Zammad subscription secondary read unavailable",
    safeLogMetadata({
      connectionId: context.connection.id,
      diagnosticCode: error.diagnosticCode,
      endpoint,
      issue,
      operation: "detail",
      providerErrorKind: error.kind,
      providerKey: context.connection.providerKey,
      retryable: error.retryable,
      statusClass: statusClass(error.statusCode),
      statusCode: error.statusCode,
      upstreamDiagnosticCode,
      upstreamProviderErrorKind,
    }),
  );
}

export async function readZammadTicketSubscription(
  context: ProviderContext,
  ticketId: string,
): Promise<TicketSubscription> {
  return measureTicketReadPhase(
    "provider-secondary-subscription-request",
    { ...timingMetadata(context), operation: "detail" },
    async () => {
      let rawCurrentUser: unknown;
      try {
        rawCurrentUser = await zammadGetJson(context, "/api/v1/users/me");
      } catch (error) {
        throw subscriptionReadError("users-me", "request-failed", error);
      }
      const currentUser = zammadUserSchema.safeParse(rawCurrentUser);
      if (!currentUser.success) {
        throw subscriptionReadError("users-me", "unexpected-users-me-shape");
      }
      if (currentUser.data.id === undefined) {
        throw subscriptionReadError("users-me", "missing-current-user-id");
      }
      const currentUserId = String(currentUser.data.id);
      let rawMentions: unknown;
      try {
        rawMentions = await zammadGetJson(context, "/api/v1/mentions");
      } catch (error) {
        throw subscriptionReadError("mentions", "request-failed", error);
      }
      const parsed = zammadMentionsResponseSchema.safeParse(rawMentions);
      if (!parsed.success) {
        throw subscriptionReadError("mentions", "unexpected-mentions-shape");
      }
      const mention = parsed.data.mentions.find(
        (candidate) =>
          candidate.mentionable_type === "Ticket" &&
          String(candidate.mentionable_id) === ticketId &&
          String(candidate.user_id) === currentUserId,
      );
      return {
        externalId: mention ? String(mention.id) : undefined,
        supported: true,
        following: Boolean(mention),
      };
    },
  );
}

export async function readOptionalZammadTicketSubscription(
  context: ProviderContext,
  ticketId: string,
): Promise<TicketSubscription> {
  try {
    return await readZammadTicketSubscription(context, ticketId);
  } catch (error) {
    if (error instanceof ProviderError) {
      logSubscriptionUnavailable(context, error);
    }
    return unimplementedSubscription;
  }
}
