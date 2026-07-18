import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceArticle } from "@/features/tickets";
import {
  renderWorkspace,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

function forwardableArticle(): WorkspaceArticle {
  const article = selectedDetailProps().detail.articles[0]!;
  return {
    ...article,
    attachments: [{ id: "91", fileName: "report.pdf", contentType: "application/pdf" }],
    forwardContext: {
      channel: "email",
      conversationHistory: {
        contextVersion: "history-through-source",
        messageCount: 1,
        scope: "through-source",
      },
      contextVersion: "forward-v1",
      sourceArticleExternalId: article.id,
      subject: "Cannot log in",
    },
    replyContext: undefined,
  };
}

describe("TicketWorkspace email forwarding", () => {
  it("offers Forward independently when a managed-source message cannot be replied to", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      articles: [forwardableArticle()],
      customerForwards: true,
      customerReplies: true,
    });
    const article = screen.getByRole("article");
    expect(within(article).queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    await user.click(within(article).getByRole("button", { name: "Forward" }));
    expect(screen.getByRole("form", { name: "Forward composer" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Forward subject" })).toHaveValue("Cannot log in");
    expect(screen.getByRole("checkbox", { name: "Include conversation history" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /report.pdf/u })).toBeChecked();
    const options = screen.getByRole("group", { name: "Forward options" });
    expect(options).toHaveClass("w-full");
    expect(options).not.toHaveClass("border-b", "px-4");
    expect(screen.getByRole("textbox", { name: "Forward subject" }))
      .toHaveClass("w-full");
    expect(screen.getByText("Preview conversation history").closest("details"))
      .toHaveClass("border-t");
  });

  it("scrolls only the conversation when opening the Forward composer", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    const prototype = window.HTMLElement.prototype as {
      scrollIntoView?: HTMLElement["scrollIntoView"];
      scrollTo?: HTMLElement["scrollTo"];
    };
    const originalScrollIntoView = prototype.scrollIntoView;
    const originalScrollTo = prototype.scrollTo;
    prototype.scrollIntoView =
      scrollIntoView as unknown as HTMLElement["scrollIntoView"];
    prototype.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];

    try {
      renderWorkspace({
        articles: [forwardableArticle()],
        customerForwards: true,
      });
      await user.click(
        within(screen.getByRole("article")).getByRole("button", {
          name: "Forward",
        }),
      );

      await waitFor(() => expect(scrollTo).toHaveBeenCalled());
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      if (originalScrollIntoView) prototype.scrollIntoView = originalScrollIntoView;
      else delete prototype.scrollIntoView;
      if (originalScrollTo) prototype.scrollTo = originalScrollTo;
      else delete prototype.scrollTo;
    }
  });

  it("submits reviewed recipients, exact subject, source context, and attachment selection", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const, field: "communication" as const,
    }));
    const article = forwardableArticle();
    renderWorkspace({
      articles: [article],
      customerForwards: true,
      updateTicketMetadataAction: action,
    });
    await user.click(within(screen.getByRole("article")).getByRole("button", { name: "Forward" }));
    await user.type(screen.getByRole("textbox", { name: "To" }), "customer@example.com{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Forward" }), "Please review");
    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toEqual({
      communication: {
        attachmentExternalIds: ["91"],
        body: "Please review",
        bodyFormat: "html",
        cc: [],
        conversationHistoryContextVersion: "history-through-source",
        conversationHistoryScope: "through-source",
        contextVersion: "forward-v1",
        includeConversationHistory: true,
        kind: "customer-forward",
        signatureContext: { contextVersion: "signature-disabled", source: "none" },
        sourceArticleExternalId: article.id,
        subject: "Cannot log in",
        to: ["customer@example.com"],
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("uses current history when Forward starts from the sticky footer", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "communication" as const,
    }));
    const article = forwardableArticle();
    renderWorkspace({
      articles: [article],
      conversationHistory: {
        contextVersion: "history-current",
        messageCount: 1,
        scope: "current",
      },
      customerForwards: true,
      updateTicketMetadataAction: action,
    });

    await user.click(
      within(screen.getByRole("group", { name: "Ticket actions" }))
        .getByRole("button", { name: "Forward" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "To" }),
      "customer@example.com{Enter}",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Forward" }),
      "Please review",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action).toHaveBeenCalledWith(expect.objectContaining({
      communication: expect.objectContaining({
        conversationHistoryContextVersion: "history-current",
        conversationHistoryScope: "current",
        kind: "customer-forward",
      }),
    }));
  });
});
