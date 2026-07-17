import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  getCustomerArticle,
  renderWorkspace,
} from "./ticket-communication-workspace-test-utils";

describe("TicketWorkspace communication composer focus", () => {
  it("opens, focuses, and scrolls the top Reply composer within the conversation", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    const prototype = window.HTMLElement.prototype as {
      scrollTo?: HTMLElement["scrollTo"];
    };
    const originalScrollTo = prototype.scrollTo;
    prototype.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];

    try {
      renderWorkspace({ customerReplies: true, internalNotes: true });
      const article = getCustomerArticle();

      await user.click(within(article).getByRole("button", { name: "Reply" }));
      const editor = screen.getByRole("textbox", { name: "Reply" });

      expect(screen.getByRole("form", { name: "Reply composer" }))
        .toBeInTheDocument();
      expect(editor).toHaveFocus();
      await waitFor(() => expect(scrollTo).toHaveBeenCalled());
      expect(within(article).getByRole("button", { name: "Reply" }))
        .toHaveClass("bg-slate-100", "text-slate-950");
      expect(within(article).getByRole("button", { name: "Reply all" }))
        .toBeDisabled();
    } finally {
      if (originalScrollTo) prototype.scrollTo = originalScrollTo;
      else delete prototype.scrollTo;
    }
  });
});
