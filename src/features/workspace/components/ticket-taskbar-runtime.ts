import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";
import type { LocalTaskbarRequest } from "./ticket-taskbar-sync-requests";

export type TicketTaskbarRuntime = {
  correctedMergedSourceIds: Set<string>;
  explicitRevision: number;
  locallyClosedIds: Set<string>;
  mergedReplacements: Map<string, string>;
  queue: Promise<void>;
  recentlyClosedUntil: Map<string, number>;
  reconcileQueued: boolean;
  transportPending: Map<string, LocalTaskbarRequest>;
};

export const TASKBAR_CLOSE_ECHO_WINDOW_MS = 10_000;

export function recentlyClosedTaskbarIds(
  runtime: TicketTaskbarRuntime,
  now = Date.now(),
) {
  const ids: string[] = [];
  for (const [ticketId, expiresAt] of runtime.recentlyClosedUntil) {
    if (expiresAt <= now) {
      runtime.recentlyClosedUntil.delete(ticketId);
      continue;
    }
    ids.push(ticketId);
  }
  return ids;
}

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
    locallyClosedIds: new Set(),
    mergedReplacements: new Map(),
    queue: Promise.resolve(),
    recentlyClosedUntil: new Map(),
    reconcileQueued: false,
    transportPending: new Map(),
  };
}
