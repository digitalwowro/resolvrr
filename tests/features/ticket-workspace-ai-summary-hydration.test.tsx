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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("TicketWorkspace AI summary hydration", () => {
  it("displays a cached summary when a ticket is loaded after hydration", async () => {
    const user = userEvent.setup();
    const firstDetail = selectedDetailProps();
    const secondDetail = detailPropsFor(highRow);
    const summarizeTicketAction = vi.fn();
    const loadTicketDetailAction = vi.fn(async () => ({
      ...secondDetail.detailResult,
      initialTicketAiSummary: {
        result: {
          status: "available" as const,
          generatedAt: "2026-07-17T08:40:00.000Z",
          source: {
            articleCount: 1,
            ticketNumber: "#1002",
            ticketUpdatedAt: "2026-07-17T08:30:00.000Z",
          },
          summary: "Situation: Hydrated ticket-two summary",
        },
        ticketId: "ticket-2",
      },
      summaryHydrated: true as const,
    }));
    const initialWorkspaceOpenTabsState = {
      activePane: "ticket-1",
      openTabs: [row, highRow],
      recentTabs: [row, highRow],
      tabOrientation: "horizontal",
      updatedAt: "2026-07-17T08:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          active: true,
          connectionId: "connection-1",
          id: "workspace-1",
          label: "Support",
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
        tabs={[row, highRow]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(await screen.findByText(/Hydrated ticket-two summary/u))
      .toBeInTheDocument();
    expect(summarizeTicketAction).not.toHaveBeenCalled();
  });
});
