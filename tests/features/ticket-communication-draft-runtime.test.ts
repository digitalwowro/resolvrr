import { describe, expect, it } from "vitest";
import {
  enqueueCommunicationDraftStorage,
  hasCurrentCommunicationDraft,
  setCurrentCommunicationDraftPresence,
  type CommunicationDraftPersistenceScope,
} from "@/features/workspace/components/ticket-communication-draft-runtime";
import {
  clearPersistedCommunicationDrafts,
  savePersistedCommunicationDraft,
} from "@/features/workspace/components/ticket-communication-draft-persistence";

const scope = (
  ticketExternalId: string,
): CommunicationDraftPersistenceScope => ({
  userId: "user-runtime",
  workspaceId: "workspace-runtime",
  helpdeskConnectionId: "connection-runtime",
  identityVersion: "identity-runtime",
  ticketExternalId,
});

describe("communication draft runtime", () => {
  it("tracks draft presence synchronously and by exact ticket scope", () => {
    const first = scope("1");
    const second = scope("2");

    setCurrentCommunicationDraftPresence(first, true);

    expect(hasCurrentCommunicationDraft(first)).toBe(true);
    expect(hasCurrentCommunicationDraft(second)).toBe(false);

    setCurrentCommunicationDraftPresence(first, false);
    expect(hasCurrentCommunicationDraft(first)).toBe(false);
  });

  it("serializes storage work in invocation order", async () => {
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const first = enqueueCommunicationDraftStorage(async () => {
      events.push("first-start");
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      events.push("first-end");
    });
    const second = enqueueCommunicationDraftStorage(async () => {
      events.push("second");
    });

    await Promise.resolve();
    expect(events).toEqual(["first-start"]);

    releaseFirst?.();
    await Promise.all([first, second]);
    expect(events).toEqual(["first-start", "first-end", "second"]);
  });

  it("publishes save and discard presence before IndexedDB settles", async () => {
    const draftScope = scope("persistence");
    const save = savePersistedCommunicationDraft({
      bodyHtml: "<p>Unsaved reply</p>",
      kind: "customer-reply",
      scope: draftScope,
      suggestions: [],
    });

    expect(hasCurrentCommunicationDraft(draftScope)).toBe(true);
    await save;

    const clear = clearPersistedCommunicationDrafts(draftScope);
    expect(hasCurrentCommunicationDraft(draftScope)).toBe(false);
    await clear;
  });
});
