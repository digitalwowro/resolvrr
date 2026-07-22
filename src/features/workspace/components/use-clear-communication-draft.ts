"use client";

import {
  clearPersistedCommunicationDrafts,
} from "./ticket-communication-draft-persistence";
import type {
  CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";
import {
  useWorkspaceCommunicationDraftController,
} from "./workspace-communication-draft-context";
import type {
  ClearCommunicationDraftOptions,
} from "./workspace-communication-draft-controller";

export function useClearCommunicationDraft(
  ticketExternalId: string,
  scope: CommunicationDraftPersistenceScope | undefined,
) {
  const controller = useWorkspaceCommunicationDraftController();
  return (options?: ClearCommunicationDraftOptions) => {
    if (controller) {
      void controller.clear(ticketExternalId, options);
      return;
    }
    void clearPersistedCommunicationDrafts(scope);
  };
}
