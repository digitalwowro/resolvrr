import { describe, expect, it } from "vitest";
import {
  communicationDraftScopeKey,
  enqueueCommunicationDraftStorage,
  type CommunicationDraftPersistenceScope,
} from "@/features/workspace/components/ticket-communication-draft-runtime";

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
  it("keys drafts by the complete personal identity scope", () => {
    expect(communicationDraftScopeKey(scope("1")))
      .not.toBe(communicationDraftScopeKey(scope("2")));
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
});
