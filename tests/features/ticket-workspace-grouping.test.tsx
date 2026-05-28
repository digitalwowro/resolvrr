import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
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

const groupedList = {
  ...availableList,
  queryCapabilities: {
    totalCount: true,
    providerSort: true,
    providerGrouping: true,
    groupedTotalCount: true,
    fullTextSearch: false,
    maxPageSize: 50,
    unsupportedCombinations: [],
  },
};

describe("TicketWorkspace provider grouping", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("groups loaded tickets locally by provider-neutral values", async () => {
    const user = userEvent.setup();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Priority" }));

    expect(screen.getByRole("cell", { name: /^High 1$/u })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^Medium 1$/u })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Owner" }));

    expect(screen.getByRole("cell", { name: /^Agent Smith 1$/u })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^Unassigned 1$/u })).toBeInTheDocument();
  });

  it("loads provider-backed priority groups and paginates a bucket independently", async () => {
    const user = userEvent.setup();
    const nextHighRow = {
      ...highRow,
      id: "ticket-3",
      number: "#1003",
      title: "Webhook retry still failing",
    };
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow],
        loadedCount: 1,
        totalCount: 2,
        groups: [
          {
            id: "priority-high",
            key: "priority" as const,
            value: "high",
            label: "High",
            rows: [highRow],
            loadedCount: 1,
            totalCount: 2,
            nextCursor: "2",
          },
        ],
      })
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [nextHighRow],
        loadedCount: 1,
        totalCount: 2,
      });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={groupedList}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Priority" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith({ group: "priority" });
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /High 1\/2/u })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(loadTicketListPageAction).toHaveBeenLastCalledWith({
      bucketValue: "high",
      cursor: "2",
      group: "priority",
    });
    expect(await screen.findByText("Webhook retry still failing")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /High 2\/2/u })).toBeInTheDocument();
  });

  it("shows a bucket pagination error only on the failed group", async () => {
    const user = userEvent.setup();
    const lowRow = {
      ...row,
      id: "ticket-4",
      number: "#1004",
      title: "Invoice webhook delayed",
      priority: "Low",
      priorityKey: "low" as const,
    };
    const loadTicketListPageAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: "available" as const,
        rows: [highRow, lowRow],
        loadedCount: 2,
        totalCount: 4,
        groups: [
          {
            id: "priority-high",
            key: "priority" as const,
            value: "high",
            label: "High",
            rows: [highRow],
            loadedCount: 1,
            totalCount: 2,
            nextCursor: "2",
          },
          {
            id: "priority-low",
            key: "priority" as const,
            value: "low",
            label: "Low",
            rows: [lowRow],
            loadedCount: 1,
            totalCount: 2,
            nextCursor: "2",
          },
        ],
      })
      .mockResolvedValueOnce({
        status: "unavailable" as const,
        reason: "provider-temporary-failure" as const,
        retryable: true,
      });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={groupedList}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Priority" }));

    const highGroup = await screen.findByRole("cell", { name: /High 1\/2/u });
    const lowGroup = screen.getByRole("cell", { name: /Low 1\/2/u });

    await user.click(
      within(highGroup).getByRole("button", { name: "Load more" }),
    );

    expect(loadTicketListPageAction).toHaveBeenLastCalledWith({
      bucketValue: "high",
      cursor: "2",
      group: "priority",
    });
    expect(await within(highGroup).findByRole("alert")).toHaveTextContent(
      "Could not load more tickets.",
    );
    expect(within(lowGroup).queryByRole("alert")).toBeNull();
  });
});
