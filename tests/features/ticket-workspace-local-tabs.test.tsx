import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  workspaceOpenTabsStateVersion,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import {
  availableList,
  connectedWorkspaceMenu,
  detailPropsFor,
  highRow,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("TicketWorkspace local tabs", () => {
  it("keeps navigation local and reads Zammad tabs only on Sync tabs", async () => {
    const initialWorkspaceOpenTabsState = {
      activePane: row.id,
      openTabs: [row, highRow],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-07-22T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;
    const importWorkspaceTicketTabsAction = vi.fn().mockResolvedValue({
      status: "available" as const,
      ticketExternalIds: [],
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[connectedWorkspaceMenu]}
        detail={detailPropsFor(row).detail}
        detailResult={detailPropsFor(row).detailResult}
        importWorkspaceTicketTabsAction={importWorkspaceTicketTabsAction}
        hydrateWorkspaceTabImportAction={async ({ ticketExternalId }) =>
          detailPropsFor(ticketExternalId === highRow.id ? highRow : row).detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        loadTicketDetailAction={async () => detailPropsFor(highRow).detailResult}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId={row.id}
        setActiveConnectionAction={noopAction}
        tabs={[row, highRow]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
        userId="user-1"
      />,
    );

    expect(importWorkspaceTicketTabsAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: /#1002/u }));
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    window.dispatchEvent(new Event("focus"));
    expect(importWorkspaceTicketTabsAction).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Sync tabs" }));
    await waitFor(() => expect(importWorkspaceTicketTabsAction).toHaveBeenCalledWith(
      "connection-1",
      "identity-1",
    ));
  });

  it("appends imported tabs without changing the active ticket", async () => {
    const saveWorkspaceOpenTabsStateAction = vi.fn().mockResolvedValue(undefined);
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[connectedWorkspaceMenu]}
        detail={detailPropsFor(row).detail}
        detailResult={detailPropsFor(row).detailResult}
        importWorkspaceTicketTabsAction={vi.fn().mockResolvedValue({
          status: "available" as const,
          ticketExternalIds: [highRow.id],
        })}
        hydrateWorkspaceTabImportAction={async ({ ticketExternalId }) =>
          detailPropsFor(ticketExternalId === highRow.id ? highRow : row).detailResult}
        initialWorkspaceOpenTabsState={{
          activePane: row.id,
          openTabs: [row],
          recentTabs: [],
          tabOrientation: "horizontal",
          updatedAt: "2026-07-22T00:00:00.000Z",
          version: workspaceOpenTabsStateVersion,
        }}
        listResult={availableList}
        loadTicketDetailAction={async () => detailPropsFor(highRow).detailResult}
        logoutAction={noopAction}
        rows={[row, highRow]}
        saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
        selectedTicketId={row.id}
        setActiveConnectionAction={noopAction}
        tabs={[row, highRow]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
        userId="user-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sync tabs" }));

    await waitFor(() => expect(screen.getByRole("tab", { name: /#1002/u }))
      .toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /#1001/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => {
      const latestState = saveWorkspaceOpenTabsStateAction.mock.calls.at(-1)?.[0];
      expect(latestState.openTabs.map((tab: { id: string }) => tab.id)).toContain(
        highRow.id,
      );
      expect(latestState.recentTabs.map((tab: { id: string }) => tab.id))
        .not.toContain(highRow.id);
    });
  });
});
