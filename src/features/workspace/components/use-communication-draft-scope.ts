"use client";

import { useMemo } from "react";
import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";

export function useCommunicationDraftScope(
  ticketExternalId: string,
  userId?: string,
  workspaceId?: string,
  helpdeskConnectionId?: string,
  identityVersion?: string,
): CommunicationDraftPersistenceScope | undefined {
  return useMemo(
    () => userId && workspaceId && helpdeskConnectionId && identityVersion
      ? { ticketExternalId, userId, workspaceId, helpdeskConnectionId, identityVersion }
      : undefined,
    [helpdeskConnectionId, identityVersion, ticketExternalId, userId, workspaceId],
  );
}
