import { render, screen, within } from "@testing-library/react";
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
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace refreshed paging rows", () => {
  it("keeps the previous effective sort when a provider sort reload fails", async () => {
    const user = userEvent.setup();
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "unavailable" as const,
        reason: "provider-temporary-failure" as const,
        retryable: true,
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow],
        loadedCount: 2,
      });
    const sortableList = {
      ...availableList,
      loadedCount: 1,
      nextCursor: "2",
      queryCapabilities: {
        totalCount: false,
        providerSort: true,
        providerGrouping: false,
        groupedTotalCount: false,
        fullTextSearch: false,
        maxPageSize: 50,
        unsupportedCombinations: ["grouped-total-count" as const],
      },
    };

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={sortableList}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Priority" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith({
      sort: { key: "priority", direction: "ascending" },
    });
    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load more tickets.",
    );

    await user.click(
      screen.getByRole("button", { name: "Show more tickets (1)" }),
    );

    expect(loadTicketListPageAction).toHaveBeenLastCalledWith({ cursor: "2" });
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
  });

  it("does not locally sort incomplete provider lists without sort support", () => {
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{ ...availableList, loadedCount: 2, nextCursor: "3" }}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByRole("button", { name: "Priority" })).toBeDisabled();
  });

  it("reflects refreshed server row metadata while keeping loaded pages", async () => {
    const user = userEvent.setup();
    const refreshedRow = {
      ...row,
      title: "Login restored",
      state: "Closed",
      stateKey: "closed" as const,
      priority: "Low",
      priorityKey: "low" as const,
    };
    const loadTicketListPageAction = vi.fn(async () => ({
      status: "available" as const,
      rows: [highRow],
      loadedCount: 2,
      totalCount: 2,
    }));
    const workspaceProps = {
      columns: defaultWorkspaceTicketColumns,
      connections: [{ id: "connection-1", label: "Support", active: true }],
      loadTicketListPageAction,
      logoutAction: noopAction,
      setActiveConnectionAction: noopAction,
      updateTicketMetadataAction: noopMutationAction,
      userEmail: "agent@example.com",
    };

    const { rerender } = render(
      <TicketWorkspace
        {...workspaceProps}
        listResult={{ ...availableList, loadedCount: 1, nextCursor: "2" }}
        rows={[row]}
        tabs={[{ ...row }]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Show more tickets (1)" }),
    );
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();

    rerender(
      <TicketWorkspace
        {...workspaceProps}
        listResult={{
          ...availableList,
          loadedCount: 1,
          nextCursor: "2",
          totalCount: 2,
        }}
        rows={[refreshedRow]}
        tabs={[{ ...refreshedRow }]}
      />,
    );

    const table = screen.getByRole("table", { name: "Tickets" });
    expect(within(table).queryByText("Cannot log in")).toBeNull();
    expect(within(table).getByText("Login restored")).toBeInTheDocument();
    expect(within(table).getByText("Closed")).toBeInTheDocument();
    expect(within(table).getByText("Low")).toBeInTheDocument();
    expect(within(table).getAllByText("Webhook failed")).toHaveLength(1);
  });
});
