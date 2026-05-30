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

describe("TicketWorkspace saved views", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("loads and selects a persisted saved view from the workspace selector", async () => {
    const user = userEvent.setup();
    const loadTicketListPageAction = vi.fn(async () => ({
      status: "available" as const,
      rows: [highRow],
      loadedCount: 1,
      appliedSavedViewId: "view-1",
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[
          { id: "all-tickets", label: "All tickets" },
          { id: "view-1", label: "Open priority" },
        ]}
        selectedSavedViewId="all-tickets"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));
    await user.click(screen.getByRole("option", { name: "Open priority" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith({
      savedViewId: "view-1",
    });
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Saved view" })).toHaveTextContent(
      "Open priority",
    );
  });

  it("shows unsupported saved views as disabled options", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[
          { id: "all-tickets", label: "All tickets" },
          {
            id: "view-2",
            label: "Full text",
            disabledLabel: "search unsupported",
            disabledReason: "full-text-search-unsupported",
          },
        ]}
        selectedSavedViewId="all-tickets"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));

    const listbox = screen.getByRole("listbox");
    expect(
      within(listbox).getByRole("option", {
        name: "Full text (search unsupported)",
      }),
    ).toBeDisabled();
  });
});
