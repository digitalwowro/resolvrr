"use client";

export type CommunicationDraftPersistenceScope = {
  ticketExternalId: string;
  userId: string;
  workspaceId: string;
  helpdeskConnectionId: string;
  identityVersion: string;
};

const presentDraftScopes = new Set<string>();
let storageQueue: Promise<void> = Promise.resolve();

function scopeKey(scope: CommunicationDraftPersistenceScope): string {
  return JSON.stringify([
    scope.userId,
    scope.workspaceId,
    scope.helpdeskConnectionId,
    scope.identityVersion,
    scope.ticketExternalId,
  ]);
}

export function hasCurrentCommunicationDraft(
  scope: CommunicationDraftPersistenceScope | undefined,
): boolean {
  return Boolean(scope && presentDraftScopes.has(scopeKey(scope)));
}

export function setCurrentCommunicationDraftPresence(
  scope: CommunicationDraftPersistenceScope | undefined,
  present: boolean,
): void {
  if (!scope) return;
  const key = scopeKey(scope);
  if (present) {
    presentDraftScopes.add(key);
  } else {
    presentDraftScopes.delete(key);
  }
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
