import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  workspaceOpenTabsStateVersion,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import {
  availableList,
  highRow,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";
import {
  domRect,
  mockElementRect,
} from "./ticket-workspace-horizontal-tabs-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace horizontal tab pointer handling", () => {
  it("keeps tab clicks working after small pointer jitter", () => {
    const initialWorkspaceOpenTabsState = {
      activePane: "list",
      openTabs: [row, highRow],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const firstTab = screen.getByRole("tab", { name: /#1001/u });
    const secondTab = screen.getByRole("tab", { name: /#1002/u });
    mockElementRect(
      firstTab.parentElement,
      domRect({ height: 36, left: 100, top: 0, width: 100 }),
    );
    mockElementRect(
      secondTab.parentElement,
      domRect({ height: 36, left: 208, top: 0, width: 100 }),
    );

    fireEvent.pointerDown(firstTab, {
      button: 0,
      clientX: 150,
      clientY: 18,
      pointerId: 3,
    });
    fireEvent.pointerMove(firstTab.parentElement as HTMLElement, {
      clientX: 156,
      clientY: 18,
      pointerId: 3,
    });
    fireEvent.pointerUp(firstTab.parentElement as HTMLElement, {
      clientX: 156,
      clientY: 18,
      pointerId: 3,
    });
    fireEvent.click(firstTab);

    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
  });
});
