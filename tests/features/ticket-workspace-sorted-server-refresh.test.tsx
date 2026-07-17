import { render, screen, waitFor } from "@testing-library/react";
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

describe("TicketWorkspace sorted server refresh", () => {
  it("keeps provider sorting when refreshed rows remove a closed ticket", async () => {
    const user = userEvent.setup();
    const appliedSort = {
      key: "priority" as const,
      direction: "ascending" as const,
    };
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow, row],
        loadedCount: 2,
        appliedSort,
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [row],
        loadedCount: 1,
        totalCount: 1,
        appliedSort,
      });
    const sortableList = {
      ...availableList,
      loadedCount: 2,
      totalCount: 2,
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
      listResult: sortableList,
      loadTicketListPageAction,
      logoutAction: noopAction,
      setActiveConnectionAction: noopAction,
      tabs: [{ ...row }, { ...highRow }],
      updateTicketMetadataAction: noopMutationAction,
      userEmail: "agent@example.com",
    };

    const { rerender } = render(
      <TicketWorkspace {...props} rows={[row, highRow]} />,
    );
    await user.click(screen.getByRole("button", { name: "Priority" }));
    await screen.findByText("Webhook failed");

    rerender(
      <TicketWorkspace
        {...props}
        listResult={{ ...sortableList, loadedCount: 1, totalCount: 1 }}
        rows={[row]}
        tabs={[{ ...row }]}
      />,
    );

    await waitFor(() => expect(loadTicketListPageAction).toHaveBeenCalledTimes(2));
    expect(loadTicketListPageAction).toHaveBeenLastCalledWith({ sort: appliedSort });
    expect(screen.queryByText("Webhook failed")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Priority/u }))
      .toHaveAttribute("aria-sort", "ascending");
  });
});
