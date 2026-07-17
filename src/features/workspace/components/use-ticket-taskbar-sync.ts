"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  TaskbarSyncRequest,
  WorkspaceTaskbarSyncResult,
} from "@/features/taskbar-sync/model";
import { loadPersistedCommunicationDrafts } from "./ticket-communication-draft-persistence";
import { hasCurrentCommunicationDraft } from "./ticket-communication-draft-runtime";
import {
  cappedTaskbarProviderIds,
  sameTaskbarIds,
  type LocalTaskbarRequest,
  taskbarRequestKey,
  taskbarDraftCheckTicketIds,
  taskbarRequestRemainsPending,
  taskbarRequestTicketIds,
} from "./ticket-taskbar-sync-requests";
import { hydrateTaskbarTabs } from "./ticket-taskbar-hydration";
import {
  createTicketTaskbarRuntime,
  taskbarRuntimeFor,
  taskbarSyncScopeKey,
  type TicketTaskbarRuntime,
} from "./ticket-taskbar-runtime";
import type { TicketTaskbarSyncOptions } from "./ticket-taskbar-sync-types";
import { useTicketTaskbarPolling } from "./use-ticket-taskbar-polling";
export type { SynchronizeWorkspaceTaskbarAction } from "./ticket-taskbar-sync-types";

export function useTicketTaskbarSync(options: TicketTaskbarSyncOptions) {
  const [unsynchronizedIds, setUnsynchronizedIds] = useState<string[]>([]);
  const [draftConflictIds, setDraftConflictIds] = useState<string[]>([]);
  const [incompatible, setIncompatible] = useState(false);
  const [selectionUnsynchronized, setSelectionUnsynchronized] = useState(false);
  const optionsRef = useRef(options);
  const scopeKey = taskbarSyncScopeKey(options.scope);
  const scopeKeyRef = useRef(scopeKey);
  const runtimes = useRef(new Map<string, TicketTaskbarRuntime>([
    [scopeKey, createTicketTaskbarRuntime()],
  ]));

  useLayoutEffect(() => {
    optionsRef.current = options;
    if (scopeKeyRef.current === scopeKey) return;
    scopeKeyRef.current = scopeKey;
    taskbarRuntimeFor(runtimes.current, scopeKey);
    setUnsynchronizedIds([]);
    setDraftConflictIds([]);
    setIncompatible(false);
    setSelectionUnsynchronized(false);
  }, [options, scopeKey]);

  const applyResult = useCallback(async (
    result: WorkspaceTaskbarSyncResult,
    runtime: TicketTaskbarRuntime,
    attemptedRequest?: LocalTaskbarRequest,
  ) => {
    if (
      runtime !== taskbarRuntimeFor(runtimes.current, scopeKeyRef.current)
    ) return;
    const revision = runtime.explicitRevision;
    const localPending = [...runtime.transportPending.values()];
    const unstagedFailure = Boolean(
      attemptedRequest &&
      result.status === "unavailable" &&
      result.reason !== "taskbar-incompatible",
    );
    const nextUnsynchronizedIds = [
      ...new Set([
        ...result.unsynchronizedTicketExternalIds,
        ...(unstagedFailure && attemptedRequest
          ? taskbarRequestTicketIds(attemptedRequest)
          : []),
      ]),
    ];
    setUnsynchronizedIds((current) =>
      sameTaskbarIds(current, nextUnsynchronizedIds)
        ? current
        : nextUnsynchronizedIds,
    );
    setIncompatible(result.status === "unavailable" && result.reason === "taskbar-incompatible");
    setSelectionUnsynchronized(
      result.activeNotSynchronized ||
      Boolean(
        unstagedFailure &&
        attemptedRequest &&
        (attemptedRequest.kind === "activate" ||
          attemptedRequest.kind === "deactivate"),
      ),
    );
    if (result.status !== "available") return;

    const current = optionsRef.current;
    const nextCorrectedSourceIds = new Set(runtime.correctedMergedSourceIds);
    const nextMergedReplacements = new Map(runtime.mergedReplacements);
    const currentProviderIds = new Set(result.ticketExternalIds);
    for (const sourceId of nextCorrectedSourceIds) {
      if (!currentProviderIds.has(sourceId)) {
        nextCorrectedSourceIds.delete(sourceId);
      }
    }
    const pendingClose = new Set([
      ...result.pendingCloseTicketExternalIds,
      ...localPending.flatMap((request) =>
        request.kind === "close" ? [request.ticketExternalId] : [],
      ),
    ]);
    const providerIds = cappedTaskbarProviderIds(
      result.ticketExternalIds.filter((id) => !pendingClose.has(id)),
      result.activeTicketExternalId,
    );
    const providerIdSet = new Set(providerIds);
    const orderNotSynchronized = result.orderNotSynchronized ||
      localPending.some((request) => request.kind === "reorder");
    const remoteIds = orderNotSynchronized
      ? [
          ...current.openTicketTabs.map((tab) => tab.id).filter((id) => providerIdSet.has(id)),
          ...providerIds.filter((id) => !current.openTicketTabs.some((tab) => tab.id === id)),
        ]
      : providerIds;
    const knownTabs = new Map(
      [...current.openTicketTabs, ...current.ticketTabs].map((tab) => [tab.id, tab]),
    );
    const hydrated = await hydrateTaskbarTabs({
      activeProviderTicketId: result.activeTicketExternalId,
      correctedSourceIds: nextCorrectedSourceIds,
      knownTabs,
      loadTicketDetailAction: current.loadTicketDetailAction,
      providerTicketIds: remoteIds,
      replacements: nextMergedReplacements,
    });
    if (
      revision !== runtime.explicitRevision ||
      runtime !== taskbarRuntimeFor(runtimes.current, scopeKeyRef.current)
    ) return;

    const remoteIdSet = new Set(hydrated.tabs.map((tab) => tab.id));
    const pendingOpen = new Set([
      ...result.pendingOpenTicketExternalIds,
      ...(result.pendingActiveTicketExternalId
        ? [result.pendingActiveTicketExternalId]
        : []),
      ...localPending.flatMap((request) =>
        request.kind === "open" || request.kind === "activate"
          ? [request.ticketExternalId]
          : [],
      ),
    ]);
    const mergedSourceIds = new Set(nextMergedReplacements.keys());
    const absentLocalIds = taskbarDraftCheckTicketIds(
      current.openTicketTabs.map((tab) => tab.id),
      remoteIdSet,
      pendingOpen,
      mergedSourceIds,
    );
    const conflictChecks = await Promise.all(absentLocalIds.map(async (ticketId) => {
      if (!current.scope) return null;
      const draftScope = {
        ...current.scope,
        ticketExternalId: ticketId,
      };
      if (hasCurrentCommunicationDraft(draftScope)) return ticketId;
      const drafts = await loadPersistedCommunicationDrafts(draftScope);
      return drafts.length > 0 ? ticketId : null;
    }));
    if (
      revision !== runtime.explicitRevision ||
      runtime !== taskbarRuntimeFor(runtimes.current, scopeKeyRef.current)
    ) return;
    const conflicts = conflictChecks.filter((id): id is string => Boolean(id));
    setDraftConflictIds((currentIds) =>
      sameTaskbarIds(currentIds, conflicts) ? currentIds : conflicts,
    );
    const localSelectionPending = !result.activeSelectionReliable ||
      result.activeNotSynchronized ||
      localPending.some((request) =>
        request.kind === "activate" || request.kind === "deactivate"
      );
    const synchronizedActiveTicketId = !localSelectionPending &&
        hydrated.activeTicketId &&
        !pendingClose.has(result.activeTicketExternalId ?? "")
      ? hydrated.activeTicketId
      : undefined;
    runtime.correctedMergedSourceIds = nextCorrectedSourceIds;
    runtime.mergedReplacements = nextMergedReplacements;
    current.reconcileOpenTicketTabs(
      hydrated.tabs,
      [...pendingOpen, ...conflicts],
      synchronizedActiveTicketId,
    );
    return hydrated.corrections;
  }, []);

  const synchronize = useCallback((request: TaskbarSyncRequest) => {
    const { action, scope } = optionsRef.current;
    if (!action || !scope) return Promise.resolve();
    const runtime = taskbarRuntimeFor(runtimes.current, scopeKeyRef.current);
    if (request.kind === "reconcile" && runtime.reconcileQueued) {
      return runtime.queue;
    }
    if (request.kind === "reconcile") runtime.reconcileQueued = true;
    if (request.kind !== "reconcile") {
      runtime.explicitRevision += 1;
      runtime.transportPending.set(taskbarRequestKey(request), request);
    }
    const operation = runtime.queue.then(async () => {
      const attempts: TaskbarSyncRequest[] = request.kind === "reconcile"
        ? [...runtime.transportPending.values(), request]
        : [request];
      for (let index = 0; index < attempts.length; index += 1) {
        const attempt = attempts[index];
        if (!attempt) continue;
        if (
          attempt.kind !== "reconcile" &&
          runtime.transportPending.get(taskbarRequestKey(attempt)) !== attempt
        ) {
          continue;
        }
        const result = await action(
          attempt,
          scope.helpdeskConnectionId,
          scope.identityVersion,
        );
        if (attempt.kind !== "reconcile") {
          const key = taskbarRequestKey(attempt);
          if (runtime.transportPending.get(key) !== attempt) {
            continue;
          }
          if (
            !taskbarRequestRemainsPending(attempt, result)
          ) {
            runtime.transportPending.delete(key);
          }
        }
        if (
          runtime !== taskbarRuntimeFor(runtimes.current, scopeKeyRef.current)
        ) continue;
        const corrections = await applyResult(
          result,
          runtime,
          attempt.kind === "reconcile" ? undefined : attempt,
        );
        for (const correction of corrections ?? []) {
          const key = taskbarRequestKey(correction);
          if (runtime.transportPending.has(key)) continue;
          runtime.transportPending.set(key, correction);
          attempts.push(correction);
        }
      }
    }).catch(() => {
      if (
        runtime !== taskbarRuntimeFor(runtimes.current, scopeKeyRef.current)
      ) return;
      const pending = [...runtime.transportPending.values()];
      setUnsynchronizedIds([
        ...new Set(pending.flatMap(taskbarRequestTicketIds)),
      ]);
      if (pending.some((request) =>
        request.kind === "activate" || request.kind === "deactivate"
      )) {
        setSelectionUnsynchronized(true);
      }
    }).finally(() => {
      if (request.kind === "reconcile") runtime.reconcileQueued = false;
    });
    runtime.queue = operation;
    return operation;
  }, [applyResult]);

  useTicketTaskbarPolling(
    Boolean(options.action && options.scope),
    scopeKey,
    synchronize,
  );

  function dismissDraftConflict(ticketId: string) {
    setDraftConflictIds((current) => current.filter((id) => id !== ticketId));
  }

  return {
    activate: (ticketExternalId: string) => synchronize({ kind: "activate", ticketExternalId }),
    close: (ticketExternalId: string) => synchronize({ kind: "close", ticketExternalId }),
    dismissDraftConflict,
    draftConflictIds,
    deactivate: () => synchronize({ kind: "deactivate" }),
    incompatible,
    open: (ticketExternalId: string) => synchronize({ kind: "open", ticketExternalId }),
    reorder: (ticketExternalIds: string[]) => synchronize({ kind: "reorder", ticketExternalIds }),
    selectionUnsynchronized,
    unsynchronizedIds,
  };
}
