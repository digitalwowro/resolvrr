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
import { ticketSummaryContent } from "./ai-ticket-summary-cache-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace selected detail AI summary", () => {
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
      summary: ticketSummaryContent("Login issue", {
        timeline: [{ date: null, event: "Customer reported it." }],
      }),
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          id: "workspace-1",
          connectionId: "connection-1",
          label: "Support",
          active: true,
        }]}
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

    expect(screen.queryByText("AI summary")).toBeNull();
    expect(summarizeTicketAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Generate AI summary" }));

    expect(summarizeTicketAction).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
      ticketExternalId: "ticket-1",
      workspaceId: "workspace-1",
    });
    expect(await screen.findByText("AI summary")).toBeInTheDocument();
    expect(await screen.findByText("Login issue")).toBeInTheDocument();
    expect(screen.getByText("Generated 2m ago")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AI summary" }).parentElement)
      .toHaveClass("pl-4", "pr-4");
    expect(
      screen.queryByText("AI can make mistakes. Please verify important details."),
    ).toBeNull();
  });

  it("displays an initial cached AI summary and force refreshes on Regenerate", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const summarizeTicketAction = vi.fn(async () => ({
      status: "available" as const,
      generatedAt: "2026-05-24T08:40:00.000Z",
      source: {
        articleCount: 1,
        ticketNumber: "#1001",
        ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
      },
      summary: ticketSummaryContent("Cached summary"),
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          id: "workspace-1",
          connectionId: "connection-1",
          label: "Support",
          active: true,
        }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        initialTicketAiSummary={{
          result: {
            status: "available",
            generatedAt: "2026-05-24T08:40:00.000Z",
            source: {
              articleCount: 1,
              ticketNumber: "#1001",
              ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
            },
            summary: ticketSummaryContent("Cached summary"),
          },
          ticketId: "ticket-1",
        }}
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
    expect(screen.getByText("Cached summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeInTheDocument();
    expect(summarizeTicketAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(summarizeTicketAction).toHaveBeenCalledWith({
      forceRefresh: true,
      helpdeskConnectionId: "connection-1",
      ticketExternalId: "ticket-1",
      workspaceId: "workspace-1",
    });
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
      summary: ticketSummaryContent("Ticket A only summary"),
    }));
    const loadTicketDetailAction = vi.fn(async (ticketId: string) =>
      ticketId === "ticket-1"
        ? firstDetail.detailResult
        : secondDetail.detailResult
    );
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
        connections={[{
          id: "workspace-1",
          connectionId: "connection-1",
          label: "Support",
          active: true,
        }]}
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

    await user.click(screen.getByRole("button", { name: "Generate AI summary" }));
    expect(await screen.findByText("Ticket A only summary"))
      .toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(await screen.findByLabelText("Ticket detail #1002")).toBeInTheDocument();
    expect(screen.queryByText("Ticket A only summary"))
      .not.toBeInTheDocument();
    expect(screen.queryByText("No summary generated")).toBeNull();
    expect(screen.getByRole("button", { name: "Generate AI summary" }))
      .toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1001/u }));

    expect(await screen.findByText("Ticket A only summary"))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh ticket" }));

    expect(await screen.findByText("Ticket A only summary"))
      .toBeInTheDocument();
  });
});
