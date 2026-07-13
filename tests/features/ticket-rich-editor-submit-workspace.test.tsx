import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  getCustomerArticle,
  renderWorkspace,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";

describe("TicketWorkspace top communication composer", () => {
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
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Important");
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        body: "<strong>Important</strong>",
        cc: [],
        contextVersion: "context-ticket-1",
        intent: "reply",
        kind: "customer-reply",
        sourceArticleExternalId: "article-ticket-1",
        to: ["maya@example.com"],
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
      await user.type(screen.getByRole("textbox", { name: "Reply" }), "Docs");
      await user.click(
        screen.getByRole("button", { name: "Insert link" }),
      );
      await user.click(screen.getByRole("button", { name: "Update" }));

      expect(updateTicketMetadataAction).toHaveBeenCalledWith({
        communication: {
          bodyFormat: "html",
          body:
            '<a href="https://example.com/docs" rel="noreferrer noopener" target="_blank">Docs</a>',
          cc: [],
          contextVersion: "context-ticket-1",
          intent: "reply",
          kind: "customer-reply",
          sourceArticleExternalId: "article-ticket-1",
          to: ["maya@example.com"],
        },
        ticketExternalId: "ticket-1",
      });
    } finally {
      prompt.mockRestore();
    }
  });
});
