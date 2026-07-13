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

describe("TicketWorkspace ticket-level communication composer", () => {
  it("does not render the top composer by default", () => {
    renderWorkspace({ customerReplies: true, internalNotes: true });

    expect(
      screen.queryByRole("form", { name: "Reply composer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Comment composer" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Customer reply")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Internal note")).not.toBeInTheDocument();
  });

  it("opens and focuses the top reply composer from a public article", async () => {
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
      const editor = screen.getByRole("textbox", { name: "Reply" });

      expect(
        screen.getByRole("form", { name: "Reply composer" }),
      ).toBeInTheDocument();
      expect(editor).toHaveFocus();
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
      expect(within(article).getByRole("button", { name: "Reply" })).toHaveClass(
        "bg-slate-100",
        "text-slate-950",
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

  it("closes the whole reply composer from its section header", async () => {
    const user = userEvent.setup();

    renderWorkspace({ customerReplies: true, internalNotes: true });
    const article = getCustomerArticle();

    await user.click(within(article).getByRole("button", { name: "Reply" }));
    expect(
      screen.getByRole("form", { name: "Reply composer" }),
    ).toBeInTheDocument();

    const composer = screen.getByRole("form", { name: "Reply composer" });
    expect(within(composer).queryByRole("button", { name: "Close composer" }))
      .not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close composer" }));

    expect(
      screen.queryByRole("form", { name: "Reply composer" }),
    ).not.toBeInTheDocument();
    expect(within(article).getByRole("button", { name: "Reply" }))
      .not.toHaveClass("bg-slate-100");
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
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Thanks for the report.");
    expect(within(article).queryByRole("button", { name: "Send" }))
      .not.toBeInTheDocument();
    expect(updateTicketMetadataAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        body: "Thanks for the report.",
        cc: [],
        contextVersion: "context-ticket-1",
        intent: "reply",
        kind: "customer-reply",
        sourceArticleExternalId: "article-ticket-1",
        to: ["maya@example.com"],
      },
      ticketExternalId: "ticket-1",
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("form", { name: "Reply composer" }),
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
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Thanks for the report.");
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
      await user.type(screen.getByRole("textbox", { name: "Reply" }), "Thanks for the report.");
      scrollIntoView.mockClear();
      await user.click(screen.getByRole("button", { name: "Update" }));

      expect(
        screen.queryByRole("form", { name: "Reply composer" }),
      ).not.toBeInTheDocument();
      await waitFor(() =>
        expect(loadTicketDetailAction).toHaveBeenCalledWith(
          "ticket-1",
          { cacheMode: "bypass" },
        ),
      );
      expect(
        await screen.findByRole("article", {
          name: "Agent reply from Agent Smith",
        }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "center",
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
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Thanks for the report.");
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(
      await screen.findByText("The helpdesk could not be reached. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Reply" }))
      .toHaveTextContent("Thanks for the report.");
  });
  it("keeps the message draft but adopts saved metadata after partial success", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "partially-saved",
      field: "communication",
      message: "Ticket changes were saved, but the helpdesk did not confirm accepting the message.",
    }));
    renderWorkspace({
      customerReplies: true,
      metadataPriority: true,
      updateTicketMetadataAction,
    });

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));
    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Retain me");
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(await screen.findByText(/helpdesk did not confirm accepting/u)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Reply" })).toHaveTextContent("Retain me");
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveTextContent("High");
    expect(screen.queryByRole("textbox", { name: "Reply" })).not.toBeInTheDocument();
  });
});
