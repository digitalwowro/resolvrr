import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import {
  availableList,
  highRow,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

describe("TicketWorkspace paging and sort", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("loads the next ungrouped list page without loading ticket detail", async () => {
    const user = userEvent.setup();
    const loadTicketListPageAction = vi.fn(async () => ({
      status: "available" as const,
      rows: [highRow],
      loadedCount: 1,
    }));
    const loadTicketDetailAction = vi.fn();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{ ...availableList, loadedCount: 1, nextCursor: "2" }}
        loadTicketDetailAction={loadTicketDetailAction}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.queryByText("Webhook failed")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
    expect(loadTicketListPageAction).toHaveBeenCalledWith({ cursor: "2" });
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
  });

  it("refreshes the first ungrouped list page from the provider", async () => {
    const user = userEvent.setup();
    const newRow = {
      ...highRow,
      id: "ticket-3",
      number: "#1003",
      title: "New Zammad ticket",
    };
    const loadTicketListPageAction = vi.fn(async () => ({
      status: "available" as const,
      rows: [newRow, row],
      loadedCount: 2,
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{ ...availableList, loadedCount: 1 }}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.queryByText("New Zammad ticket")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Refresh list" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith({});
    expect(await screen.findByText("New Zammad ticket")).toBeInTheDocument();
  });

  it("reloads the first page through provider sort and keeps the sort for next pages", async () => {
    const user = userEvent.setup();
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow],
        loadedCount: 1,
        nextCursor: "2",
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [row],
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
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
    expect(screen.queryByText("Cannot log in")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(loadTicketListPageAction).toHaveBeenLastCalledWith({
      cursor: "2",
      sort: { key: "priority", direction: "ascending" },
    });
    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
  });

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

    await user.click(screen.getByRole("button", { name: "Load more" }));

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

    await user.click(screen.getByRole("button", { name: "Load more" }));
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
