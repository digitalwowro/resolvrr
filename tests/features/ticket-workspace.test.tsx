import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  defaultWorkspaceTicketColumns,
} from "@/features/tickets";
import {
  availableList,
  highRow,
  noopAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));


describe("TicketWorkspace", () => {
  beforeEach(() => {
    routerPush.mockClear();
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
    detailProps.detail.articles[0] = {
      ...detailProps.detail.articles[0]!,
      sanitizedHtml:
        '\n  <p>Explore these links:</p>\n  <ul>\n    <li><a href="https://example.com/docs" rel="noreferrer noopener" target="_blank">Docs</a></li>\n  </ul>\n',
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
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(screen.getAllByText("Maya Patel").length).toBeGreaterThan(0);
    expect(screen.getByText("Explore these links:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
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
    expect(
      screen.queryByRole("button", { name: "Message details for Agent Smith" }),
    ).toBeNull();
  });

  it("groups loaded tickets locally by provider-neutral values", async () => {
    const user = userEvent.setup();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[]}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Priority" }));

    expect(screen.getByRole("cell", { name: /^High 1$/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^Medium 1$/ })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Owner" }));

    expect(screen.getByRole("cell", { name: /^Agent Smith 1$/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^Unassigned 1$/ })).toBeInTheDocument();
  });
});
