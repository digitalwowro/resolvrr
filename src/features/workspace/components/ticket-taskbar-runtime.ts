import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";
import type { LocalTaskbarRequest } from "./ticket-taskbar-sync-requests";

export type TicketTaskbarRuntime = {
  correctedMergedSourceIds: Set<string>;
  explicitRevision: number;
  mergedReplacements: Map<string, string>;
  queue: Promise<void>;
  reconcileQueued: boolean;
  transportPending: Map<string, LocalTaskbarRequest>;
};

export function taskbarSyncScopeKey(
  scope?: Omit<CommunicationDraftPersistenceScope, "ticketExternalId">,
) {
  return scope
    ? JSON.stringify([
        scope.userId,
        scope.workspaceId,
        scope.helpdeskConnectionId,
        scope.identityVersion,
      ])
    : "unscoped";
}

export function taskbarRuntimeFor(
  runtimes: Map<string, TicketTaskbarRuntime>,
  scopeKey: string,
) {
  const existing = runtimes.get(scopeKey);
  if (existing) return existing;
  const runtime = createTicketTaskbarRuntime();
  runtimes.set(scopeKey, runtime);
  return runtime;
}

export function createTicketTaskbarRuntime(): TicketTaskbarRuntime {
  return {
    correctedMergedSourceIds: new Set(),
    explicitRevision: 0,
    mergedReplacements: new Map(),
    queue: Promise.resolve(),
    reconcileQueued: false,
    transportPending: new Map(),
  };
}
