"use client";

import {
  clearPersistedCommunicationDrafts,
  persistedCommunicationDraftFromInput,
  putPersistedCommunicationDraft,
  readPersistedCommunicationDraft,
  type PersistedCommunicationDraft,
  type SavePersistedCommunicationDraftInput,
} from "./ticket-communication-draft-persistence";
import type {
  CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";

export type WorkspaceCommunicationDraftEntry = {
  loaded: boolean;
  message?: string;
  record?: PersistedCommunicationDraft;
  status: "local-only" | "local-storage-unavailable";
};

export type ClearCommunicationDraftOptions = {
  restoreOnFailure?: boolean;
};

type BaseScope = Omit<
  CommunicationDraftPersistenceScope,
  "ticketExternalId"
>;

const emptyEntry: WorkspaceCommunicationDraftEntry = {
  loaded: false,
  status: "local-only",
};
const saveDelayMs = 600;
const saveMaxWaitMs = 2_000;

type PendingSave = {
  delayTimer: ReturnType<typeof setTimeout>;
  maxTimer: ReturnType<typeof setTimeout>;
};

export class WorkspaceCommunicationDraftController {
  private readonly entries = new Map<string, WorkspaceCommunicationDraftEntry>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly loads = new Map<string, Promise<void>>();
  private readonly loadEpochs = new Map<string, number>();
  private readonly pendingSaves = new Map<string, PendingSave>();

  constructor(private readonly baseScope: BaseScope) {}

  scope(ticketExternalId: string): CommunicationDraftPersistenceScope {
    return { ...this.baseScope, ticketExternalId };
  }

  snapshot = (ticketExternalId: string) =>
    this.entries.get(ticketExternalId) ?? emptyEntry;

  subscribe = (ticketExternalId: string, listener: () => void) => {
    const listeners = this.listeners.get(ticketExternalId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(ticketExternalId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(ticketExternalId);
    };
  };

  private publish(
    ticketExternalId: string,
    entry: WorkspaceCommunicationDraftEntry,
  ) {
    this.entries.set(ticketExternalId, entry);
    for (const listener of this.listeners.get(ticketExternalId) ?? []) {
      listener();
    }
  }

  load(ticketExternalId: string): Promise<void> {
    const existing = this.loads.get(ticketExternalId);
    if (existing) return existing;
    const operation = this.loadOnce(ticketExternalId).finally(() => {
      this.loads.delete(ticketExternalId);
    });
    this.loads.set(ticketExternalId, operation);
    return operation;
  }

  private async loadOnce(ticketExternalId: string) {
    const loadEpoch = this.loadEpochs.get(ticketExternalId) ?? 0;
    const local = await readPersistedCommunicationDraft(
      this.scope(ticketExternalId),
    );
    if ((this.loadEpochs.get(ticketExternalId) ?? 0) !== loadEpoch) return;
    const current = this.snapshot(ticketExternalId);
    if (local.status === "available") {
      if (local.value?.pendingClear) {
        await this.clear(ticketExternalId);
        return;
      }
      this.publish(ticketExternalId, {
        ...current,
        loaded: true,
        record: current.record ?? local.value,
        status: "local-only",
      });
      return;
    }
    this.publish(ticketExternalId, {
      ...current,
      loaded: true,
      message: "This draft could not be saved in this browser.",
      status: "local-storage-unavailable",
    });
  }

  async ensureHasDraft(ticketExternalId: string): Promise<boolean> {
    await this.load(ticketExternalId);
    return Boolean(this.snapshot(ticketExternalId).record);
  }

  hasDraft(ticketExternalId: string): boolean {
    return Boolean(this.snapshot(ticketExternalId).record);
  }

  save(input: SavePersistedCommunicationDraftInput) {
    const ticketExternalId = input.scope?.ticketExternalId;
    if (!ticketExternalId) return;
    const current = this.snapshot(ticketExternalId);
    const record = persistedCommunicationDraftFromInput({
      ...input,
      localRevision: (current.record?.localRevision ?? 0) + 1,
    });
    if (!record) {
      void this.clear(ticketExternalId);
      return;
    }
    if (!current.loaded || !current.record) {
      this.publish(ticketExternalId, {
        ...current,
        loaded: true,
        record,
      });
    } else {
      current.record = record;
    }
    this.scheduleSave(ticketExternalId);
  }

  private scheduleSave(ticketExternalId: string) {
    const pending = this.pendingSaves.get(ticketExternalId);
    if (pending) clearTimeout(pending.delayTimer);
    const delayTimer = setTimeout(() => {
      void this.flush(ticketExternalId);
    }, saveDelayMs);
    const maxTimer = pending?.maxTimer ?? setTimeout(() => {
      void this.flush(ticketExternalId);
    }, saveMaxWaitMs);
    this.pendingSaves.set(ticketExternalId, { delayTimer, maxTimer });
  }

  async flush(ticketExternalId: string): Promise<boolean> {
    this.cancelScheduledSave(ticketExternalId);
    const record = this.snapshot(ticketExternalId).record;
    if (!record) return true;
    const result = await putPersistedCommunicationDraft(record);
    const latest = this.snapshot(ticketExternalId);
    if (latest.record?.localRevision !== record.localRevision) return true;
    if (result.status === "available") {
      if (latest.status === "local-storage-unavailable") {
        this.publish(ticketExternalId, {
          ...latest,
          message: undefined,
          status: "local-only",
        });
      }
      return true;
    }
    this.publish(ticketExternalId, {
      ...latest,
      message: "This draft could not be saved in this browser.",
      status: "local-storage-unavailable",
    });
    return false;
  }

  async flushAll(): Promise<void> {
    await Promise.all(
      [...this.pendingSaves.keys()].map((ticketExternalId) =>
        this.flush(ticketExternalId)
      ),
    );
  }

  private cancelScheduledSave(ticketExternalId: string) {
    const pending = this.pendingSaves.get(ticketExternalId);
    if (!pending) return;
    clearTimeout(pending.delayTimer);
    clearTimeout(pending.maxTimer);
    this.pendingSaves.delete(ticketExternalId);
  }

  async clear(
    ticketExternalId: string,
    options: ClearCommunicationDraftOptions = {},
  ): Promise<boolean> {
    const current = this.snapshot(ticketExternalId);
    this.loadEpochs.set(
      ticketExternalId,
      (this.loadEpochs.get(ticketExternalId) ?? 0) + 1,
    );
    this.cancelScheduledSave(ticketExternalId);
    this.publish(ticketExternalId, {
      loaded: true,
      status: "local-only",
    });
    const result = await clearPersistedCommunicationDrafts(
      this.scope(ticketExternalId),
    );
    if (result.status === "available") {
      return true;
    }
    if (options.restoreOnFailure === false) return false;
    if (this.snapshot(ticketExternalId).record) return false;
    this.publish(ticketExternalId, {
      ...current,
      message: "This draft could not be discarded in this browser.",
      status: "local-storage-unavailable",
    });
    return false;
  }

  retainLocally(ticketExternalId: string) {
    const current = this.snapshot(ticketExternalId);
    if (!current.record) return;
    this.publish(ticketExternalId, {
      ...current,
      message: "This draft remains saved locally in this browser.",
      status: "local-only",
    });
  }
}
