import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  highRow,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const workspaceProps = {
  columns: defaultWorkspaceTicketColumns,
  connections: [{ id: "connection-1", label: "Support", active: true }],
  logoutAction: noopAction,
  setActiveConnectionAction: noopAction,
  updateTicketMetadataAction: noopMutationAction,
  userEmail: "agent@example.com",
};

describe("TicketWorkspace authoritative list refresh", () => {
  it("removes tickets omitted by the active saved-view query", async () => {
    const user = userEvent.setup();
    const closedRow = {
      ...highRow,
      state: "Closed",
      stateKey: "closed" as const,
      title: "Closed ticket retained locally",
    };
    const loadTicketListPageAction = vi.fn(async () => ({
      status: "available" as const,
      rows: [row],
      loadedCount: 1,
      totalCount: 1,
    }));

    render(
      <TicketWorkspace
        {...workspaceProps}
        listResult={{ ...availableList, loadedCount: 2, totalCount: 2 }}
        loadTicketListPageAction={loadTicketListPageAction}
        rows={[row, closedRow]}
        tabs={[{ ...row }, { ...closedRow }]}
      />,
    );

    expect(screen.getByText("Closed ticket retained locally")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh list" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith({});
    expect(
      screen.queryByText("Closed ticket retained locally"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Cannot log in")).toBeInTheDocument();
  });

  it("re-fetches the complete loaded page window before replacing rows", async () => {
    const user = userEvent.setup();
    const refreshedFirst = { ...row, title: "Refreshed first page" };
    const refreshedSecond = { ...highRow, title: "Refreshed second page" };
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow],
        loadedCount: 1,
        nextCursor: "3",
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [refreshedFirst],
        loadedCount: 1,
        nextCursor: "2",
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [refreshedSecond],
        loadedCount: 1,
        totalCount: 2,
      });

    render(
      <TicketWorkspace
        {...workspaceProps}
        listResult={{ ...availableList, loadedCount: 1, nextCursor: "2" }}
        loadTicketListPageAction={loadTicketListPageAction}
        rows={[row]}
        tabs={[{ ...row }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show more tickets (1)" }));
    await user.click(screen.getByRole("button", { name: "Refresh list" }));

    expect(loadTicketListPageAction.mock.calls).toEqual([
      [{ cursor: "2" }],
      [{}],
      [{ cursor: "2" }],
    ]);
    expect(screen.getByText("Refreshed first page")).toBeInTheDocument();
    expect(screen.getByText("Refreshed second page")).toBeInTheDocument();
    expect(screen.queryByText("Cannot log in")).not.toBeInTheDocument();
    expect(screen.queryByText("Webhook failed")).not.toBeInTheDocument();
  });
});
