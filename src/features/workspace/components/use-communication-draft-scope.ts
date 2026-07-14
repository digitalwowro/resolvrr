"use client";

import { useMemo } from "react";
import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";

export function useCommunicationDraftScope(
  ticketExternalId: string,
  userId?: string,
  workspaceId?: string,
): CommunicationDraftPersistenceScope | undefined {
  return useMemo(
    () => userId && workspaceId
      ? { ticketExternalId, userId, workspaceId }
      : undefined,
    [ticketExternalId, userId, workspaceId],
  );
}
