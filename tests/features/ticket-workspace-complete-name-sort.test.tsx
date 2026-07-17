import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function ticket(id: number, owner: string) {
  return {
    ...row,
    id: `ticket-${id}`,
    number: `#${1000 + id}`,
    title: `Ticket ${id}`,
    owner,
    ownerExternalId: `owner-${id}`,
  };
}

describe("TicketWorkspace complete display-name sorting", () => {
  it("sorts every matching ticket by owner before exposing the first page", async () => {
    const user = userEvent.setup();
    const razvan = ticket(1, "Razvan Rosca");
    const zoe = ticket(2, "Zoe Agent");
    const anne = ticket(3, "Anne-Marie Cioenariu");
    const bob = ticket(4, "Bob Agent");
    const charles = ticket(5, "Charles Agent");
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [anne, bob],
        loadedCount: 4,
        nextCursor: "3",
        totalCount: 5,
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [charles],
        loadedCount: 5,
        totalCount: 5,
      });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{
          ...availableList,
          loadedCount: 2,
          nextCursor: "2",
          totalCount: 5,
          queryCapabilities: {
            totalCount: true,
            providerSort: true,
            providerGrouping: false,
            groupedTotalCount: false,
            fullTextSearch: false,
            maxPageSize: 50,
            unsupportedCombinations: ["grouped-total-count"],
          },
        }}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[razvan, zoe]}
        setActiveConnectionAction={noopAction}
        tabs={[razvan, zoe]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Owner" }));

    await waitFor(() => expect(loadTicketListPageAction).toHaveBeenCalledTimes(2));
    expect(loadTicketListPageAction.mock.calls).toEqual([
      [{ cursor: "2" }],
      [{ cursor: "3" }],
    ]);

    const table = screen.getByRole("table", { name: "Tickets" });
    expect(within(table).getByText("Anne-Marie Cioenariu")).toBeInTheDocument();
    expect(within(table).getByText("Bob Agent")).toBeInTheDocument();
    expect(within(table).queryByText("Razvan Rosca")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Show more tickets (2/5)" }),
    );
    expect(within(table).getByText("Charles Agent")).toBeInTheDocument();
    expect(within(table).getByText("Razvan Rosca")).toBeInTheDocument();
  });

  it("rebuilds the complete sorted result after a server refresh", async () => {
    const user = userEvent.setup();
    const razvan = ticket(1, "Razvan Rosca");
    const zoe = ticket(2, "Zoe Agent");
    const anne = ticket(3, "Anne-Marie Cioenariu");
    const aaron = ticket(4, "Aaron Agent");
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [anne],
        loadedCount: 3,
        totalCount: 3,
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [aaron, razvan],
        loadedCount: 2,
        totalCount: 2,
      });
    const listResult = {
      ...availableList,
      loadedCount: 2,
      nextCursor: "2",
      totalCount: 3,
      queryCapabilities: {
        totalCount: true,
        providerSort: true,
        providerGrouping: false,
        groupedTotalCount: false,
        fullTextSearch: false,
        maxPageSize: 50,
        unsupportedCombinations: ["grouped-total-count" as const],
      },
    };
    const props = {
      columns: defaultWorkspaceTicketColumns,
      connections: [{ id: "connection-1", label: "Support", active: true }],
      listResult,
      loadTicketListPageAction,
      logoutAction: noopAction,
      setActiveConnectionAction: noopAction,
      updateTicketMetadataAction: noopMutationAction,
      userEmail: "agent@example.com",
    };

    const { rerender } = render(
      <TicketWorkspace {...props} rows={[razvan, zoe]} tabs={[razvan, zoe]} />,
    );
    await user.click(screen.getByRole("button", { name: "Owner" }));
    await screen.findByText("Anne-Marie Cioenariu");

    rerender(
      <TicketWorkspace
        {...props}
        listResult={{ ...listResult, loadedCount: 1, totalCount: 2 }}
        rows={[razvan]}
        tabs={[razvan]}
      />,
    );

    await waitFor(() => expect(loadTicketListPageAction).toHaveBeenCalledTimes(2));
    expect(loadTicketListPageAction).toHaveBeenLastCalledWith({});
    const table = screen.getByRole("table", { name: "Tickets" });
    expect(within(table).getByText("Aaron Agent")).toBeInTheDocument();
    expect(within(table).getByText("Razvan Rosca")).toBeInTheDocument();
    expect(within(table).queryByText("Anne-Marie Cioenariu"))
      .not.toBeInTheDocument();
  });

  it("keeps the prior list when a complete-result page cannot be loaded", async () => {
    const user = userEvent.setup();
    const razvan = ticket(1, "Razvan Rosca");
    const loadTicketListPageAction = vi.fn().mockResolvedValue({
      status: "unavailable" as const,
      reason: "provider-temporary-failure" as const,
      retryable: true,
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{
          ...availableList,
          loadedCount: 1,
          nextCursor: "2",
          totalCount: 2,
          queryCapabilities: {
            totalCount: true,
            providerSort: true,
            providerGrouping: false,
            groupedTotalCount: false,
            fullTextSearch: false,
            maxPageSize: 50,
            unsupportedCombinations: ["grouped-total-count"],
          },
        }}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[razvan]}
        setActiveConnectionAction={noopAction}
        tabs={[razvan]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Owner" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "complete ticket list could not be loaded",
    );
    expect(screen.getByText("Razvan Rosca")).toBeInTheDocument();
  });
});
