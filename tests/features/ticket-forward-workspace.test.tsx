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
    expect(screen.getByRole("checkbox", { name: "Include original message" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /report.pdf/u })).toBeChecked();
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
        contextVersion: "forward-v1",
        includeOriginal: true,
        kind: "customer-forward",
        sourceArticleExternalId: article.id,
        subject: "Cannot log in",
        to: ["customer@example.com"],
      },
      ticketExternalId: "ticket-1",
    });
  });
});
