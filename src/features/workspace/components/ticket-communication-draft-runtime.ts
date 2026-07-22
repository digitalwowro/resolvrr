"use client";

export type CommunicationDraftPersistenceScope = {
  ticketExternalId: string;
  userId: string;
  workspaceId: string;
  helpdeskConnectionId: string;
  identityVersion: string;
};

let storageQueue: Promise<void> = Promise.resolve();

export function communicationDraftScopeKey(
  scope: CommunicationDraftPersistenceScope,
): string {
  return JSON.stringify([
    scope.userId,
    scope.workspaceId,
    scope.helpdeskConnectionId,
    scope.identityVersion,
    scope.ticketExternalId,
  ]);
}

export function enqueueCommunicationDraftStorage<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
