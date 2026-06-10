import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  workspaceOpenTabsStateVersion,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import {
  availableList,
  detailPropsFor,
  highRow,
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

describe("TicketWorkspace selected detail", () => {
  it("renders selected detail through the production detail/thread components", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    detailProps.detail.customerOrganization = "Acme Corp";
    if (detailProps.detailResult.status !== "available") {
      throw new Error("Expected available detail");
    }
    detailProps.detailResult.detail.customerOrganization = "Acme Corp";
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
    expect(screen.getByLabelText("Ticket state: Open")).toHaveClass(
      "bg-indigo-50",
      "text-indigo-700",
    );
    expect(
      screen.getByRole("heading", { name: "Cannot log in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Customer organization: Acme Corp"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Maya Patel").length).toBeGreaterThan(0);
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.getByText("vip")).toBeInTheDocument();
    expect(screen.getByText("renewal")).toBeInTheDocument();
    expect(screen.getByText("#1002")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Webhook failed" }),
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

    const mayaDetails = screen.getByRole("button", {
      name: "Message details for Maya Patel",
    });
    await user.click(mayaDetails);

    expect(screen.getByText("From:")).toBeInTheDocument();
    expect(screen.getByText("(maya@example.com)")).toBeInTheDocument();
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

  it("runs AI summary only from the explicit selected-ticket action", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const summarizeTicketAction = vi.fn(async () => ({
      status: "available" as const,
      generatedAt: new Date(Date.now() - 2.5 * 60 * 1000).toISOString(),
      source: {
        articleCount: 1,
        ticketNumber: "#1001",
        ticketUpdatedAt: new Date(Date.now() - 6.5 * 60 * 1000).toISOString(),
      },
      summary: "Situation: Login issue\nTimeline: Customer reported it.",
    }));

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
        summarizeTicketAction={summarizeTicketAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText("AI summary")).toBeInTheDocument();
    expect(summarizeTicketAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(summarizeTicketAction).toHaveBeenCalledWith({
      ticketExternalId: "ticket-1",
    });
    expect(await screen.findByText(/Situation: Login issue/u)).toBeInTheDocument();
    expect(screen.getByText("Generated 2m ago")).toBeInTheDocument();
    expect(
      screen.queryByText("AI can make mistakes. Please verify important details."),
    ).toBeNull();
  });

  it("resets AI summary state when switching selected tickets", async () => {
    const user = userEvent.setup();
    const firstDetail = selectedDetailProps();
    const secondDetail = detailPropsFor(highRow);
    const summarizeTicketAction = vi.fn(async () => ({
      status: "available" as const,
      generatedAt: "2026-05-24T08:36:00.000Z",
      source: {
        articleCount: 1,
        ticketNumber: "#1001",
        ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
      },
      summary: "Situation: Ticket A only summary",
    }));

    const loadTicketDetailAction = vi.fn(async () => secondDetail.detailResult);
    const initialWorkspaceOpenTabsState = {
      activePane: "ticket-1",
      openTabs: [row, highRow],
      recentTabs: [row, highRow],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={firstDetail.detail}
        detailResult={firstDetail.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        summarizeTicketAction={summarizeTicketAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(
      await screen.findByText(/Situation: Ticket A only summary/u),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(
      await screen.findByLabelText("Ticket detail #1002"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Situation: Ticket A only summary/u),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No summary generated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
  });
});
