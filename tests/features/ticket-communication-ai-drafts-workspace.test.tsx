import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RewriteDraftAction } from "@/features/ai";
import type { PersistedCommunicationDraft } from "@/features/workspace/components/ticket-communication-draft-persistence";
import {
  getCustomerArticle,
  renderWorkspace,
} from "./ticket-communication-workspace-test-utils";

const persistence = vi.hoisted(() => ({
  clearPersistedCommunicationDrafts: vi.fn(),
  loadPersistedCommunicationDrafts: vi.fn(),
  pruneExpiredCommunicationDrafts: vi.fn(),
  savePersistedCommunicationDraft: vi.fn(),
}));

vi.mock(
  "@/features/workspace/components/ticket-communication-draft-persistence",
  () => persistence,
);

const scope = {
  ticketExternalId: "ticket-1",
  userId: "user-1",
  workspaceId: "connection-1",
};

beforeEach(() => {
  for (const mocked of Object.values(persistence)) {
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  persistence.loadPersistedCommunicationDrafts.mockResolvedValue([]);
});

describe("TicketWorkspace communication AI drafts", () => {
  it("restores a persisted reply draft and clears it when the composer closes", async () => {
    const user = userEvent.setup();
    const persistedDraft = {
      articleId: "article-ticket-1",
      bodyHtml: "<p>Saved reply body</p>",
      expiresAt: Date.now() + 60_000,
      id: "v1:user-1:connection-1:ticket-1:reply",
      mode: "reply",
      scope,
      suggestions: [
        {
          generatedAt: "2026-06-14T10:00:00.000Z",
          id: "suggestion-1",
          label: "Rephrase: Concise",
          operation: "rephrase",
          rephraseStyleId: "style-concise",
          text: "Saved concise suggestion.",
        },
      ],
      updatedAt: Date.now(),
    } satisfies PersistedCommunicationDraft;
    persistence.loadPersistedCommunicationDrafts.mockResolvedValue([
      persistedDraft,
    ]);

    renderWorkspace({
      customerReplies: true,
      userId: "user-1",
      workspaceId: "connection-1",
    });

    await waitFor(() =>
      expect(persistence.loadPersistedCommunicationDrafts).toHaveBeenCalledWith(
        scope,
      ),
    );
    getCustomerArticle();
    expect(
      await screen.findByRole("textbox", { name: "Reply" }),
    ).toHaveTextContent("Saved reply body");
    expect(screen.getByText("Draft restored.")).toBeInTheDocument();
    expect(
      screen.getByText("Saved concise suggestion."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Close editor" }),
    );

    expect(persistence.clearPersistedCommunicationDrafts).toHaveBeenCalledWith(
      scope,
    );
  });

  it("generates, persists, and applies a proofread suggestion", async () => {
    const user = userEvent.setup();
    const rewriteDraftAction = vi.fn<RewriteDraftAction>(async (request) => {
      expect(request).toMatchObject({
        composerMode: "reply",
        operation: "proofread",
      });
      expect(request.bodyHtml).toContain("Please check logs");
      return {
        generatedAt: "2026-06-14T10:00:00.000Z",
        operation: "proofread",
        status: "available",
        text: "Please check the logs.",
      };
    });

    renderWorkspace({
      customerReplies: true,
      rewriteDraftAction,
      userId: "user-1",
      workspaceId: "connection-1",
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Please check logs");
    await user.click(screen.getByRole("button", { name: "Proofread" }));

    expect(
      await screen.findByText("Please check the logs."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(persistence.savePersistedCommunicationDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "customer-reply",
          scope,
          suggestions: [
            expect.objectContaining({
              label: "Proofread",
              operation: "proofread",
              text: "Please check the logs.",
            }),
          ],
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("textbox", { name: "Reply" }))
      .toHaveTextContent("Please check the logs.");
  });
});
