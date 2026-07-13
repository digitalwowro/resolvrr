import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { WorkspaceArticle } from "@/features/tickets";
import { renderWorkspace } from "./ticket-communication-workspace-test-utils";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

function articles(): WorkspaceArticle[] {
  const latest = selectedDetailProps().detail.articles[0]!;
  return [
    latest,
    {
      ...latest,
      id: "article-older",
      meta: "May 23, 08:31",
      sanitizedHtml: "<p>Older message</p>",
      replyContext: {
        availableIntents: ["reply", "reply-all"],
        channel: "email",
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
