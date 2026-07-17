import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  getCustomerArticle,
  renderWorkspace,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";

const lookupMentionableUsers = vi.hoisted(() => vi.fn(async () => ({
  status: "available" as const,
  cachePolicy: "request" as const,
  options: [{ externalId: "4", label: "Manuela Duma" }],
})));

vi.mock("@/features/tickets/lookup-actions", () => ({
  lookupWorkspaceAssignableUsersAction: vi.fn(),
  lookupWorkspaceMentionableUsersAction: lookupMentionableUsers,
}));

describe("Ticket communication mentions", () => {
  it("inserts a group-scoped structured mention into the staged article", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));
    renderWorkspace({ customerReplies: true, updateTicketMetadataAction });

    await user.click(
      within(getCustomerArticle()).getByRole("button", { name: "Reply" }),
    );
    const editor = screen.getByRole("textbox", { name: "Reply" });
    const rangeRectDescriptor = Object.getOwnPropertyDescriptor(
      Range.prototype,
      "getBoundingClientRect",
    );
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 150,
        height: 20,
        left: 180,
        right: 180,
        top: 130,
        width: 0,
        x: 180,
        y: 130,
        toJSON: () => ({}),
      }),
    });
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      bottom: 260,
      height: 160,
      left: 100,
      right: 700,
      top: 100,
      width: 600,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    try {
      await user.type(editor, "@@Man");
      const option = await screen.findByRole("option", { name: "Manuela Duma" });
      expect(editor.parentElement?.parentElement).not.toHaveClass("overflow-hidden");
      expect(screen.getByRole("listbox")).toHaveStyle({
        left: "80px",
        top: "54px",
      });
      await user.click(option);
      await user.type(editor, " please review.");
      await user.click(screen.getByRole("button", { name: "Update" }));
    } finally {
      if (rangeRectDescriptor) {
        Object.defineProperty(
          Range.prototype,
          "getBoundingClientRect",
          rangeRectDescriptor,
        );
      } else {
        delete (Range.prototype as Partial<Range>).getBoundingClientRect;
      }
    }

    await waitFor(() => expect(updateTicketMetadataAction).toHaveBeenCalled());
    expect(lookupMentionableUsers).toHaveBeenCalledWith({
      groupExternalId: "group-1",
      query: "Man",
    });
    expect(updateTicketMetadataAction).toHaveBeenCalledWith(
      expect.objectContaining({
        communication: expect.objectContaining({
          body: expect.stringContaining(
            '<span contenteditable="false" data-resolvrr-mention-id="4">Manuela Duma</span>',
          ),
        }),
      }),
    );
  });
});
