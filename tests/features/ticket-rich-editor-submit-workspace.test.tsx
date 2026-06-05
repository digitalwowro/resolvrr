import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  getCustomerArticle,
  renderWorkspace,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";

describe("TicketWorkspace inline communication composers", () => {
  it("stages rich reply formatting through workspace Update", async () => {
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
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Important",
    );
    await user.click(within(article).getByRole("button", { name: "Bold" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        replyBody: "<strong>Important</strong>",
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("stages safe rich reply links through workspace Update", async () => {
    const user = userEvent.setup();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("example.com/docs");
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    try {
      renderWorkspace({
        customerReplies: true,
        updateTicketMetadataAction,
      });

      const article = getCustomerArticle();
      await user.click(within(article).getByRole("button", { name: "Reply" }));
      await user.type(
        within(article).getByRole("textbox", { name: "Reply" }),
        "Docs",
      );
      await user.click(
        within(article).getByRole("button", { name: "Insert link" }),
      );
      await user.click(screen.getByRole("button", { name: "Update" }));

      expect(updateTicketMetadataAction).toHaveBeenCalledWith({
        communication: {
          bodyFormat: "html",
          replyBody:
            '<a href="https://example.com/docs" rel="noreferrer noopener" target="_blank">Docs</a>',
        },
        ticketExternalId: "ticket-1",
      });
    } finally {
      prompt.mockRestore();
    }
  });
});
