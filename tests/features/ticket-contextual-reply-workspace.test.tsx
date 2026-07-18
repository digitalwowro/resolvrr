import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceArticle } from "@/features/tickets";
import {
  internalArticle,
  renderWorkspace,
} from "./ticket-communication-workspace-test-utils";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

function articles(): WorkspaceArticle[] {
  const latest = selectedDetailProps().detail.articles[0]!;
  if (!latest.replyContext) throw new Error("Expected latest reply context");
  return [
    {
      ...latest,
      replyContext: {
        ...latest.replyContext,
        conversationHistory: {
          contextVersion: "history-through-latest",
          messageCount: 2,
          scope: "through-source",
        },
      },
    },
    {
      ...latest,
      id: "article-older",
      meta: "May 23, 08:31",
      sanitizedHtml: "<p>Older message</p>",
      replyContext: {
        availableIntents: ["reply", "reply-all"],
        channel: "email",
        conversationHistory: {
          contextVersion: "history-through-older",
          messageCount: 1,
          scope: "through-source",
        },
        contextVersion: "context-older",
        defaults: {
          reply: {
            to: [{ channel: "to", email: "maya@example.com", name: "Maya" }],
            cc: [],
          },
          replyAll: {
            to: [{ channel: "to", email: "maya@example.com", name: "Maya" }],
            cc: [{ channel: "cc", email: "watcher@example.com", name: "Watcher" }],
          },
        },
        sourceArticleExternalId: "article-older",
      },
    },
  ];
}

describe("TicketWorkspace contextual replies", () => {
  it("separates articles with thin direction rails and explicit item boundaries", () => {
    const [latest, older] = articles();
    renderWorkspace({
      articles: [
        latest!,
        {
          ...older!,
          author: "Agent Smith",
          direction: "outbound",
        },
      ],
      customerReplies: true,
    });

    const inbound = screen.getByRole("article", {
      name: "Customer reply from Maya Patel",
    });
    const outbound = screen.getByRole("article", {
      name: "Agent reply from Agent Smith",
    });

    expect(inbound).toHaveClass("border-b", "border-slate-200");
    expect(outbound).toHaveClass("border-b", "border-slate-200");
    expect(inbound.querySelector("[data-article-rail]"))
      .toHaveClass("w-px", "bg-indigo-500");
    expect(outbound.querySelector("[data-article-rail]"))
      .toHaveClass("w-px", "bg-slate-500");
  });

  it("uses only the newest eligible source in the footer", () => {
    renderWorkspace({ articles: articles(), customerReplies: true });
    const footer = screen.getByRole("group", { name: "Ticket actions" });

    expect(within(footer).getByRole("button", { name: "Reply" })).toBeEnabled();
    expect(within(footer).getByRole("button", { name: "Reply all" })).toBeDisabled();
  });

  it("uses matching subtle icon controls for article Reply actions", () => {
    renderWorkspace({ articles: articles(), customerReplies: true });
    const article = screen.getAllByRole("article", {
      name: "Customer reply from Maya Patel",
    })[0]!;

    expect(within(article).getByRole("button", { name: "Reply" }))
      .toHaveClass("size-7", "border", "bg-white");
    expect(within(article).getByRole("button", { name: "Reply all" }))
      .toHaveClass("size-7", "border", "bg-white");
  });

  it("lets an older Reply all override the source without nesting the composer", async () => {
    const user = userEvent.setup();
    renderWorkspace({ articles: articles(), customerReplies: true });
    const renderedArticles = screen.getAllByRole("article", {
      name: "Customer reply from Maya Patel",
    });
    const older = renderedArticles[1]!;

    await user.click(within(older).getByRole("button", { name: "Reply all" }));

    const composer = screen.getByRole("form", { name: "Reply composer" });
    expect(composer.compareDocumentPosition(renderedArticles[0]!) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(screen.getByText(/Replying to Maya Patel/u)).toBeInTheDocument();
    expect(screen.getByText("watcher@example.com")).toBeInTheDocument();
  });

  it("includes a collapsed, read-only public conversation transcript by default", async () => {
    const user = userEvent.setup();
    const update = vi.fn().mockResolvedValue({ status: "saved" });
    renderWorkspace({
      articles: [...articles(), internalArticle()],
      customerReplies: true,
      updateTicketMetadataAction: update,
    });
    await user.click(
      within(screen.getAllByRole("article")[0]!)
        .getByRole("button", { name: "Reply" }),
    );
    const composer = screen.getByRole("form", { name: "Reply composer" });
    const include = within(composer).getByRole("checkbox", {
      name: "Include conversation history",
    });

    expect(include).toBeChecked();
    expect(within(composer).getByText("2 public messages · Read-only"))
      .toBeInTheDocument();
    expect(within(composer).getByText("Older message")).not.toBeVisible();

    await user.click(
      within(composer).getByText("Preview conversation history"),
    );
    expect(within(composer).getByText("Older message")).toBeVisible();
    expect(within(composer).queryByText("Private investigation note."))
      .not.toBeInTheDocument();

    await user.click(include);
    await user.type(
      within(composer).getByRole("textbox", { name: "Reply" }),
      "Send without history",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      communication: expect.objectContaining({
        includeConversationHistory: false,
      }),
    }));
  });

  it("bounds an older article reply but lets the sticky footer use current history", async () => {
    const user = userEvent.setup();
    const update = vi.fn().mockResolvedValue({ status: "saved" });
    renderWorkspace({
      articles: articles(),
      conversationHistory: {
        contextVersion: "history-current",
        messageCount: 2,
        scope: "current",
      },
      customerReplies: true,
      updateTicketMetadataAction: update,
    });
    const renderedArticles = screen.getAllByRole("article", {
      name: "Customer reply from Maya Patel",
    });
    await user.click(
      within(renderedArticles[1]!).getByRole("button", { name: "Reply" }),
    );
    let composer = screen.getByRole("form", { name: "Reply composer" });
    expect(within(composer).getByText("1 public message · Read-only"))
      .toBeInTheDocument();
    await user.click(within(composer).getByText("Preview conversation history"));
    expect(within(composer).getByText("Older message")).toBeVisible();
    expect(within(composer).queryByText("Hello there")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close composer" }));
    const footer = screen.getByRole("group", { name: "Ticket actions" });
    await user.click(within(footer).getByRole("button", { name: "Reply" }));
    composer = screen.getByRole("form", { name: "Reply composer" });
    expect(within(composer).getByText("2 public messages · Read-only"))
      .toBeInTheDocument();
    await user.type(
      within(composer).getByRole("textbox", { name: "Reply" }),
      "Current reply",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      communication: expect.objectContaining({
        conversationHistoryContextVersion: "history-current",
        conversationHistoryScope: "current",
      }),
    }));
  });

  it("confirms before replacing a dirty source and preserves the draft on cancel", async () => {
    const user = userEvent.setup();
    renderWorkspace({ articles: articles(), customerReplies: true });
    const [latest, older] = screen.getAllByRole("article", {
      name: "Customer reply from Maya Patel",
    });
    await user.click(within(latest!).getByRole("button", { name: "Reply" }));
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Keep this draft");
    await user.click(within(older!).getByRole("button", { name: "Reply all" }));

    expect(screen.getByRole("dialog", { name: "Replace the current message draft?" }))
      .toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep draft" }));
    expect(screen.getByRole("textbox", { name: "Reply" })).toHaveTextContent("Keep this draft");
    expect(screen.queryByText("watcher@example.com")).not.toBeInTheDocument();
  });

  it("warns but keeps Update available for a manually added managed address", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      articles: articles(),
      customerReplies: true,
      providerManagedAddresses: ["support@example.com"],
    });
    await user.click(within(screen.getAllByRole("article")[0]!).getByRole("button", { name: "Reply" }));
    await user.type(screen.getByRole("textbox", { name: "Cc" }), "Support@Example.com{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Reply body");

    expect(screen.getByText(/helpdesk system address is included/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();
  });
});
