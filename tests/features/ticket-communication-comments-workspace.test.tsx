import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  getCustomerArticle,
  internalArticle,
  renderWorkspace,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

describe("TicketWorkspace ticket-level communication composer", () => {
  it("stages a comment and sends it through workspace Update", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    renderWorkspace({
      internalNotes: true,
      updateTicketMetadataAction,
    });

    getCustomerArticle();
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await user.type(screen.getByRole("textbox", { name: "Comment" }), "Checked the logs.");
    expect(screen.queryByRole("button", { name: "Send" }))
      .not.toBeInTheDocument();
    expect(updateTicketMetadataAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        body: "Checked the logs.",
        kind: "internal-comment",
      },
      ticketExternalId: "ticket-1",
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("form", { name: "Comment composer" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("discards staged communication text with the rest of the draft", async () => {
    const user = userEvent.setup();

    renderWorkspace({
      internalNotes: true,
    });

    getCustomerArticle();
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await user.type(screen.getByRole("textbox", { name: "Comment" }), "Checked the logs.");
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.queryByRole("textbox", { name: "Comment" })).not.toBeInTheDocument();
  });

  it("keeps Reply all unavailable and disconnected from server actions", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    renderWorkspace({
      customerReplies: true,
      updateTicketMetadataAction,
    });

    getCustomerArticle();
    const replyAllButton = within(
      screen.getByRole("group", { name: "Ticket actions" }),
    ).getByRole("button", {
      name: "Reply all",
    });

    expect(replyAllButton).toBeDisabled();
    await user.click(replyAllButton);

    expect(updateTicketMetadataAction).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("form", { name: "Reply composer" }),
    ).not.toBeInTheDocument();
  });

  it("keeps comment ticket-level and hides reply actions on internal articles", () => {
    const articles = [...selectedDetailProps().detail.articles, internalArticle()];

    renderWorkspace({
      articles,
      customerReplies: true,
      internalNotes: true,
    });

    const article = screen.getByRole("article", {
      name: "Internal comment from Agent Smith",
    });

    expect(
      within(article).queryByRole("button", { name: "Reply" }),
    ).not.toBeInTheDocument();
    expect(
      within(article).queryByRole("button", { name: "Reply all" }),
    ).not.toBeInTheDocument();
    expect(within(article).queryByRole("button", { name: "Comment" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comment" })).toBeEnabled();
  });
});
