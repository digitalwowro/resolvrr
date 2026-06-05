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

describe("TicketWorkspace inline communication composers", () => {
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

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Comment" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Comment" }),
      "Checked the logs.",
    );
    expect(within(article).queryByRole("button", { name: "Send" }))
      .not.toBeInTheDocument();
    expect(updateTicketMetadataAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        commentBody: "Checked the logs.",
      },
      ticketExternalId: "ticket-1",
    });
    await waitFor(() =>
      expect(
        within(article).queryByRole("form", {
          name: "Comment composer for Maya Patel",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("discards staged communication text with the rest of the draft", async () => {
    const user = userEvent.setup();

    renderWorkspace({
      internalNotes: true,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Comment" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Comment" }),
      "Checked the logs.",
    );
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(within(article).getByRole("textbox", { name: "Comment" }))
      .toHaveTextContent("");
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

    const article = getCustomerArticle();
    const replyAllButton = within(article).getByRole("button", {
      name: "Reply all",
    });

    expect(replyAllButton).toBeDisabled();
    await user.click(replyAllButton);

    expect(updateTicketMetadataAction).not.toHaveBeenCalled();
    expect(
      within(article).queryByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows comment but not reply actions on internal articles", () => {
    const articles = [...selectedDetailProps().detail.articles, internalArticle()];

    renderWorkspace({
      articles,
      customerReplies: true,
      internalNotes: true,
    });

    const article = screen.getByRole("article", {
      name: "Internal note from Agent Smith",
    });

    expect(
      within(article).queryByRole("button", { name: "Reply" }),
    ).not.toBeInTheDocument();
    expect(
      within(article).queryByRole("button", { name: "Reply all" }),
    ).not.toBeInTheDocument();
    expect(
      within(article).getByRole("button", { name: "Comment" }),
    ).toBeInTheDocument();
  });
});
