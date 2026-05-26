import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type WorkspaceTicketListPageLoadResult,
} from "@/features/tickets";
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

describe("TicketWorkspace pagination", () => {
  it("loads the next ungrouped page without loading ticket detail", async () => {
    const user = userEvent.setup();
    const loadTicketListPageAction = vi.fn(
      async (): Promise<WorkspaceTicketListPageLoadResult> => ({
        status: "available",
        page: {
          rows: [highRow],
          tabs: [{ ...highRow }],
          loadedCount: 1,
        },
      }),
    );
    const loadTicketDetailAction = vi.fn();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{ ...availableList, loadedCount: 1, nextCursor: "2" }}
        loadTicketListPageAction={loadTicketListPageAction}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText("1 loaded")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith("2");
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
    expect(screen.getByText("2 loaded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("keeps the load more control ungrouped only", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{ ...availableList, loadedCount: 1, nextCursor: "2" }}
        loadTicketListPageAction={vi.fn()}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Priority" }));

    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });
});
