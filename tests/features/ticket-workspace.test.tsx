import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));


describe("TicketWorkspace", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("renders a disconnected state without an active connection", () => {
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[]}
        listResult={{
          status: "unavailable",
          reason: "no-active-connection",
          retryable: false,
        }}
        logoutAction={noopAction}
        rows={[]}
        setActiveConnectionAction={noopAction}
        tabs={[]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText("Tickets unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("No active helpdesk workspace is connected."),
    ).toBeInTheDocument();
  });

  it("renders provider-backed rows with the production table shell", () => {
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const table = screen.getByRole("table", { name: "Tickets" });
    expect(within(table).getByText("#1001")).toBeInTheDocument();
    expect(within(table).getByText("Cannot log in")).toBeInTheDocument();
    expect(within(table).getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.queryByText("Billing follow-up for annual renewal")).toBeNull();
  });

  it("renders the real workspace profile menu actions", async () => {
    const user = userEvent.setup();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));

    expect(screen.getByRole("menuitem", { name: /Support/u })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Manage workspaces" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Preferences" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Keyboard shortcuts" }),
    ).not.toBeInTheDocument();
  });

  it("renders selected detail through the production detail/thread components", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    detailProps.detail.links = [
      {
        id: "ticket-2",
        direction: "related",
        label: "#1002 Webhook failed",
        providerUrl: "https://helpdesk.example.com/#ticket/zoom/77",
      },
    ];
    detailProps.detail.subscription = { supported: true, following: true };
    detailProps.detail.tags = ["vip", "renewal"];
    detailProps.detail.articles[0] = {
      ...detailProps.detail.articles[0]!,
      sanitizedHtml:
        '\n  <p>Explore these links:</p>\n  <ul>\n    <li><a href="https://example.com/docs" rel="noreferrer noopener" target="_blank">Docs</a></li>\n  </ul>\n',
      cc: [{ label: "Billing Team", email: "billing@example.com" }],
      attachments: [
        {
          id: "attachment-1",
          fileName: "error-report.pdf",
          contentType: "application/pdf",
          byteSize: 3492,
        },
      ],
    };
    detailProps.detail.articles.push({
      id: "article-without-recipients",
      author: "Agent Smith",
      authorEmail: "agent@example.com",
      from: { label: "Agent Smith", email: "agent@example.com" },
      to: [],
      cc: [],
      bcc: [],
      direction: "outbound",
      meta: "May 24, 08:40",
      sanitizedHtml: "<p>No recipient details available.</p>",
      visibility: "public",
      attachments: [],
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket state: Open")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cannot log in" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Maya Patel").length).toBeGreaterThan(0);
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.getByText("vip, renewal")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "#1002 Webhook failed" }),
    ).toHaveAttribute("href", "https://helpdesk.example.com/#ticket/zoom/77");
    expect(screen.getByText("Explore these links:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
    expect(screen.getByText("Attachments (1)")).toBeInTheDocument();
    expect(screen.getByText("error-report.pdf")).toBeInTheDocument();
    expect(screen.getByText("application/pdf - 3.4 KB")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "error-report.pdf" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /error-report\.pdf/u }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Explore these links:").parentElement).toHaveClass(
      "whitespace-normal",
    );
    expect(
      screen.getByText("Explore these links:").parentElement,
    ).not.toHaveClass("whitespace-pre-wrap");

    expect(screen.queryByRole("button", { name: /^Reply$/u })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reply all$/u })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Message details for Maya Patel" }),
    );

    expect(screen.getAllByText("From:").length).toBeGreaterThan(0);
    expect(screen.getByText("<maya@example.com>")).toBeInTheDocument();
    expect(screen.getByText("To:")).toBeInTheDocument();
    expect(screen.getByText("Support Team")).toBeInTheDocument();
    expect(screen.getByText("(support@example.com)")).toBeInTheDocument();
    expect(screen.getByText("Cc:")).toBeInTheDocument();
    expect(screen.getByText("Billing Team")).toBeInTheDocument();
    expect(screen.getByText("(billing@example.com)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Message details for Agent Smith" }),
    ).toBeNull();
  });

  it("keeps metadata read-only when mutation capabilities are unavailable", () => {
    const detailProps = selectedDetailProps();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Ticket state" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Ticket priority" })).toBeNull();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
  });

  it("disables list controls only while a ticket pane is active", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(
      screen.queryByRole("checkbox", { name: "Select all tickets" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh list" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Saved view" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Group tickets by" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Column visibility" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("toolbar", { name: "Ticket list controls" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("System status")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tab layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Horizontal tabs" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Vertical tabs" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Horizontal tabs" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const tablist = screen.getByRole("tablist", { name: "Open tickets" });
    expect(within(tablist).getAllByRole("tab")[0]).toHaveAccessibleName(
      "Return to list: All tickets",
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(
      screen.getByRole("toolbar", { name: "Ticket list controls" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all tickets" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh list" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bulk actions" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Saved view" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Group tickets by" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Column visibility" })).toBeEnabled();
  });
});
