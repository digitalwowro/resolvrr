import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";
import {
  deferred,
  getCustomerArticle,
  renderWorkspace,
  routerPush,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";
import { detailPropsFor, row, selectedDetailProps } from "./ticket-workspace-test-utils";

beforeEach(() => {
  routerPush.mockClear();
});

describe("TicketWorkspace inline communication composers", () => {
  it("does not render standalone bottom composers by default", () => {
    renderWorkspace({ customerReplies: true, internalNotes: true });

    expect(
      screen.queryByRole("form", { name: "Reply composer for Maya Patel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Comment composer for Maya Patel" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Customer reply")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Internal note")).not.toBeInTheDocument();
  });

  it("opens an inline reply composer from a public article", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const htmlElementPrototype: {
      scrollIntoView?: HTMLElement["scrollIntoView"];
    } = window.HTMLElement.prototype;
    const originalScrollIntoView = htmlElementPrototype.scrollIntoView;
    htmlElementPrototype.scrollIntoView =
      scrollIntoView as unknown as HTMLElement["scrollIntoView"];

    try {
      renderWorkspace({ customerReplies: true, internalNotes: true });
      const article = getCustomerArticle();

      await user.click(within(article).getByRole("button", { name: "Reply" }));
      const editor = within(article).getByRole("textbox", { name: "Reply" });

      expect(
        within(article).getByRole("form", {
          name: "Reply composer for Maya Patel",
        }),
      ).toBeInTheDocument();
      expect(editor).toHaveFocus();
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        }),
      );
      expect(within(article).getByRole("button", { name: "Reply" })).toHaveClass(
        "bg-indigo-200",
      );
      expect(
        within(article).getByRole("button", { name: "Reply all" }),
      ).toBeDisabled();
    } finally {
      if (originalScrollIntoView) {
        htmlElementPrototype.scrollIntoView = originalScrollIntoView;
      } else {
        delete htmlElementPrototype.scrollIntoView;
      }
    }
  });

  it("hides the inline reply composer from the editor toolbar", async () => {
    const user = userEvent.setup();

    renderWorkspace({ customerReplies: true, internalNotes: true });
    const article = getCustomerArticle();

    await user.click(within(article).getByRole("button", { name: "Reply" }));
    expect(
      within(article).getByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).toBeInTheDocument();

    await user.click(within(article).getByRole("button", { name: "Close editor" }));

    expect(
      within(article).queryByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).not.toBeInTheDocument();
    expect(within(article).getByRole("button", { name: "Reply" }))
      .not.toHaveClass("bg-indigo-200");
  });

  it("stages a reply and sends it through workspace Update", async () => {
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
      "Thanks for the report.",
    );
    expect(within(article).queryByRole("button", { name: "Send" }))
      .not.toBeInTheDocument();
    expect(updateTicketMetadataAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        replyBody: "Thanks for the report.",
      },
      ticketExternalId: "ticket-1",
    });
    await waitFor(() =>
      expect(
        within(article).queryByRole("form", {
          name: "Reply composer for Maya Patel",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps the existing thread visible while refreshing a saved reply", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));
    const refreshed = detailPropsFor(row, "Thanks for the report.");
    const refreshResult = deferred<WorkspaceTicketDetailLoadResult>();
    const loadTicketDetailAction = vi.fn<LoadWorkspaceTicketDetailAction>(
      () => refreshResult.promise,
    );

    renderWorkspace({
      customerReplies: true,
      loadTicketDetailAction,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Thanks for the report.",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(loadTicketDetailAction).toHaveBeenCalledWith(
        "ticket-1",
        { cacheMode: "bypass" },
      ),
    );
    expect(screen.queryByText("Loading ticket thread...")).not.toBeInTheDocument();
    expect(getCustomerArticle()).toBeInTheDocument();

    refreshResult.resolve({ status: "available", detail: refreshed.detail });
    expect(await screen.findByText("Thanks for the report.")).toBeInTheDocument();
  });

  it("hides the reply editor and scrolls to the refreshed reply after Update", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const htmlElementPrototype: {
      scrollIntoView?: HTMLElement["scrollIntoView"];
    } = window.HTMLElement.prototype;
    const originalScrollIntoView = htmlElementPrototype.scrollIntoView;
    htmlElementPrototype.scrollIntoView =
      scrollIntoView as unknown as HTMLElement["scrollIntoView"];
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));
    const refreshed = detailPropsFor(row, "Thanks for the report.");
    refreshed.detail.articles = [
      ...selectedDetailProps().detail.articles,
      {
        id: "article-reply-ticket-1",
        author: "Agent Smith",
        authorEmail: "agent@example.com",
        from: { label: "Agent Smith", email: "agent@example.com" },
        to: [{ label: "Maya Patel", email: "maya@example.com" }],
        cc: [],
        bcc: [],
        direction: "outbound",
        meta: "May 24, 08:40",
        sanitizedHtml: "<p>Thanks for the report.</p>",
        visibility: "public",
        attachments: [],
      },
    ];
    const loadTicketDetailAction = vi.fn<LoadWorkspaceTicketDetailAction>(
      async () => ({ status: "available", detail: refreshed.detail }),
    );

    try {
      renderWorkspace({
        customerReplies: true,
        loadTicketDetailAction,
        updateTicketMetadataAction,
      });

      const article = getCustomerArticle();
      await user.click(within(article).getByRole("button", { name: "Reply" }));
      await user.type(
        within(article).getByRole("textbox", { name: "Reply" }),
        "Thanks for the report.",
      );
      scrollIntoView.mockClear();
      await user.click(screen.getByRole("button", { name: "Update" }));

      expect(
        within(article).queryByRole("form", {
          name: "Reply composer for Maya Patel",
        }),
      ).not.toBeInTheDocument();
      await waitFor(() =>
        expect(loadTicketDetailAction).toHaveBeenCalledWith(
          "ticket-1",
          { cacheMode: "bypass" },
        ),
      );
      expect(
        await screen.findByRole("article", {
          name: "Employee reply from Agent Smith",
        }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        }),
      );
    } finally {
      if (originalScrollIntoView) {
        htmlElementPrototype.scrollIntoView = originalScrollIntoView;
      } else {
        delete htmlElementPrototype.scrollIntoView;
      }
    }
  });

  it("keeps a failed staged reply draft visible for retry", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "failed",
      field: "communication",
      message: "The helpdesk could not be reached. Try again.",
    }));

    renderWorkspace({
      customerReplies: true,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Thanks for the report.",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(
      await screen.findByText("The helpdesk could not be reached. Try again."),
    ).toBeInTheDocument();
    expect(within(article).getByRole("textbox", { name: "Reply" }))
      .toHaveTextContent("Thanks for the report.");
  });
});
