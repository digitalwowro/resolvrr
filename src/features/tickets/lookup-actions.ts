"use server";

import {
  unavailableTicketLookupList,
  type TicketAssignableUserLookupInput,
  type TicketLookupList,
} from "@/core/ticket-lookups";
import type { TicketMentionLookupInput } from "@/core/ticket-mentions";

export type LookupWorkspaceAssignableUsersAction = (
  input: TicketAssignableUserLookupInput,
) => Promise<TicketLookupList>;

export type LookupWorkspaceMentionableUsersAction = (
  input: TicketMentionLookupInput,
) => Promise<TicketLookupList>;

function normalizedExternalIds(value: unknown, limit: number): string[] | undefined {
  if (!Array.isArray(value) || value.length > limit) {
    return undefined;
  }
  const ids = value.map((item) =>
    typeof item === "string" ? item.trim() : "",
  );
  if (ids.some((id) => !id || id.length > 128 || /[\0\r\n]/u.test(id))) {
    return undefined;
  }
  return [...new Set(ids)];
}

export const lookupWorkspaceAssignableUsersAction:
  LookupWorkspaceAssignableUsersAction = async (input) => {
    const groupExternalIds = normalizedExternalIds(
      input?.groupExternalIds,
      20,
    );
    const externalIds = input?.externalIds === undefined
      ? undefined
      : normalizedExternalIds(input.externalIds, 100);
    if (!groupExternalIds || (input?.externalIds !== undefined && !externalIds)) {
      return unavailableTicketLookupList("invalid-input");
    }

    const [
      { requireCurrentUser },
      { env },
      { prismaHelpdeskConnectionsRepository },
      { providerRegistry },
      { loadActiveTicketProviderContext },
      { dispatchAssignableUsersRead },
    ] = await Promise.all([
      import("@/auth/current-user"),
      import("@/config/env"),
      import("@/data/helpdesk-connections-repository"),
      import("@/providers"),
      import("./connection-context"),
      import("./ticket-lookup-service"),
    ]);
    const user = await requireCurrentUser();
    const providerContext = await loadActiveTicketProviderContext(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
      "list",
    );
    if (providerContext.status === "unavailable") {
      return unavailableTicketLookupList(
        providerContext.reason === "provider-auth-failed"
          ? "provider-auth-failed"
          : providerContext.reason === "provider-permission-denied"
            ? "provider-permission-denied"
            : "provider-temporary-failure",
        providerContext.retryable,
      );
    }

    return dispatchAssignableUsersRead(providerContext.value, {
      groupExternalIds,
      ...(externalIds ? { externalIds } : {}),
    });
  };

export const lookupWorkspaceMentionableUsersAction:
  LookupWorkspaceMentionableUsersAction = async (input) => {
    const groupExternalId = typeof input?.groupExternalId === "string"
      ? input.groupExternalId.trim()
      : "";
    const query = typeof input?.query === "string" ? input.query.trim() : "";
    if (
      !groupExternalId ||
      groupExternalId.length > 128 ||
      !query ||
      query.length > 80 ||
      /[\0\r\n]/u.test(`${groupExternalId}${query}`)
    ) {
      return unavailableTicketLookupList("invalid-input");
    }

    const [
      { requireCurrentUser },
      { env },
      { prismaHelpdeskConnectionsRepository },
      { providerRegistry },
      { loadActiveTicketProviderContext },
      { dispatchMentionableUsersRead },
    ] = await Promise.all([
      import("@/auth/current-user"),
      import("@/config/env"),
      import("@/data/helpdesk-connections-repository"),
      import("@/providers"),
      import("./connection-context"),
      import("./ticket-lookup-service"),
    ]);
    const user = await requireCurrentUser();
    const providerContext = await loadActiveTicketProviderContext(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
      "lookup",
    );
    if (providerContext.status === "unavailable") {
      return unavailableTicketLookupList(
        providerContext.reason === "provider-auth-failed"
          ? "provider-auth-failed"
          : providerContext.reason === "provider-permission-denied"
            ? "provider-permission-denied"
            : "provider-temporary-failure",
        providerContext.retryable,
      );
    }
    return dispatchMentionableUsersRead(providerContext.value, {
      groupExternalId,
      query,
    });
  };
