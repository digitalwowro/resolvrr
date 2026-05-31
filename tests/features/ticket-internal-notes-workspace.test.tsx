import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type TicketCustomerReplyActionState,
  type TicketCustomerReplyPayload,
  type TicketInternalNoteActionState,
  type TicketInternalNotePayload,
  type LoadWorkspaceTicketDetailAction,
  type WorkspaceArticle,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  detailPropsFor,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

type InternalNoteAction = (
  request: TicketInternalNotePayload,
) => Promise<TicketInternalNoteActionState>;

type CustomerReplyAction = (
  request: TicketCustomerReplyPayload,
) => Promise<TicketCustomerReplyActionState>;

function renderWorkspace({
  addTicketCustomerReplyAction,
  addTicketInternalNoteAction,
  articles,
  customerReplies = false,
  internalNotes = false,
  loadTicketDetailAction,
}: {
  addTicketCustomerReplyAction?: CustomerReplyAction;
  addTicketInternalNoteAction?: InternalNoteAction;
  articles?: WorkspaceArticle[];
  customerReplies?: boolean;
  internalNotes?: boolean;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
} = {}) {
  const detailProps = selectedDetailProps();
  const detail = articles ? { ...detailProps.detail, articles } : detailProps.detail;

  render(
    <TicketWorkspace
      addTicketCustomerReplyAction={addTicketCustomerReplyAction}
      addTicketInternalNoteAction={addTicketInternalNoteAction}
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      detail={detail}
      detailResult={{ status: "available", detail }}
      listResult={{
        ...availableList,
        communicationCapabilities: { customerReplies, internalNotes },
      }}
      loadTicketDetailAction={loadTicketDetailAction}
      logoutAction={noopAction}
      rows={[row]}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[{ ...row }]}
      updateTicketMetadataAction={noopMutationAction}
      userEmail="agent@example.com"
    />,
  );
}

function internalArticle(): WorkspaceArticle {
  return {
    id: "article-internal-ticket-1",
    author: "Agent Smith",
    authorEmail: "agent@example.com",
    from: { label: "Agent Smith", email: "agent@example.com" },
    to: [],
    cc: [],
    bcc: [],
    direction: "internal",
    meta: "May 24, 08:34",
    sanitizedHtml: "<p>Private investigation note.</p>",
    visibility: "internal",
    attachments: [],
  };
}

function getCustomerArticle() {
  return screen.getByRole("article", {
    name: "Customer reply from Maya Patel",
  });
}

describe("TicketWorkspace inline communication composers", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

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
    renderWorkspace({ customerReplies: true, internalNotes: true });
    const article = getCustomerArticle();

    await user.click(within(article).getByRole("button", { name: "Reply" }));

    expect(
      within(article).getByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).toBeInTheDocument();
    expect(within(article).getByRole("button", { name: "Reply" })).toHaveClass(
      "bg-indigo-200",
    );
    expect(
      within(article).getByRole("button", { name: "Reply all" }),
    ).toBeDisabled();
  });

  it("sends a reply, clears the draft, and refreshes detail on saved", async () => {
    const user = userEvent.setup();
    const refreshedDetail = detailPropsFor(row, "Thanks for the report.");
    const addTicketCustomerReplyAction = vi.fn<CustomerReplyAction>(async () => ({
      status: "saved",
      message: "Reply sent.",
    }));
    const loadTicketDetailAction = vi.fn(async () => refreshedDetail.detailResult);

    renderWorkspace({
      addTicketCustomerReplyAction,
      customerReplies: true,
      loadTicketDetailAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(within(article).getByLabelText("Reply"), "Thanks for the report.");
    await user.click(within(article).getByRole("button", { name: "Send" }));

    expect(addTicketCustomerReplyAction).toHaveBeenCalledWith({
      body: "Thanks for the report.",
      ticketExternalId: "ticket-1",
    });
    expect(await screen.findByText("Thanks for the report.")).toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(within(article).getByLabelText("Reply")).toHaveValue("");
  });

  it("clears a saved-refresh-failed reply draft without refreshing detail", async () => {
    const user = userEvent.setup();
    const addTicketCustomerReplyAction = vi.fn<CustomerReplyAction>(async () => ({
      status: "saved-refresh-failed",
      message:
        "Reply sent, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
    }));
    const loadTicketDetailAction = vi.fn(async () => selectedDetailProps().detailResult);

    renderWorkspace({
      addTicketCustomerReplyAction,
      customerReplies: true,
      loadTicketDetailAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(within(article).getByLabelText("Reply"), "Thanks for the report.");
    await user.click(within(article).getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText(
        "Reply sent, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
      ),
    ).toBeInTheDocument();
    expect(within(article).getByLabelText("Reply")).toHaveValue("");
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
  });

  it("opens an inline comment composer and sends an internal note", async () => {
    const user = userEvent.setup();
    const addTicketInternalNoteAction = vi.fn<InternalNoteAction>(async () => ({
      status: "saved",
      message: "Comment added.",
    }));
    const loadTicketDetailAction = vi.fn(async () =>
      detailPropsFor(row, "Checked the logs.").detailResult,
    );

    renderWorkspace({
      addTicketInternalNoteAction,
      internalNotes: true,
      loadTicketDetailAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Comment" }));
    await user.type(within(article).getByLabelText("Comment"), "Checked the logs.");
    await user.click(within(article).getByRole("button", { name: "Send" }));

    expect(addTicketInternalNoteAction).toHaveBeenCalledWith({
      body: "Checked the logs.",
      ticketExternalId: "ticket-1",
    });
    expect(await screen.findByText("Checked the logs.")).toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(within(article).getByLabelText("Comment")).toHaveValue("");
  });

  it("keeps a failed draft visible for retry", async () => {
    const user = userEvent.setup();
    const addTicketInternalNoteAction = vi.fn<InternalNoteAction>(async () => ({
      status: "failed",
      message: "The helpdesk could not be reached. Try again.",
    }));

    renderWorkspace({
      addTicketInternalNoteAction,
      internalNotes: true,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Comment" }));
    await user.type(within(article).getByLabelText("Comment"), "Checked the logs.");
    await user.click(within(article).getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("The helpdesk could not be reached. Try again."),
    ).toBeInTheDocument();
    expect(within(article).getByLabelText("Comment")).toHaveValue(
      "Checked the logs.",
    );
  });

  it("keeps Reply all unavailable and disconnected from server actions", async () => {
    const user = userEvent.setup();
    const addTicketCustomerReplyAction = vi.fn<CustomerReplyAction>(async () => ({
      status: "saved",
      message: "Reply sent.",
    }));

    renderWorkspace({
      addTicketCustomerReplyAction,
      customerReplies: true,
    });

    const article = getCustomerArticle();
    const replyAllButton = within(article).getByRole("button", {
      name: "Reply all",
    });

    expect(replyAllButton).toBeDisabled();
    await user.click(replyAllButton);

    expect(addTicketCustomerReplyAction).not.toHaveBeenCalled();
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
