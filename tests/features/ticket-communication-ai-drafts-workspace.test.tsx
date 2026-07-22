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
  putPersistedCommunicationDraft: vi.fn(),
  readPersistedCommunicationDraft: vi.fn(),
  savePersistedCommunicationDraft: vi.fn(),
}));

vi.mock(
  "@/features/workspace/components/ticket-communication-draft-persistence",
  async (importOriginal) => ({
    ...await importOriginal(),
    ...persistence,
  }),
);

const scope = {
  ticketExternalId: "ticket-1",
  userId: "user-1",
  workspaceId: "connection-1",
  helpdeskConnectionId: "personal-connection-1",
  identityVersion: "identity-v1",
};

beforeEach(() => {
  for (const mocked of Object.values(persistence)) {
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  persistence.loadPersistedCommunicationDrafts.mockResolvedValue([]);
  persistence.readPersistedCommunicationDraft.mockResolvedValue({
    status: "available",
    value: undefined,
  });
  persistence.putPersistedCommunicationDraft.mockResolvedValue({
    status: "available",
    value: undefined,
  });
  persistence.clearPersistedCommunicationDrafts.mockResolvedValue({
    status: "available",
    value: undefined,
  });
});

describe("TicketWorkspace communication AI drafts", () => {
  it("restores a persisted reply draft and clears it when the composer closes", async () => {
    const user = userEvent.setup();
    const persistedDraft = {
      articleId: "article-ticket-1",
      bodyHtml: "<p>Saved reply body</p>",
      expiresAt: Date.now() + 60_000,
      id: "v1:user-1:connection-1:ticket-1:reply",
      localRevision: 1,
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
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: persistedDraft,
    });

    renderWorkspace({
      customerReplies: true,
      userId: "user-1",
      workspaceId: "connection-1",
    });

    await waitFor(() =>
      expect(persistence.readPersistedCommunicationDraft).toHaveBeenCalledWith(
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
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("textbox", { name: "Reply" }))
      .toHaveTextContent("Saved concise suggestion.");

    await user.click(
      screen.getByRole("button", { name: "Close composer" }),
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
      expect(request.target).toMatchObject({
        kind: "draft",
      });
      if (request.target.kind === "draft") {
        expect(request.target.bodyHtml).toContain("Please check logs");
      }
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
      expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledWith(
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

  it("lists rephrase styles from the right-side AI tools and runs the selected style", async () => {
    const user = userEvent.setup();
    const rewriteDraftAction = vi.fn<RewriteDraftAction>(async (request) => ({
      generatedAt: "2026-07-17T18:00:00.000Z",
      operation: "rephrase",
      rephraseStyle: {
        id: request.rephraseStyleId ?? "",
        label: request.rephraseStyleId === "style-friendly"
          ? "Friendly"
          : "Professional",
      },
      status: "available",
      text: "Rephrased draft.",
    }));

    renderWorkspace({
      customerReplies: true,
      rephraseStyleOptions: [
        { id: "style-professional", label: "Professional" },
        { id: "style-friendly", label: "Friendly" },
      ],
      rewriteDraftAction,
    });

    await user.click(
      within(getCustomerArticle()).getByRole("button", { name: "Reply" }),
    );
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Draft");

    const rephrase = screen.getByRole("button", { name: "Rephrase" });
    const aiTools = rephrase.closest("div.ml-auto");
    expect(aiTools).toHaveClass("ml-auto", "justify-end");
    expect(rephrase).toHaveClass(
      "!text-sm",
      "!justify-start",
      "!border-transparent",
      "!bg-transparent",
      "hover:!bg-slate-100",
    );
    expect(rephrase).toContainHTML("lucide-repeat-2");
    expect(rephrase.parentElement).toHaveClass("w-max", "max-w-sm");
    expect(screen.getByRole("button", { name: "Proofread" }))
      .toHaveClass("!text-sm");

    const aiReply = screen.getByRole("button", { name: "AI Reply" });
    expect(aiReply).toHaveAttribute("aria-disabled", "true");
    expect(aiReply).toHaveClass("!text-sm");
    expect(aiReply).toContainHTML("lucide-bot-message-square");
    await user.click(aiReply);
    expect(rewriteDraftAction).not.toHaveBeenCalled();

    await user.click(rephrase);
    const menu = screen.getByRole("menu");
    expect(menu).toHaveClass("w-full", "max-w-sm");
    expect(menu).not.toHaveClass("min-w-44", "w-max", "min-w-full");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Professional",
      "Friendly",
    ]);
    for (const item of items) {
      expect(item).not.toContainHTML("lucide-check");
    }
    await user.click(screen.getByRole("menuitem", { name: "Friendly" }));

    await waitFor(() =>
      expect(rewriteDraftAction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "rephrase",
          rephraseStyleId: "style-friendly",
        }),
      ),
    );
    expect(await screen.findByText("Rephrased draft.")).toBeInTheDocument();
  });

  it("does not blame credentials when the provider rejects one request", async () => {
    const user = userEvent.setup();
    const rewriteDraftAction = vi.fn<RewriteDraftAction>(async () => ({
      reason: "provider-request-rejected",
      retryable: false,
      status: "unavailable",
    }));

    renderWorkspace({
      customerReplies: true,
      rewriteDraftAction,
      userId: "user-1",
      workspaceId: "connection-1",
    });

    await user.click(
      within(getCustomerArticle()).getByRole("button", { name: "Reply" }),
    );
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Draft");
    await user.click(screen.getByRole("button", { name: "Proofread" }));

    expect(
      await screen.findByText(
        "The AI provider rejected this request. Try again or check provider permissions.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("The AI provider credentials need attention."),
    ).not.toBeInTheDocument();
  });
});
