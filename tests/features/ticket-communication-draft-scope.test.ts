import { describe, expect, it } from "vitest";
import { communicationDraftMatchesScope } from "@/features/workspace/components/ticket-communication-draft-persistence";

const scope = {
  helpdeskConnectionId: "connection-1",
  identityVersion: "identity-v2",
  ticketExternalId: "ticket-1",
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("communication draft identity scope", () => {
  it("restores only drafts from the same user, workspace, connection, and identity", () => {
    expect(communicationDraftMatchesScope(scope, scope)).toBe(true);
    expect(communicationDraftMatchesScope(
      { ...scope, identityVersion: "identity-v1" },
      scope,
    )).toBe(false);
    expect(communicationDraftMatchesScope(
      { ...scope, helpdeskConnectionId: "connection-2" },
      scope,
    )).toBe(false);
  });

  it("never restores legacy shared-credential draft scopes", () => {
    expect(communicationDraftMatchesScope({
      connectionId: "workspace-1",
      ticketExternalId: "ticket-1",
      userId: "user-1",
    }, scope)).toBe(false);
    expect(communicationDraftMatchesScope(undefined, scope)).toBe(false);
  });
});
