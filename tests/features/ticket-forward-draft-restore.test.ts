import { describe, expect, it } from "vitest";
import type { WorkspaceArticle } from "@/features/tickets";
import { restoredCommunicationDraft } from "@/features/workspace/components/ticket-communication-draft-restore";
import type { PersistedCommunicationDraft } from "@/features/workspace/components/ticket-communication-draft-persistence";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

function article(): WorkspaceArticle {
  return {
    ...selectedDetailProps().detail.articles[0]!,
    attachments: [{ id: "91", fileName: "report.pdf" }],
    forwardContext: {
      channel: "email", contextVersion: "fresh-v2",
      sourceArticleExternalId: "article-ticket-1", subject: "Source subject",
    },
  };
}

function record(overrides: Partial<PersistedCommunicationDraft> = {}): PersistedCommunicationDraft {
  return {
    attachmentExternalIds: ["91", "deleted"], bodyHtml: "<p>Intro</p>",
    cc: [], contextVersion: "fresh-v2", expiresAt: Date.now() + 1_000,
    id: "draft", includeOriginal: true, kind: "customer-forward",
    scope: {
      ticketExternalId: "ticket-1", userId: "user-1", workspaceId: "workspace-1",
      helpdeskConnectionId: "connection-1", identityVersion: "identity-v1",
    },
    sourceArticleExternalId: "article-ticket-1", subject: "Reviewed subject",
    suggestions: [], to: ["customer@example.com"], updatedAt: Date.now(),
    ...overrides,
  };
}

describe("customer forward draft restoration", () => {
  it("restores only after fresh context validation and drops unavailable attachment ids", () => {
    expect(restoredCommunicationDraft(
      record(), [article()],
      { customerForwards: true, customerReplies: true, internalNotes: true },
    )).toMatchObject({
      attachmentExternalIds: ["91"], contextVersion: "fresh-v2",
      kind: "customer-forward", subject: "Reviewed subject",
      to: ["customer@example.com"],
    });
  });

  it("fails closed for stale forward context or unavailable capability", () => {
    expect(restoredCommunicationDraft(
      record({ contextVersion: "stale" }), [article()],
      { customerForwards: true, customerReplies: true, internalNotes: true },
    )).toBeUndefined();
    expect(restoredCommunicationDraft(
      record(), [article()],
      { customerForwards: false, customerReplies: true, internalNotes: true },
    )).toBeUndefined();
  });
});
